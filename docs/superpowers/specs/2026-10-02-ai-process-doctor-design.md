# AI Process Doctor for Windows — Design Specification

**Date:** 2026-10-02  
**Status:** Approved  
**Author:** Pair Programming Agent & User  
**Target Platform:** Windows 10 / 11 (x64)  
**Philosophy:** Ponytail Minimality (stdlib-first, zero bloat, YAGNI, robust system safety)

---

## 1. Executive Summary & Intent

**AI Process Doctor** is a lightweight, real-time Windows desktop cockpit designed for power users, developers, and administrators. It monitors process health, identifies resource hogs, memory leaks, and unresponsive threads, and features an integrated AI Doctor that explains process root causes and orchestrates supervised, one-click remediation actions.

---

## 2. Architecture & Component Boundaries

The project adheres to a clean decoupled architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                 React Desktop Cockpit (UI)                  │
│  - Real-time telemetry dashboard & 60fps trend charts       │
│  - Anomaly alert feed & Process table                       │
│  - AI Doctor Diagnosis & Remediation Confirmation Drawer    │
└──────────────────────────────▲──────────────────────────────┘
                               │ WebSocket (/ws/telemetry)
                               │ REST API (/api/doctor/*)
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Local Backend                    │
│  ┌───────────────────────┐      ┌─────────────────────────┐ │
│  │   Telemetry Engine    │      │    Diagnostic Engine    │ │
│  │ - psutil & pywin32    │      │ - Heuristic Analyzer    │ │
│  │ - 60s Sliding Buffer  │      │ - Gemini / Ollama LLM   │ │
│  └───────────┬───────────┘      └────────────┬────────────┘ │
│              │                               │              │
│  ┌───────────▼───────────┐      ┌────────────▼────────────┐ │
│  │ Windows Process Probe │      │ Safe Remediation Layer  │ │
│  │ - Win32 handles/DLLs  │      │ - Whitelist guardrails  │ │
│  │ - IsHungAppWindow     │      │ - Suspend/Kill/Priority │ │
│  └───────────────────────┘      └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ Native Edge WebView2 Shell
┌──────────────────────────────┴──────────────────────────────┐
│       Desktop App Launcher (pywebview / App-Mode Fallback)   │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities:
1. `backend/doctor/telemetry.py`: Asynchronous background worker sampling active processes every 1s into in-memory deques (`collections.deque(maxlen=60)`). Computes CPU utilization, working set RAM, private bytes, page fault deltas, thread counts, and handle counts.
2. `backend/doctor/probe.py`: Win32 probe leveraging `ctypes` (standard library) to query `user32.IsHungAppWindow(hwnd)`, command lines, loaded modules (DLLs), and open socket/file handles.
3. `backend/doctor/heuristics.py`: Rule-based evaluation engine detecting:
   - **CPU Runaway**: Sustained >80% CPU over 5+ consecutive sample ticks.
   - **Memory Leak**: Monotonic positive slope in Working Set over 30s + high page fault delta.
   - **Hung GUI**: Window unresponsive to `SendMessageTimeout(WM_NULL)` for >5 seconds.
   - **Handle Thrashing**: Handle count > 10,000 or growth > 100/sec.
   - **Orphan / Zombie**: Parent PID terminated while child continues consuming resources.
4. `backend/doctor/diagnostics.py`: Dual-mode diagnostic synthesizer:
   - *Mode A (Offline Built-in)*: Instant heuristic explanation and remediation advice without network calls.
   - *Mode B (LLM Integration)*: Lightweight HTTP dispatch to Google Gemini REST API or local Ollama (`http://localhost:11434/api/generate`) with system process context.
5. `backend/doctor/remediation.py`: Supervised execution pipeline for:
   - Graceful Close (`WM_CLOSE` via `ctypes.windll.user32.PostMessageW`).
   - Hard Terminate (`TerminateProcess` via `psutil.Process.kill()`).
   - Suspend / Resume (`ntdll.NtSuspendProcess` / `NtResumeProcess`).
   - Priority Tuning (`psutil.Process.nice()`).
   - **Whitelist Safety**: Strictly rejects modification of protected critical processes (`csrss.exe`, `lsass.exe`, `services.exe`, `smss.exe`, `explorer.exe`, `wininit.exe`, `svchost.exe`).
6. `backend/server.py`: FastAPI server serving `/ws/telemetry` streaming events and `/api/doctor/*` REST endpoints.
7. `frontend/`: Fast, responsive React dashboard styled with modern cyber-glass dark mode, displaying dynamic SVG sparkline charts, anomaly alerts, search/filter table, and the AI Doctor drawer.

---

## 3. Data Flow & Schemas

### Telemetry Packet (WebSocket: `/ws/telemetry` at 1Hz)
```json
{
  "timestamp": 1727862000.123,
  "system": {
    "cpu_total_percent": 34.2,
    "ram_used_bytes": 17179869184,
    "ram_total_bytes": 34359738368,
    "ram_percent": 50.0
  },
  "top_processes": [
    {
      "pid": 4812,
      "name": "chrome.exe",
      "cpu_percent": 24.5,
      "ram_bytes": 838860800,
      "ram_trend": "rising",
      "threads": 42,
      "handles": 1120,
      "is_hung": false,
      "anomalies": ["memory_growth"]
    }
  ],
  "anomaly_alerts": [
    {
      "id": "alert_4812_1727862000",
      "pid": 4812,
      "process_name": "chrome.exe",
      "type": "MEMORY_LEAK",
      "severity": "WARNING",
      "message": "Working set grew by 420MB over the last 45 seconds."
    }
  ]
}
```

### Remediation Request & Confirmation (`POST /api/doctor/remediate`)
```json
{
  "pid": 4812,
  "action": "SUSPEND | RESUME | GRACEFUL_CLOSE | FORCE_KILL | SET_PRIORITY",
  "priority_level": "IDLE | BELOW_NORMAL | NORMAL | ABOVE_NORMAL | HIGH",
  "user_confirmed": true
}
```

---

## 4. Error Handling & Edge Cases

1. **Access Denied / UAC Elevation**:
   - Querying certain SYSTEM processes or calling `OpenProcess` may raise `psutil.AccessDenied`.
   - The probe catches `AccessDenied` gracefully, flags the process as `[Elevated/System]`, and prevents unsupported remediation.
2. **PID Reuse Race Condition**:
   - A process could terminate and its PID be recycled before a remediation command executes.
   - Guard: Verify `process.create_time()` matches the snapshot before executing `TerminateProcess` or `NtSuspendProcess`.
3. **Protected Process Whitelist Guard**:
   - Any remediation attempt on a critical kernel/OS binary returns `403 Forbidden` with an explanation: `"Protected Windows System Process"`.

---

## 5. Verification & Testing Strategy

1. **Backend Unit & Diagnostic Tests (`pytest`)**:
   - Test sliding-window heuristics against synthetic metric series (simulating sustained CPU, memory leaks, and hung GUI states).
   - Test whitelist validator ensuring critical OS processes cannot be terminated.
   - Test PID reuse guard and error boundaries.
2. **End-to-End Synthetic Probe Test**:
   - Spawn a controlled python dummy worker (e.g. infinite spin or memory consumer) to verify detection, alert generation, and supervised remediation (suspend/resume/kill).
3. **Frontend Telemetry UI Verification**:
   - Verify WebSocket telemetry ingestion, smooth sparklines rendering, anomaly alert display, and interactive remediation modal confirmation.
