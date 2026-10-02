import pytest
from collections import deque
from backend.doctor.heuristics import evaluate_process_anomalies

def test_detect_hung_window():
    proc = {"pid": 100, "name": "bad_app.exe", "is_hung": True, "cpu_percent": 0.0, "handles": 20, "threads": 2}
    history = deque(maxlen=60)
    anomalies = evaluate_process_anomalies(proc, history)
    
    assert len(anomalies) == 1
    assert anomalies[0]["type"] == "HUNG_WINDOW"
    assert anomalies[0]["severity"] == "CRITICAL"

def test_detect_cpu_runaway():
    proc = {"pid": 101, "name": "miner.exe", "is_hung": False, "cpu_percent": 95.0, "handles": 20, "threads": 4}
    history = deque(maxlen=60)
    for i in range(5):
        history.append({"cpu_percent": 90.0 + i, "timestamp": 100.0 + i, "rss_bytes": 1000})
    
    anomalies = evaluate_process_anomalies(proc, history)
    assert any(a["type"] == "CPU_RUNAWAY" and a["severity"] == "CRITICAL" for a in anomalies)

def test_detect_memory_leak():
    proc = {"pid": 102, "name": "leaker.exe", "is_hung": False, "cpu_percent": 5.0, "handles": 30, "threads": 2}
    history = deque(maxlen=60)
    # Simulate 10 MB/sec growth over 10 seconds (100MB to 200MB)
    base_ram = 100 * 1024 * 1024
    for i in range(10):
        history.append({
            "timestamp": 1000.0 + i,
            "cpu_percent": 5.0,
            "rss_bytes": base_ram + i * 10 * 1024 * 1024,
        })
    
    anomalies = evaluate_process_anomalies(proc, history)
    assert any(a["type"] == "MEMORY_LEAK" for a in anomalies)

def test_detect_handle_thrashing():
    proc = {"pid": 103, "name": "thrash.exe", "is_hung": False, "cpu_percent": 2.0, "handles": 15000, "threads": 5}
    history = deque(maxlen=60)
    anomalies = evaluate_process_anomalies(proc, history)
    assert any(a["type"] == "HANDLE_THRASHING" and a["severity"] == "CRITICAL" for a in anomalies)

def test_normal_process_no_anomalies():
    proc = {"pid": 104, "name": "notepad.exe", "is_hung": False, "cpu_percent": 0.5, "handles": 120, "threads": 3}
    history = deque(maxlen=60)
    for i in range(5):
        history.append({"cpu_percent": 0.5, "timestamp": 100.0 + i, "rss_bytes": 50 * 1024 * 1024})
    anomalies = evaluate_process_anomalies(proc, history)
    assert len(anomalies) == 0
