# Dr.Debug-for-OS

High-Performance Real-Time Windows Process Diagnostic Cockpit and Remediation Sentinel.

Dr.Debug-for-OS is an advanced, lightweight systems tool designed for Windows 10 and 11. It continuously monitors operating system processes, detects performance anomalies (CPU runaway, monotonic memory leaks, thread deadlocks, handle table exhaustion), and integrates an intelligent diagnostic doctor that explains root causes and orchestrates supervised, one-click remediation.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Capabilities](#key-capabilities)
  - [Low-Level Win32 & NT Kernel Instrumentation](#1-low-level-win32--nt-kernel-instrumentation)
  - [Sliding-Window Time-Series Calculus](#2-sliding-window-time-series-calculus)
  - [Supervised Safe Remediation](#3-supervised-safe-remediation)
  - [Hybrid Diagnostic Engine](#4-hybrid-diagnostic-engine)
  - [OLED Cyber-Glass Desktop Cockpit](#5-oled-cyber-glass-desktop-cockpit)
- [Technology Stack](#technology-stack)
- [Project Layout](#project-layout)
- [Installation & Quickstart](#installation--quickstart)
- [Automated Test Suite](#automated-test-suite)
- [REST & WebSocket API Reference](#rest--websocket-api-reference)
- [Safety & Security Invariants](#safety--security-invariants)

---

## System Architecture

Dr.Debug-for-OS utilizes a decoupled, high-performance architecture:

```
+------------------------------------------------------------------+
|                   React Desktop Cockpit (UI)                     |
|  - Real-time telemetry dashboard with SVG sparklines             |
|  - Active anomaly alert feed and sortable process table          |
|  - AI Doctor Diagnosis & Remediation Confirmation Drawer         |
+----------------------------------+-------------------------------+
                                   | WebSocket (/ws/telemetry)
                                   | REST API (/api/doctor/*)
+----------------------------------v-------------------------------+
|                      FastAPI Local Backend                       |
|  +------------------------+      +----------------------------+  |
|  |    Telemetry Engine    |      |     Diagnostic Engine      |  |
|  | - psutil & pywin32     |      | - Offline Heuristic Expert |  |
|  | - 60s Sliding Buffer   |      | - Gemini / Ollama LLM      |  |
|  +-----------+------------+      +-------------+--------------+  |
|              |                                 |                 |
|  +-----------v------------+      +-------------v--------------+  |
|  |  Windows Native Probe  |      |   Safe Remediation Layer   |  |
|  | - ctypes Win32 calls   |      | - Kernel OS Whitelist      |  |
|  | - IsHungAppWindow      |      | - Suspend / Kill / Demote  |  |
|  +------------------------+      +----------------------------+  |
+------------------------------------------------------------------+
                                   ^
                                   | Native Desktop App Launch
+----------------------------------+-------------------------------+
|         Desktop Launcher (run_doctor.py - Auto-Port Fallback)     |
+------------------------------------------------------------------+
```

---

## Key Capabilities

### 1. Low-Level Win32 & NT Kernel Instrumentation
Unlike standard task managers that only read top-level process attributes, Dr.Debug-for-OS interfaces directly with native Windows DLLs via standard library `ctypes`:
- **Window Message Loop Deadlock Detection (`user32.IsHungAppWindow`)**: Enumerates top-level window handles (`HWND`) via an unmanaged C callback (`EnumWindows`) and queries whether the window message pump has stopped responding to `WM_NULL` within a 5-second timeout window.
- **Direct Thread Suspension (`ntdll.NtSuspendProcess` / `NtResumeProcess`)**: Freezes runaway processes or heavy background tasks at the kernel level without terminating them or causing data loss.
- **Graceful Window Teardown (`user32.PostMessageW`)**: Dispatches `WM_CLOSE` messages to top-level application windows to allow graceful state saving before resorting to hard process termination.

### 2. Sliding-Window Time-Series Calculus
- **Fixed-Size Ring Buffers**: Uses `collections.deque(maxlen=60)` per process, ensuring the monitoring daemon never leaks memory or consumes excessive resources.
- **Slope Derivation for True Memory Leaks**: Differentiates between short burst allocations (such as compiler runs or page renders) and continuous memory leaks by computing the first derivative of Resident Set Size over a 30-to-60 second window:
  $$\text{Memory Slope} = \frac{\text{RAM}_{t} - \text{RAM}_{t_0}}{t - t_0}$$
- **Multi-Tick CPU Runaway Detection**: Filters temporary CPU spikes from stuck infinite loops by validating continuous execution thresholds across consecutive sampling ticks.

### 3. Supervised Safe Remediation
- **Protected Kernel Whitelist**: Hard guardrails strictly prohibit modifying or terminating core Windows system binaries (`csrss.exe`, `lsass.exe`, `services.exe`, `smss.exe`, `wininit.exe`, `explorer.exe`). Any attempt returns `403 Forbidden`.
- **PID Recycling Guard**: Windows aggressively recycles process identifiers. When a remediation action is confirmed, Dr.Debug-for-OS verifies that the process `create_time` matches the snapshot timestamp before dispatching system calls, completely preventing accidental misfires against newly spawned processes.
- **Explicit Human Confirmation**: Destructive actions require user confirmation in a dedicated safety modal.

### 4. Hybrid Diagnostic Engine
- **Offline Mode (Default)**: Fully self-contained heuristic expert system that diagnoses hung states, CPU runaway, memory leaks, and handle exhaustion with zero latency, zero API costs, and zero network calls.
- **LLM Reasoning Mode (Optional)**: Can be connected to the Google Gemini API or a local offline Ollama server (`http://localhost:11434`) to perform deep contextual triage based on process command lines, loaded DLL modules, network socket endpoints, and thread counts.

### 5. OLED Cyber-Glass Desktop Cockpit
- Built with React 18, Vite, and custom CSS design tokens.
- Live SVG sparkline telemetry graphs updating at 1Hz without external heavyweight charting libraries.
- High-density sortable process table with visual mini-bars, search filtering, quick actions, and filter pills (All, Anomalies, High CPU, High RAM, Frozen Windows).
- Slide-out AI Doctor Drawer providing detailed diagnostic reports and Win32 process metadata.

---

## Technology Stack

- **Backend Daemon**: Python 3.10+, FastAPI, Uvicorn, WebSockets, psutil.
- **Windows Systems Programming**: Native Win32 and NT APIs via standard library `ctypes` (`user32.dll`, `ntdll.dll`, `kernel32.dll`).
- **Frontend Cockpit**: React 18, Vite, pure Vanilla CSS with CSS custom properties (compiled bundle size: 52 KB gzipped).
- **Testing**: pytest, pytest-asyncio.

---

## Project Layout

```
.
|-- backend/
|   |-- __init__.py
|   |-- server.py                  # FastAPI application & WebSocket broadcaster
|   `-- doctor/
|       |-- __init__.py
|       |-- telemetry.py           # Sampler & 60-second sliding ring buffer
|       |-- probe.py               # Win32 ctypes calls (IsHungAppWindow, handles)
|       |-- heuristics.py          # Mathematical anomaly detection algorithms
|       |-- diagnostics.py         # Offline expert system & LLM bridge
|       `-- remediation.py         # Safe process controls & kernel whitelist
|-- frontend/
|   |-- src/
|   |   |-- App.jsx                # Main application state & WebSocket consumer
|   |   |-- index.css              # OLED cyber-glass styling & design system
|   |   `-- components/
|   |       |-- HeaderGauges.jsx   # Live SVG sparkline load monitors
|   |       |-- AlertBanner.jsx    # Anomaly notification feed
|   |       |-- ProcessTable.jsx   # Sortable, filterable process grid
|   |       |-- DoctorDrawer.jsx   # AI diagnosis & deep metadata drawer
|   |       |-- RemediateModal.jsx # Safety confirmation modal
|   |       `-- ConfigModal.jsx    # AI provider configuration
|   `-- dist/                      # Pre-compiled static production bundle
|-- study_docs/                    # Comprehensive educational guides for Windows internals
|   |-- README.md                  # Master architecture & memory internals index
|   |-- phase-1.md                 # Telemetry & ring buffer mechanics
|   |-- phase-2.md                 # Win32 probes & message loops
|   |-- phase-3.md                 # Anomaly heuristics & mathematical rules
|   |-- phase-4.md                 # Safe remediation & kernel protection
|   `-- phase-5.md                 # Streaming architecture & desktop UI
|-- tests/
|   |-- test_telemetry.py          # Buffer FIFO & slope tests
|   |-- test_probe.py              # Win32 probe tests
|   |-- test_heuristics.py         # Anomaly detection unit tests
|   |-- test_remediation.py        # Safety whitelist & PID guard tests
|   |-- test_server.py             # REST API & safety guard verification
|   `-- test_e2e_synthetic.py      # End-to-end synthetic worker lifecycle test
|-- run_doctor.py                  # Single-command launcher with auto-port fallback
|-- requirements.txt               # Backend dependencies
`-- README.md
```

---

## Installation & Quickstart

### Prerequisites
- Windows 10 or Windows 11 (x64)
- Python 3.10 or higher
- Optional: Node.js 18+ (only needed if modifying frontend source code; production bundle is pre-built)

### 1. Clone the Repository
```powershell
git clone https://github.com/SazWhatician/Dr.Debug-for-OS.git
cd Dr.Debug-for-OS
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Launch the Application
```powershell
python run_doctor.py
```

The script will bind the backend server and automatically open the cockpit in your default web browser at `http://127.0.0.1:8000`.

To run headless (without automatically launching a browser window):
```powershell
python run_doctor.py --no-browser
```

---

## Automated Test Suite

All components are covered by unit and end-to-end tests:

```powershell
pytest tests/
```

Test coverage includes:
- Ring buffer FIFO pushout and memory slope calculation.
- Win32 `IsHungAppWindow` detection and process detail inspection.
- Anomaly heuristic detection for CPU runaway, memory leaks, and handle thrashing.
- Critical system whitelist verification preventing termination of protected OS binaries.
- PID recycling race condition guard verification.
- Synthetic end-to-end worker lifecycle: spawning dummy worker, detecting simulated anomaly, performing AI diagnosis, adjusting priority, and executing termination.

---

## REST & WebSocket API Reference

### WebSocket Stream
- `GET /ws/telemetry`
  Broadcasts streaming telemetry packets at 1Hz containing system load metrics, top processes, and active anomaly alerts.

### REST Endpoints
- `GET /api/health`: Returns system status and platform confirmation.
- `GET /api/processes`: Retrieves the latest cached process snapshot.
- `GET /api/processes/{pid}/inspect`: Deep inspection for a specific PID (command line, loaded modules, socket connections, window responsiveness).
- `POST /api/doctor/diagnose`: Generates a root-cause diagnostic report via offline heuristics or configured LLM.
- `POST /api/doctor/remediate`: Executes a supervised remediation action (`SUSPEND`, `RESUME`, `GRACEFUL_CLOSE`, `FORCE_KILL`, `SET_PRIORITY`). Requires `user_confirmed: true`.
- `GET /api/config` & `POST /api/config`: Retrieves or updates AI model provider settings (offline, Gemini, Ollama).

---

## Safety & Security Invariants

1. **Kernel Protection**: Hard checks block any destructive commands against `csrss.exe`, `lsass.exe`, `services.exe`, `smss.exe`, `wininit.exe`, and `explorer.exe`.
2. **PID Validation**: Actions specify expected process creation timestamps to eliminate race conditions caused by Windows PID recycling.
3. **Least Privilege**: The application does not require raw kernel drivers and executes within standard user-mode Win32 security boundaries (elevating only when administrator tokens are granted).
4. **Data Privacy**: The default offline heuristic mode requires no internet access and transmits no telemetry outside the local machine.
