import os
import pytest
from backend.doctor.probe import is_process_hung, get_process_details

def test_current_process_not_hung():
    # The current running Python test process is active and not hung
    current_pid = os.getpid()
    assert is_process_hung(current_pid) is False

def test_current_process_details():
    current_pid = os.getpid()
    details = get_process_details(current_pid)
    
    assert details["pid"] == current_pid
    assert "exe" in details
    assert "cmdline" in details
    assert "is_hung" in details
    assert details["is_hung"] is False
    assert isinstance(details.get("threads"), int)

def test_nonexistent_process_probe():
    details = get_process_details(9999999)
    assert details["error"] == "Process not found"
