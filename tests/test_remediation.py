import os
import pytest
from backend.doctor.remediation import remediate_process, is_protected_process
from backend.doctor.diagnostics import diagnose_process

def test_whitelist_protection_blocks_critical_processes():
    # Attempting to kill or suspend csrss.exe, lsass.exe, or explorer.exe must be rejected
    for proc_name in ["csrss.exe", "lsass.exe", "services.exe", "explorer.exe"]:
        assert is_protected_process(proc_name) is True

    result = remediate_process(pid=4, process_name="System", action="FORCE_KILL")
    assert result["success"] is False
    assert "Protected" in result["error"]

def test_pid_reuse_guard_catches_stale_requests():
    current_pid = os.getpid()
    # Provide a false create_time (1000 seconds in past)
    result = remediate_process(
        pid=current_pid,
        process_name="python.exe",
        action="SET_PRIORITY",
        priority="IDLE",
        expected_create_time=100.0,
    )
    assert result["success"] is False
    assert "recycled" in result["error"]

def test_offline_diagnostics_synthesis():
    context = {
        "pid": 5555,
        "name": "rogue_miner.exe",
        "cpu_percent": 98.5,
        "ram_mb": 1400.0,
        "threads": 32,
        "handles": 250,
        "is_hung": False,
        "anomalies": [{"type": "CPU_RUNAWAY", "severity": "CRITICAL", "message": "High CPU load"}],
    }
    diagnosis = diagnose_process(context, provider="offline")
    assert diagnosis["provider"] == "offline_heuristics"
    assert "root_cause" in diagnosis
    assert diagnosis["recommended_action"] in ["SUSPEND", "FORCE_KILL", "SET_PRIORITY"]
    assert diagnosis["severity"] == "CRITICAL"
