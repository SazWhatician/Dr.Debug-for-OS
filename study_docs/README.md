# 🩺 AI Process Doctor for Windows — Study Documentation & Architecture Master Index

Welcome to the comprehensive study and engineering guide for the **AI Process Doctor for Windows**. This document and its accompanying phase guides explain the deep internals of Windows process management, Win32 APIs, performance counters, anomaly detection math, and the hybrid AI reasoning engine.

---

## 📌 Phase Overview & Status Tracker

| Phase | Description | Status | Target Deliverables |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Real-Time Telemetry & Ring Buffer** | 🟡 *In Progress* | `doctor/telemetry.py` (psutil, 60s ring buffer, metrics delta) |
| **Phase 2** | **Win32 Deep Probe & App Responsiveness** | ⚪ *Planned* | `doctor/probe.py` (`IsHungAppWindow`, handles, DLLs, CLI) |
| **Phase 3** | **Anomaly Heuristics Engine** | ⚪ *Planned* | `doctor/heuristics.py` (CPU runaway, leak slope, thrashing) |
| **Phase 4** | **AI Doctor Synthesizer & Safe Remediation** | ⚪ *Planned* | `doctor/diagnostics.py`, `doctor/remediation.py` (Guardrails) |
| **Phase 5** | **FastAPI Streaming Server & WebSockets** | ⚪ *Planned* | `backend/server.py` (`/ws/telemetry`, REST endpoints) |
| **Phase 6** | **Cyber-Glass Desktop Cockpit (React/Vite)** | ⚪ *Planned* | `frontend/` (60fps charts, alerts, AI drawer) |

---

## 🔬 Core Windows Concepts & Deep Dive

### 1. Memory Architecture: Working Set vs. Private Bytes
In Windows, Task Manager often shows "Memory", but that single number is deceptive:
* **Working Set**: The set of memory pages in the virtual address space of the process currently resident in physical RAM. This includes shared DLLs (like `kernel32.dll` or `ntdll.dll`) that are shared across hundreds of processes.
* **Private Bytes**: Memory allocated by the process that cannot be shared with other processes.
* **The Doctor's Rule**: To detect a true **memory leak**, we observe the monotonic growth of **Private Bytes** and **Working Set Private** over a 30–60 second window, combined with the rate of **Hard Page Faults**.

### 2. Detecting Hung & Frozen Applications (`IsHungAppWindow`)
Windows GUI processes run a message loop (`GetMessage` / `DispatchMessage`).
When an application deadlocks or enters an infinite loop on its main UI thread, its message queue backs up.
* Win32 API: `user32.IsHungAppWindow(HWND hwnd)`
* Mechanism: Windows sends a `WM_NULL` message to the window with a 5-second timeout via `SendMessageTimeout`. If the window doesn't respond within 5 seconds, Windows flags the window as "Not Responding" and ghosts it.
* The Doctor queries this natively using Python's standard library `ctypes` without installing external bloat.

### 3. Process Suspension: `NtSuspendProcess`
Unlike Unix which uses signals like `SIGSTOP` and `SIGCONT`, Windows does not have a user-mode `SuspendProcess` Win32 API in `kernel32.dll`.
* Instead, Windows kernel exposes `NtSuspendProcess` and `NtResumeProcess` in `ntdll.dll`.
* Calling `NtSuspendProcess(process_handle)` halts all threads in the target process instantaneously, allowing users to freeze a runaway game or heavy compiler without killing it and losing work.

### 4. Privilege Boundaries & Safety Guardrails
The Doctor operates under the **Ponytail Safety Protocol**:
* **Protected Kernel Whitelist**: `csrss.exe`, `lsass.exe`, `smss.exe`, `services.exe`, `wininit.exe`, `explorer.exe`, `svchost.exe`.
* The Doctor refuses any termination or suspension requests targeting whitelisted system processes to prevent Blue Screens of Death (BSODs).
* **PID Reuse Guard**: Windows aggressively recycles PIDs. When a user confirms remediation on PID 1234, the Doctor verifies that `create_time` has not changed before applying the action.

---

## 📚 Study Guides Index
* [Phase 1: Telemetry & Ring Buffer Engine](file:///c:/Users/saswa/Desktop/AIOS/study_docs/phase-1.md)
* [Phase 2: Win32 Deep Probe & App Responsiveness](file:///c:/Users/saswa/Desktop/AIOS/study_docs/phase-2.md)
* [Phase 3: Anomaly Heuristics Engine](file:///c:/Users/saswa/Desktop/AIOS/study_docs/phase-3.md)
* [Phase 4: AI Doctor Diagnostics & Remediation Guardrails](file:///c:/Users/saswa/Desktop/AIOS/study_docs/phase-4.md)
* [Phase 5: Streaming Server & React Cockpit](file:///c:/Users/saswa/Desktop/AIOS/study_docs/phase-5.md)
