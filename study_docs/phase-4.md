# 📘 Phase 4: AI Doctor Diagnostics & Safe Remediation

**Status:** 🟢 *Completed*  
**Last Updated:** 2026-10-02  
**Target Modules:** `backend/doctor/diagnostics.py`, `backend/doctor/remediation.py`

---

## 🎯 Objectives & Learning Goals
1. Structure contextual diagnostic prompts for LLMs (Gemini / Ollama) without leaking private machine data.
2. Build an offline rule-based expert synthesizer for 100% offline, zero-key environments.
3. Master Win32 safe process termination and suspension protocols (`WM_CLOSE`, `NtSuspendProcess`, `NtResumeProcess`, `SetPriorityClass`).
4. Implement fail-safe whitelist guardrails preventing OS lockups or BSODs.

---

## ⚙️ Technical Mechanics

### 1. Process Suspension via `NtSuspendProcess`
In Windows, suspending a runaway process without killing it gives the user time to inspect it, save dependent work, or wait for resources to free up:
```python
import ctypes

ntdll = ctypes.windll.ntdll
# NTSTATUS NtSuspendProcess(HANDLE ProcessHandle);
# NTSTATUS NtResumeProcess(HANDLE ProcessHandle);
```
Before calling `NtSuspendProcess`, the Doctor requests `PROCESS_SUSPEND_RESUME` access via `OpenProcess`.

### 2. The Critical Process Whitelist
Certain processes must NEVER be killed, suspended, or demoted:
* `csrss.exe` (Client/Server Runtime Subsystem — killing this causes instant BSOD `CRITICAL_PROCESS_DIED`).
* `lsass.exe` (Local Security Authority Subsystem Service — killing this forces an immediate Windows reboot).
* `smss.exe` (Session Manager Subsystem).
* `services.exe` (Service Control Manager).
* `wininit.exe` (Windows Initialization).
* `explorer.exe` (Windows Shell — can be restarted, but never suspended).

The Doctor checks both binary image name and executable path verification (`System32`) to prevent malicious binaries posing as system names.

---

## 📝 Phase Completion & Change Notes
- **2026-10-02**: Designed safe remediation pipeline, whitelist guardrails, and offline vs LLM diagnostic synthesis.
- **2026-10-02**: Implemented `remediate_process` in `backend/doctor/remediation.py` (with PID reuse guard and protected OS whitelist) and `diagnose_process` in `backend/doctor/diagnostics.py` (with offline heuristics and Gemini/Ollama HTTP integration). Verified unit tests in `tests/test_remediation.py`. Status updated to 🟢 Completed.
