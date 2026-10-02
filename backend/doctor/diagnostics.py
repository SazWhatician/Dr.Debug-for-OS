import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional

def _offline_synthesizer(context: Dict[str, Any]) -> Dict[str, Any]:
    """Instant offline rule-based diagnostic assessment without external network dependencies."""
    pid = context.get("pid", 0)
    name = context.get("name", "unknown")
    cpu = context.get("cpu_percent", 0.0)
    ram_mb = context.get("ram_mb", 0.0)
    is_hung = context.get("is_hung", False)
    anomalies = context.get("anomalies", [])

    anomaly_types = [a.get("type") for a in anomalies]

    if is_hung or "HUNG_WINDOW" in anomaly_types:
        return {
            "provider": "offline_heuristics",
            "severity": "CRITICAL",
            "confidence": 0.95,
            "root_cause": f"Application '{name}' (PID {pid}) main thread message loop has stopped pumping Windows messages (>5s). Likely UI deadlock or long synchronous I/O.",
            "recommended_action": "GRACEFUL_CLOSE",
            "alternative_action": "FORCE_KILL",
            "rationale": "Attempting a WM_CLOSE lets the application attempt recovery. If it remains frozen, force termination will free held resources.",
        }

    if "CPU_RUNAWAY" in anomaly_types or cpu > 80.0:
        return {
            "provider": "offline_heuristics",
            "severity": "CRITICAL",
            "confidence": 0.90,
            "root_cause": f"Process '{name}' is burning {cpu}% CPU continuously. This indicates an infinite spin loop, intensive background task, or unconstrained worker thread.",
            "recommended_action": "SUSPEND",
            "alternative_action": "SET_PRIORITY",
            "rationale": "Suspending the process temporarily halts all thread execution without losing unsaved data. Alternatively, lowering priority to IDLE prevents it from choking other applications.",
        }

    if "MEMORY_LEAK" in anomaly_types:
        return {
            "provider": "offline_heuristics",
            "severity": "WARNING" if ram_mb < 2000 else "CRITICAL",
            "confidence": 0.85,
            "root_cause": f"Process '{name}' is consuming {ram_mb} MB with a steep upward memory slope. Memory pages are not being deallocated by the garbage collector or process runtime.",
            "recommended_action": "GRACEFUL_CLOSE",
            "alternative_action": "FORCE_KILL",
            "rationale": "Restarting the process frees the accumulated memory pages and resets the process heap.",
        }

    if "HANDLE_THRASHING" in anomaly_types:
        return {
            "provider": "offline_heuristics",
            "severity": "CRITICAL",
            "confidence": 0.88,
            "root_cause": f"Process '{name}' has exceeded safe Windows handle limits. Leaked handles degrade Windows kernel object tables and can destabilize other applications.",
            "recommended_action": "GRACEFUL_CLOSE",
            "alternative_action": "FORCE_KILL",
            "rationale": "Closing the process reclaims all orphaned file, socket, and thread handles back to the OS.",
        }

    return {
        "provider": "offline_heuristics",
        "severity": "INFO",
        "confidence": 0.95,
        "root_cause": f"Process '{name}' (PID {pid}) is operating within standard operating system performance thresholds.",
        "recommended_action": "NONE",
        "alternative_action": "NONE",
        "rationale": "No intervention required.",
    }


def diagnose_process(
    context: Dict[str, Any],
    api_key: Optional[str] = None,
    provider: str = "offline",
    ollama_url: str = "http://localhost:11434",
) -> Dict[str, Any]:
    """Diagnoses a process using built-in offline rules or external LLMs (Gemini / Ollama)."""
    if provider == "offline" or (provider == "gemini" and not api_key):
        return _offline_synthesizer(context)

    # Prepare prompt for LLM
    prompt = (
        f"You are the Windows AI Process Doctor. Analyze this process telemetric state:\n"
        f"PID: {context.get('pid')}\n"
        f"Process: {context.get('name')}\n"
        f"Path: {context.get('exe', 'N/A')}\n"
        f"Command Line: {context.get('cmdline', 'N/A')}\n"
        f"CPU: {context.get('cpu_percent')}%\n"
        f"RAM: {context.get('ram_mb')} MB (Slope: {context.get('memory_slope_kb_s', 0)} KB/s)\n"
        f"Threads: {context.get('threads')} | Handles: {context.get('handles')}\n"
        f"GUI Hung: {context.get('is_hung')}\n"
        f"Active Anomalies: {[a.get('message') for a in context.get('anomalies', [])]}\n\n"
        f"Respond ONLY in valid JSON with keys:\n"
        f'{{"root_cause": "concise explanation", "severity": "INFO|WARNING|CRITICAL", '
        f'"recommended_action": "SUSPEND|RESUME|GRACEFUL_CLOSE|FORCE_KILL|SET_PRIORITY|NONE", '
        f'"alternative_action": "action", "rationale": "why this action", "confidence": 0.0-1.0}}'
    )

    try:
        if provider == "gemini" and api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json"},
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text_out = data["candidates"][0]["content"]["parts"][0]["text"]
                res = json.loads(text_out)
                res["provider"] = "gemini"
                return res

        elif provider == "ollama":
            url = f"{ollama_url}/api/generate"
            payload = {"model": "llama3", "prompt": prompt, "format": "json", "stream": False}
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                res = json.loads(data.get("response", "{}"))
                res["provider"] = "ollama"
                return res

    except Exception:
        # Graceful fallback to offline rules if LLM request fails or times out
        fallback = _offline_synthesizer(context)
        fallback["provider"] = "offline_fallback"
        return fallback

    return _offline_synthesizer(context)
