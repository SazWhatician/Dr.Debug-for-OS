# 📘 Phase 3: Anomaly Heuristics Engine

**Status:** ⚪ *Planned*  
**Last Updated:** 2026-10-02  
**Target Module:** `backend/doctor/heuristics.py`

---

## 🎯 Objectives & Learning Goals
1. Implement mathematically grounded anomaly detection rules on streaming time-series metrics.
2. Prevent alert fatigue by filtering transient CPU bursts vs. true infinite loops.
3. Categorize severity levels: `INFO`, `WARNING`, `CRITICAL`.

---

## ⚙️ Anomaly Rules & Heuristics

### 1. CPU Runaway Rule
* **Condition**: A single process consumes >80% of a core for $\ge 5$ consecutive seconds without yielding.
* **Severity**: `CRITICAL` if user is active; `WARNING` if running in background.
* **Exclusion**: Compiler processes (`cl.exe`, `gcc.exe`, `rustc.exe`), video renderers, or benchmark tools.

### 2. Memory Leak Rule
* **Condition**: Working set size has grown monotonically across the last 30 samples, with a growth rate exceeding $10\text{ MB/sec}$, and no memory reclamation (shrinkage) observed.
* **Severity**: `WARNING` if < 2GB; `CRITICAL` if > 4GB or approaching system physical limit.

### 3. Hung GUI Application Rule
* **Condition**: At least one visible window owned by the PID returns `IsHungAppWindow(hwnd) == True`.
* **Severity**: `CRITICAL` (direct negative user impact).

### 4. Handle Thrashing
* **Condition**: Total open handles > 10,000 or handle creation rate > 100 handles/sec.
* **Severity**: `WARNING` (often indicates a resource leak in file or socket management).

---

## 📝 Phase Completion & Change Notes
- **2026-10-02**: Formalized anomaly detection rules, thresholds, and severity classifications.
