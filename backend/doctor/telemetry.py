import time
from collections import deque
from typing import Any, Dict, List, Optional
import psutil

class ProcessMetricsBuffer:
    """Sliding-window ring buffer for time-series process metrics."""
    def __init__(self, maxlen: int = 60):
        self.history: deque = deque(maxlen=maxlen)

    def record(self, timestamp: float, cpu_percent: float, rss_bytes: int, num_threads: int, num_handles: int):
        self.history.append({
            "timestamp": timestamp,
            "cpu_percent": cpu_percent,
            "rss_bytes": rss_bytes,
            "num_threads": num_threads,
            "num_handles": num_handles,
        })

    def get_memory_slope(self) -> float:
        """Returns memory growth rate in bytes/second across the recorded window."""
        if len(self.history) < 2:
            return 0.0
        dt = self.history[-1]["timestamp"] - self.history[0]["timestamp"]
        if dt <= 0.001:
            return 0.0
        return (self.history[-1]["rss_bytes"] - self.history[0]["rss_bytes"]) / dt

    def get_avg_cpu(self) -> float:
        """Returns average CPU percentage across the recorded window."""
        if not self.history:
            return 0.0
        return sum(h["cpu_percent"] for h in self.history) / len(self.history)


class TelemetrySampler:
    """High-frequency, lightweight process metrics collector."""
    def __init__(self, buffer_len: int = 60):
        self.buffer_len = buffer_len
        self.buffers: Dict[int, ProcessMetricsBuffer] = {}

    def _cleanup_stale_buffers(self, active_pids: set):
        stale_pids = set(self.buffers.keys()) - active_pids
        for pid in stale_pids:
            del self.buffers[pid]

    def collect_snapshot(self) -> Dict[str, Any]:
        now = time.time()
        mem = psutil.virtual_memory()
        
        system_stats = {
            "cpu_total_percent": psutil.cpu_percent(interval=None),
            "ram_used_bytes": mem.used,
            "ram_total_bytes": mem.total,
            "ram_percent": mem.percent,
        }

        active_pids = set()
        processes_list: List[Dict[str, Any]] = []

        attrs = ["pid", "name", "cpu_percent", "memory_info", "num_threads", "num_handles", "create_time"]
        for p in psutil.process_iter(attrs):
            try:
                info = p.info
                pid = info["pid"]
                if pid == 0:
                    continue  # Skip System Idle Process
                active_pids.add(pid)

                rss = info["memory_info"].rss if info.get("memory_info") else 0
                cpu = info.get("cpu_percent") or 0.0
                threads = info.get("num_threads") or 0
                handles = info.get("num_handles") or 0
                create_time = info.get("create_time") or 0.0

                # Update sliding buffer
                if pid not in self.buffers:
                    self.buffers[pid] = ProcessMetricsBuffer(maxlen=self.buffer_len)
                buf = self.buffers[pid]
                buf.record(now, cpu, rss, threads, handles)

                processes_list.append({
                    "pid": pid,
                    "name": info.get("name") or "unknown",
                    "cpu_percent": round(cpu, 1),
                    "ram_bytes": rss,
                    "ram_mb": round(rss / (1024 * 1024), 1),
                    "memory_slope_kb_s": round(buf.get_memory_slope() / 1024, 2),
                    "avg_cpu_percent": round(buf.get_avg_cpu(), 1),
                    "threads": threads,
                    "handles": handles,
                    "create_time": create_time,
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        self._cleanup_stale_buffers(active_pids)

        # Sort top processes by CPU descending, then RAM descending
        processes_list.sort(key=lambda x: (x["cpu_percent"], x["ram_bytes"]), reverse=True)

        return {
            "timestamp": now,
            "system": system_stats,
            "top_processes": processes_list[:100],  # Top 100 active processes
            "total_process_count": len(active_pids),
        }
