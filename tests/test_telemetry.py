import time
import pytest
from collections import deque
from backend.doctor.telemetry import ProcessMetricsBuffer, TelemetrySampler

def test_ring_buffer_maxlen_and_slope():
    buf = ProcessMetricsBuffer(maxlen=5)
    # Feed 6 samples (exceeding maxlen=5)
    for i in range(6):
        buf.record(
            timestamp=1000.0 + i,
            cpu_percent=10.0 + i,
            rss_bytes=1000 + i * 200,
            num_threads=4,
            num_handles=50,
        )
    assert len(buf.history) == 5
    # First sample (i=0) was pushed out, so oldest is i=1 (rss=1200), newest is i=5 (rss=2000)
    assert buf.history[0]["rss_bytes"] == 1200
    assert buf.history[-1]["rss_bytes"] == 2000
    # Slope = (2000 - 1200) / (1005 - 1001) = 800 / 4 = 200 bytes/sec
    assert pytest.approx(buf.get_memory_slope(), rel=1e-3) == 200.0
    assert pytest.approx(buf.get_avg_cpu(), rel=1e-3) == 13.0

def test_telemetry_sampler_snapshot():
    sampler = TelemetrySampler(buffer_len=10)
    snapshot = sampler.collect_snapshot()
    
    assert "timestamp" in snapshot
    assert "system" in snapshot
    assert "cpu_total_percent" in snapshot["system"]
    assert "ram_percent" in snapshot["system"]
    assert isinstance(snapshot["top_processes"], list)
    
    if snapshot["top_processes"]:
        p = snapshot["top_processes"][0]
        assert "pid" in p
        assert "name" in p
        assert "cpu_percent" in p
        assert "ram_bytes" in p
        assert "create_time" in p
