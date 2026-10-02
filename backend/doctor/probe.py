import ctypes
from ctypes import wintypes
from typing import Any, Dict, List, Optional
import psutil

# Windows user32 types and signatures
user32 = ctypes.windll.user32
WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

user32.EnumWindows.argtypes = [WNDENUMPROC, wintypes.LPARAM]
user32.EnumWindows.restype = wintypes.BOOL

user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.GetWindowThreadProcessId.restype = wintypes.DWORD

user32.IsHungAppWindow.argtypes = [wintypes.HWND]
user32.IsHungAppWindow.restype = wintypes.BOOL


def is_process_hung(pid: int) -> bool:
    """Checks if any top-level window belonging to the process is unresponsive."""
    hung_found = False

    def enum_windows_callback(hwnd, lparam):
        nonlocal hung_found
        window_pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(window_pid))
        if window_pid.value == pid:
            if user32.IsHungAppWindow(hwnd):
                hung_found = True
                return False  # Stop enumerating
        return True

    try:
        user32.EnumWindows(WNDENUMPROC(enum_windows_callback), 0)
    except Exception:
        pass
    return hung_found


def get_process_details(pid: int) -> Dict[str, Any]:
    """Extracts rich diagnostic metadata for a specific process."""
    try:
        p = psutil.Process(pid)
    except psutil.NoSuchProcess:
        return {"error": "Process not found", "pid": pid}
    except psutil.AccessDenied:
        return {"error": "Access denied (Privileged/System)", "pid": pid}

    try:
        with p.oneshot():
            name = p.name()
            exe = p.exe()
            cmdline = " ".join(p.cmdline()) if p.cmdline() else ""
            cwd = p.cwd() if hasattr(p, "cwd") else ""
            status = p.status()
            create_time = p.create_time()
            cpu_percent = p.cpu_percent(interval=None)
            mem_info = p.memory_full_info() if hasattr(p, "memory_full_info") else p.memory_info()
            threads = p.num_threads()
            parent = p.parent()
            parent_info = {"pid": parent.pid, "name": parent.name()} if parent else None
    except (psutil.AccessDenied, psutil.NoSuchProcess):
        name = p.name() if hasattr(p, "name") else "unknown"
        exe = "[Access Denied]"
        cmdline = "[Access Denied]"
        cwd = "[Access Denied]"
        status = "unknown"
        create_time = 0.0
        cpu_percent = 0.0
        mem_info = None
        threads = 0
        parent_info = None

    # Retrieve handles safely
    try:
        handles = p.num_handles()
    except (psutil.AccessDenied, psutil.NoSuchProcess, AttributeError):
        handles = 0

    # Retrieve open files (limit to first 10 for performance)
    open_files = []
    try:
        for f in p.open_files()[:10]:
            open_files.append(f.path)
    except (psutil.AccessDenied, psutil.NoSuchProcess):
        pass

    # Retrieve network connections
    connections = []
    try:
        conn_fn = getattr(p, "net_connections", None) or getattr(p, "connections", None)
        if conn_fn:
            for c in conn_fn(kind="inet")[:5]:
                connections.append({
                    "fd": getattr(c, "fd", -1),
                    "family": str(c.family),
                    "type": str(c.type),
                    "laddr": f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "",
                    "raddr": f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "",
                    "status": getattr(c, "status", ""),
                })
    except (psutil.AccessDenied, psutil.NoSuchProcess, Exception):
        pass

    return {
        "pid": pid,
        "name": name,
        "exe": exe,
        "cmdline": cmdline,
        "cwd": cwd,
        "status": status,
        "create_time": create_time,
        "cpu_percent": cpu_percent,
        "ram_bytes": mem_info.rss if mem_info else 0,
        "threads": threads,
        "handles": handles,
        "parent": parent_info,
        "open_files": open_files,
        "connections": connections,
        "is_hung": is_process_hung(pid),
    }
