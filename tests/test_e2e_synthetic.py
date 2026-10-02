import sys
import subprocess
import time
import pytest
from backend.doctor.telemetry import TelemetrySampler
from backend.doctor.heuristics import evaluate_process_anomalies
from backend.doctor.diagnostics import diagnose_process
from backend.doctor.remediation import remediate_process

def test_e2e_lifecycle_synthetic_worker():
    # 1. Spawn a benign dummy Python worker
    worker = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(15)"])
    pid = worker.pid
    try:
        time.sleep(0.5)
        sampler = TelemetrySampler(buffer_len=10)
        snapshot = sampler.collect_snapshot()

        # 2. Check if detected in sampler buffers
        assert pid in sampler.buffers, f"Worker PID {pid} was not captured in telemetry buffers."
        buf = sampler.buffers[pid]
        latest_sample = buf.history[-1]
        assert latest_sample["rss_bytes"] > 0

        # 3. Simulate high CPU anomaly on worker
        for i in range(5):
            buf.record(time.time() + i, 92.0, latest_sample["rss_bytes"], 1, 10)
        
        proc_dict = {
            "pid": pid,
            "name": "python.exe",
            "cpu_percent": 92.0,
            "ram_mb": round(latest_sample["rss_bytes"] / (1024 * 1024), 1),
            "is_hung": False,
        }
        anomalies = evaluate_process_anomalies(proc_dict, buf.history)
        assert any(a["type"] == "CPU_RUNAWAY" for a in anomalies)

        # 4. Diagnose with Doctor
        context = {
            "pid": pid,
            "name": proc_dict["name"],
            "cpu_percent": proc_dict["cpu_percent"],
            "ram_mb": proc_dict["ram_mb"],
            "anomalies": anomalies,
            "is_hung": False,
        }
        report = diagnose_process(context, provider="offline")
        assert report["severity"] == "CRITICAL"
        assert report["recommended_action"] in ["SUSPEND", "SET_PRIORITY", "FORCE_KILL"]

        # 5. Execute Supervised Priority Change
        res_priority = remediate_process(pid=pid, action="SET_PRIORITY", priority="IDLE")
        assert res_priority["success"] is True

        # 6. Execute Supervised Graceful Close / Kill
        res_term = remediate_process(pid=pid, action="FORCE_KILL")
        assert res_term["success"] is True
        worker.wait(timeout=3)
        assert worker.poll() is not None
    finally:
        if worker.poll() is None:
            worker.kill()
