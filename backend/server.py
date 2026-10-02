import asyncio
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Set
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.doctor.telemetry import TelemetrySampler
from backend.doctor.probe import get_process_details, is_process_hung
from backend.doctor.heuristics import evaluate_process_anomalies
from backend.doctor.diagnostics import diagnose_process
from backend.doctor.remediation import remediate_process, is_protected_process

# Shared global state
sampler = TelemetrySampler(buffer_len=60)
connected_websockets: Set[WebSocket] = set()
background_task: Optional[asyncio.Task] = None
latest_telemetry: Dict[str, Any] = {}

# Configurable app settings
app_config = {
    "provider": "offline",
    "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
    "ollama_url": os.getenv("OLLAMA_URL", "http://localhost:11434"),
}


async def telemetry_broadcaster_loop():
    """Background asynchronous loop capturing metrics and broadcasting to WebSockets at 1Hz."""
    global latest_telemetry
    while True:
        try:
            snapshot = await asyncio.to_thread(sampler.collect_snapshot)
            # Evaluate anomalies on top 20 active processes
            all_anomalies = []
            for p in snapshot.get("top_processes", [])[:25]:
                pid = p["pid"]
                buf = sampler.buffers.get(pid)
                history = buf.history if buf else []
                # Quick hung app check for high consumers or warnings
                p["is_hung"] = is_process_hung(pid) if p.get("cpu_percent", 0) > 20 or p.get("threads", 0) > 10 else False
                p_anomalies = evaluate_process_anomalies(p, history)
                if p_anomalies:
                    p["anomalies"] = [a["type"] for a in p_anomalies]
                    all_anomalies.extend(p_anomalies)
                else:
                    p["anomalies"] = []

            snapshot["anomaly_alerts"] = all_anomalies[:15]
            latest_telemetry = snapshot

            # Broadcast to connected clients
            if connected_websockets:
                dead_ws = set()
                for ws in list(connected_websockets):
                    try:
                        await ws.send_json(snapshot)
                    except Exception:
                        dead_ws.add(ws)
                connected_websockets.difference_update(dead_ws)
        except Exception:
            pass
        await asyncio.sleep(1.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global background_task
    background_task = asyncio.create_task(telemetry_broadcaster_loop())
    yield
    if background_task:
        background_task.cancel()


app = FastAPI(title="Windows AI Process Doctor", lifespan=lifespan)

# Allow CORS for development Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RemediateRequest(BaseModel):
    pid: int
    action: str
    process_name: Optional[str] = None
    priority: Optional[str] = "NORMAL"
    expected_create_time: Optional[float] = None
    user_confirmed: bool = False


class DiagnoseRequest(BaseModel):
    pid: int
    name: Optional[str] = "unknown"
    cpu_percent: Optional[float] = 0.0
    ram_mb: Optional[float] = 0.0
    threads: Optional[int] = 0
    handles: Optional[int] = 0
    is_hung: Optional[bool] = False
    anomalies: Optional[List[Dict[str, Any]]] = []
    provider: Optional[str] = None
    api_key: Optional[str] = None


@app.get("/api/health")
def get_health():
    return {"status": "ok", "app": "AI Process Doctor", "platform": "Windows"}


@app.get("/api/processes")
def get_processes():
    if latest_telemetry:
        return latest_telemetry
    return sampler.collect_snapshot()


@app.get("/api/processes/{pid}/inspect")
def inspect_process(pid: int):
    details = get_process_details(pid)
    if "error" in details and details["error"] == "Process not found":
        raise HTTPException(status_code=404, detail=f"Process PID {pid} not found.")
    return details


@app.post("/api/doctor/diagnose")
def diagnose_endpoint(req: DiagnoseRequest):
    provider = req.provider or app_config["provider"]
    api_key = req.api_key or app_config["gemini_api_key"]
    context = req.model_dump()
    return diagnose_process(context, api_key=api_key, provider=provider, ollama_url=app_config["ollama_url"])


@app.post("/api/doctor/remediate")
def remediate_endpoint(req: RemediateRequest):
    if not req.user_confirmed:
        raise HTTPException(status_code=400, detail="Explicit user confirmation required for remediation.")

    if req.process_name and is_protected_process(req.process_name):
        raise HTTPException(status_code=403, detail=f"Action blocked: '{req.process_name}' is a Protected Windows system process.")

    result = remediate_process(
        pid=req.pid,
        action=req.action,
        process_name=req.process_name,
        priority=req.priority,
        expected_create_time=req.expected_create_time,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Remediation failed."))
    return result


@app.get("/api/config")
def get_config():
    return {
        "provider": app_config["provider"],
        "has_gemini_key": bool(app_config["gemini_api_key"]),
        "ollama_url": app_config["ollama_url"],
    }


@app.post("/api/config")
def update_config(data: Dict[str, Any]):
    if "provider" in data:
        app_config["provider"] = data["provider"]
    if "gemini_api_key" in data:
        app_config["gemini_api_key"] = data["gemini_api_key"]
    if "ollama_url" in data:
        app_config["ollama_url"] = data["ollama_url"]
    return {"success": True, "config": get_config()}


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.add(websocket)
    try:
        # Send immediate initial state
        if latest_telemetry:
            await websocket.send_json(latest_telemetry)
        while True:
            # Keep alive and receive any client ping
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connected_websockets.discard(websocket)


# Mount static production build if exists
dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
