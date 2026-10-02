import pytest
from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_api_processes_snapshot():
    res = client.get("/api/processes")
    assert res.status_code == 200
    data = res.json()
    assert "system" in data
    assert "top_processes" in data

def test_api_remediate_requires_user_confirmation():
    # Attempting remediation without user_confirmed=True must be rejected with 400
    payload = {
        "pid": 1234,
        "action": "FORCE_KILL",
        "user_confirmed": False,
    }
    res = client.post("/api/doctor/remediate", json=payload)
    assert res.status_code == 400
    assert "confirmation required" in res.json()["detail"].lower()

def test_api_remediate_blocks_system_process():
    payload = {
        "pid": 4,
        "process_name": "csrss.exe",
        "action": "FORCE_KILL",
        "user_confirmed": True,
    }
    res = client.post("/api/doctor/remediate", json=payload)
    assert res.status_code == 403
    assert "protected" in res.json()["detail"].lower()

def test_api_diagnose_endpoint():
    payload = {
        "pid": 9999,
        "name": "test_app.exe",
        "cpu_percent": 90.0,
        "ram_mb": 500.0,
        "is_hung": False,
        "provider": "offline",
    }
    res = client.post("/api/doctor/diagnose", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "root_cause" in data
    assert "recommended_action" in data
