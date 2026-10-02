from collections import deque
from typing import Any, Dict, List

def evaluate_process_anomalies(process: Dict[str, Any], history: deque) -> List[Dict[str, Any]]:
    """Evaluates process metrics against sliding-window heuristics to flag anomalies."""
    anomalies: List[Dict[str, Any]] = []
    pid = process.get("pid", 0)
    name = process.get("name", "unknown")
    cpu = process.get("cpu_percent", 0.0)
    handles = process.get("handles", 0)
    threads = process.get("threads", 0)
    is_hung = process.get("is_hung", False)

    # 1. Hung GUI Window
    if is_hung:
        anomalies.append({
            "id": f"hung_{pid}",
            "pid": pid,
            "name": name,
            "type": "HUNG_WINDOW",
            "severity": "CRITICAL",
            "metric_value": "Unresponsive",
            "message": f"{name} (PID {pid}) message queue is unresponsive (> 5 seconds).",
        })

    # 2. CPU Runaway Detection
    if len(history) >= 5:
        recent_samples = list(history)[-5:]
        if cpu >= 80.0 and all(s.get("cpu_percent", 0.0) >= 75.0 for s in recent_samples):
            anomalies.append({
                "id": f"cpu_crit_{pid}",
                "pid": pid,
                "name": name,
                "type": "CPU_RUNAWAY",
                "severity": "CRITICAL",
                "metric_value": f"{cpu}% CPU",
                "message": f"{name} (PID {pid}) is sustaining extreme CPU load ({cpu}%) for > 5s.",
            })
        elif cpu >= 50.0 and sum(s.get("cpu_percent", 0.0) for s in recent_samples) / 5 >= 50.0:
            anomalies.append({
                "id": f"cpu_warn_{pid}",
                "pid": pid,
                "name": name,
                "type": "CPU_RUNAWAY",
                "severity": "WARNING",
                "metric_value": f"{cpu}% CPU",
                "message": f"{name} (PID {pid}) has elevated CPU usage ({cpu}%).",
            })

    # 3. Memory Leak / Unbounded Growth Detection
    if len(history) >= 10:
        first_sample = history[0]
        last_sample = history[-1]
        dt = last_sample.get("timestamp", 0.0) - first_sample.get("timestamp", 0.0)
        if dt > 0.5:
            d_ram = last_sample.get("rss_bytes", 0) - first_sample.get("rss_bytes", 0)
            slope = d_ram / dt
            # If growing by > 5 MB/s and total RAM increased by > 20%
            if slope > 5 * 1024 * 1024 and d_ram > first_sample.get("rss_bytes", 1) * 0.2:
                growth_mb_s = round(slope / (1024 * 1024), 1)
                is_huge = last_sample.get("rss_bytes", 0) > 2 * 1024 * 1024 * 1024
                anomalies.append({
                    "id": f"mem_leak_{pid}",
                    "pid": pid,
                    "name": name,
                    "type": "MEMORY_LEAK",
                    "severity": "CRITICAL" if is_huge else "WARNING",
                    "metric_value": f"+{growth_mb_s} MB/s",
                    "message": f"{name} (PID {pid}) shows rapid memory growth (+{growth_mb_s} MB/s).",
                })

    # 4. Handle Thrashing
    if handles > 10000:
        anomalies.append({
            "id": f"handles_crit_{pid}",
            "pid": pid,
            "name": name,
            "type": "HANDLE_THRASHING",
            "severity": "CRITICAL",
            "metric_value": f"{handles} handles",
            "message": f"{name} (PID {pid}) has {handles} open handles (risk of handle exhaustion).",
        })
    elif handles > 5000:
        anomalies.append({
            "id": f"handles_warn_{pid}",
            "pid": pid,
            "name": name,
            "type": "HANDLE_THRASHING",
            "severity": "WARNING",
            "metric_value": f"{handles} handles",
            "message": f"{name} (PID {pid}) has elevated handle count ({handles} handles).",
        })

    # 5. Thread Flood
    if threads > 200:
        anomalies.append({
            "id": f"thread_flood_{pid}",
            "pid": pid,
            "name": name,
            "type": "THREAD_FLOOD",
            "severity": "WARNING",
            "metric_value": f"{threads} threads",
            "message": f"{name} (PID {pid}) has {threads} active threads.",
        })

    return anomalies
