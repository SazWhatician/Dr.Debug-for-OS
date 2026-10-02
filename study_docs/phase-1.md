# 📘 Phase 1: Real-Time Telemetry & Ring Buffer Engine

**Status:** 🟡 *In Progress*  
**Last Updated:** 2026-10-02  
**Target Module:** `backend/doctor/telemetry.py`

---

## 🎯 Objectives & Learning Goals
1. Understand high-frequency process sampling on Windows without pegging the CPU.
2. Master in-memory time-series ring buffers using Python's standard library `collections.deque(maxlen=60)`.
3. Distinguish between instantaneous spikes (transient compile jobs or web browser rendering) vs true runaway processes.

---

## ⚙️ Technical Mechanics

### 1. The Ring Buffer Design
Storing endless metric history in memory creates memory leaks in the monitor itself!
Instead, we maintain a fixed-length FIFO deque per tracked process:
```python
from collections import deque
from typing import Dict

# 60 samples @ 1 Hz = exactly 60 seconds of history
process_history: Dict[int, deque] = {}
```

Each sample record stores:
* `timestamp`: float (epoch seconds)
* `cpu_percent`: float (0.0 to 100.0 * num_cores)
* `rss_bytes`: int (Resident Set Size)
* `vms_bytes`: int (Virtual Memory Size)
* `page_faults`: int (accumulated page faults)
* `num_threads`: int
* `num_handles`: int

### 2. Computing Rate of Change (Slope)
To compute whether a process is leaking memory over time $T$, we calculate the slope of memory over the ring buffer:
$$\text{Memory Slope} = \frac{\text{RAM}_{t} - \text{RAM}_{t_0}}{t - t_0}$$
If the slope is consistently positive over 30+ seconds while page faults continue to increment, the process is flagged for memory growth anomaly.

---

## 📝 Phase Completion & Change Notes
- **2026-10-02**: Initial architecture drafted, telemetry data structures and rate-of-change formulas defined.
