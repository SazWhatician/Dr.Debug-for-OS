# AI Process Doctor for Windows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, high-performance Windows AI Process Doctor desktop application with real-time telemetry, sliding-window anomaly heuristics, safe supervised Win32 remediation, and an interactive React cyber-glass dashboard.

**Architecture:** A decoupled system consisting of a Python FastAPI telemetry & diagnostic engine, standard library Win32 probes (`ctypes`), an in-memory 60s sliding ring buffer, and a React + Vite desktop cockpit connected via real-time WebSocket.

**Tech Stack:** Python 3.10+, `psutil`, `fastapi`, `uvicorn`, `websockets`, Windows Win32 APIs via `ctypes` (`user32.dll`, `ntdll.dll`, `kernel32.dll`), React 18, Vite.

**Spec:** [`docs/superpowers/specs/2026-10-02-ai-process-doctor-design.md`](file:///c:/Users/saswa/Desktop/AIOS/docs/superpowers/specs/2026-10-02-ai-process-doctor-design.md)

## Global Constraints
- Target platform: Windows 10 & 11 (x64).
- Ponytail Minimality: Standard library first (`ctypes`, `collections.deque`, `urllib.request`), zero boilerplate, minimal dependencies.
- Safety: Strictly protect critical Windows OS processes (`csrss.exe`, `lsass.exe`, `services.exe`, `smss.exe`, `wininit.exe`, `explorer.exe`, `svchost.exe`).
- Concurrency: Background sampling thread must never block the FastAPI async event loop.

## Review Focus
- Attempting to suspend/kill protected Windows system processes must return safe rejection (`403 Forbidden`).
- Terminating a PID that has already exited or been recycled must be caught via `create_time` validation.
- GUI hung window detection must handle invalid HWNDs without crashing.
- Memory leak detection must distinguish flat high memory from monotonic growth slope.
- WebSocket streaming must gracefully handle client disconnects without leaking worker tasks.

---

### Task 1: Telemetry Ring Buffer & Sampler
**Files:**
- Create: `backend/doctor/telemetry.py`
- Test: `tests/test_telemetry.py`

**Interfaces:**
- Produces: `TelemetrySampler.snapshot() -> Dict[str, Any]`

- [ ] **Step 1: Write failing test for TelemetrySampler**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement TelemetrySampler with `collections.deque(maxlen=60)` and `psutil`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 2: Win32 Deep Probe & GUI Hung App Detector
**Files:**
- Create: `backend/doctor/probe.py`
- Test: `tests/test_probe.py`

**Interfaces:**
- Produces: `is_process_hung(pid: int) -> bool`, `get_process_details(pid: int) -> Dict[str, Any]`

- [ ] **Step 1: Write failing test for Win32 probe & `IsHungAppWindow`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement Win32 probe using standard library `ctypes`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 3: Anomaly Heuristic Detection Engine
**Files:**
- Create: `backend/doctor/heuristics.py`
- Test: `tests/test_heuristics.py`

**Interfaces:**
- Produces: `evaluate_anomalies(history: deque, current_stats: dict) -> List[Anomaly]`

- [ ] **Step 1: Write failing test for CPU runaway, memory leaks, and handle thrashing**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement heuristic evaluation algorithms**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 4: AI Doctor Diagnostics & Safe Remediation Engine
**Files:**
- Create: `backend/doctor/diagnostics.py`
- Create: `backend/doctor/remediation.py`
- Test: `tests/test_remediation.py`

**Interfaces:**
- Produces: `diagnose_process(context: dict) -> DiagnosticReport`
- Produces: `remediate_process(pid: int, action: str, create_time: float) -> RemediationResult`

- [ ] **Step 1: Write failing test for safe remediation and whitelist protection**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement offline & LLM diagnostic synthesizer and Win32 remediation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 5: FastAPI Streaming Server & WebSocket Handler
**Files:**
- Create: `backend/server.py`
- Test: `tests/test_server.py`

**Interfaces:**
- Endpoints: `GET /api/health`, `GET /api/processes`, `POST /api/doctor/diagnose`, `POST /api/doctor/remediate`, `WS /ws/telemetry`

- [ ] **Step 1: Write test for API routes and safety guards**
- [ ] **Step 2: Implement FastAPI server and WebSocket broadcaster**
- [ ] **Step 3: Verify all test cases pass**
- [ ] **Step 4: Commit changes**

---

### Task 6: Modern Cyber-Glass Desktop Cockpit Frontend
**Files:**
- Create: `frontend/index.html`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/components/HeaderGauges.jsx`
- Create: `frontend/src/components/AlertBanner.jsx`
- Create: `frontend/src/components/ProcessTable.jsx`
- Create: `frontend/src/components/DoctorDrawer.jsx`
- Create: `frontend/src/components/RemediateModal.jsx`

- [ ] **Step 1: Build the React cockpit with live WebSocket streaming & SVG sparklines**
- [ ] **Step 2: Integrate Doctor drawer, anomaly alerts, and one-click remediation confirmation**
- [ ] **Step 3: Verify frontend build and styling**
- [ ] **Step 4: Commit changes**

---

### Task 7: Desktop Launcher & Verification
**Files:**
- Create: `run_doctor.py`
- Create: `requirements.txt`

- [ ] **Step 1: Create single-command runner with optional Edge WebView2 or App-mode launch**
- [ ] **Step 2: Run synthetic verification test simulating an anomalous process**
- [ ] **Step 3: Update study docs with real implementation notes**
- [ ] **Step 4: Final commit**
