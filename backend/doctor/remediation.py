import ctypes
from ctypes import wintypes
from typing import Any, Dict, Optional
import psutil

# Protected Windows OS processes that must NEVER be terminated or suspended
PROTECTED_PROCESSES = {
    "csrss.exe",
    "lsass.exe",
    "services.exe",
    "smss.exe",
    "wininit.exe",
    "explorer.exe",
    "svchost.exe",
    "system",
    "system idle process",
    "registry",
    "winlogon.exe",
    "fontdrvhost.exe",
    "dwminit.exe",
}

# Win32 / ntdll signatures
kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32
ntdll = ctypes.windll.ntdll

PROCESS_SUSPEND_RESUME = 0x0800
WM_CLOSE = 0x0010

kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
kernel32.OpenProcess.restype = wintypes.HANDLE

kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
kernel32.CloseHandle.restype = wintypes.BOOL

ntdll.NtSuspendProcess.argtypes = [wintypes.HANDLE]
ntdll.NtSuspendProcess.restype = wintypes.LONG

ntdll.NtResumeProcess.argtypes = [wintypes.HANDLE]
ntdll.NtResumeProcess.restype = wintypes.LONG


def is_protected_process(name: str) -> bool:
    """Checks whether the process name belongs to the protected OS whitelist."""
    return name.lower().strip() in PROTECTED_PROCESSES


def _find_top_level_windows(pid: int):
    hwnds = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def callback(hwnd, lparam):
        window_pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(window_pid))
        if window_pid.value == pid:
            hwnds.append(hwnd)
        return True

    user32.EnumWindows(WNDENUMPROC(callback), 0)
    return hwnds


def remediate_process(
    pid: int,
    action: str,
    process_name: Optional[str] = None,
    priority: Optional[str] = None,
    expected_create_time: Optional[float] = None,
) -> Dict[str, Any]:
    """Applies supervised remediation with strict safety checks."""
    try:
        p = psutil.Process(pid)
    except psutil.NoSuchProcess:
        return {"success": False, "error": f"Process PID {pid} not found (may have already exited)."}

    p_name = process_name or p.name()
    if is_protected_process(p_name):
        return {
            "success": False,
            "error": f"Action blocked: '{p_name}' is a Protected Windows system process.",
        }

    # PID Reuse Guard
    if expected_create_time is not None:
        actual_create = p.create_time()
        if abs(actual_create - expected_create_time) > 1.0:
            return {
                "success": False,
                "error": "PID was recycled by the OS since last inspection. Action aborted for safety.",
            }

    action_upper = action.upper().strip()

    try:
        if action_upper == "FORCE_KILL":
            p.kill()
            return {"success": True, "message": f"Successfully terminated {p_name} (PID {pid})."}

        elif action_upper == "GRACEFUL_CLOSE":
            # Attempt WM_CLOSE first if GUI window exists
            hwnds = _find_top_level_windows(pid)
            if hwnds:
                for hwnd in hwnds:
                    user32.PostMessageW(hwnd, WM_CLOSE, 0, 0)
                return {"success": True, "message": f"Sent WM_CLOSE signal to {len(hwnds)} window(s) of {p_name} (PID {pid})."}
            else:
                p.terminate()
                return {"success": True, "message": f"Sent termination signal to {p_name} (PID {pid})."}

        elif action_upper == "SUSPEND":
            h_proc = kernel32.OpenProcess(PROCESS_SUSPEND_RESUME, False, pid)
            if not h_proc:
                return {"success": False, "error": "Unable to open process handle for suspension (check permissions)."}
            try:
                status = ntdll.NtSuspendProcess(h_proc)
                if status == 0:
                    return {"success": True, "message": f"Successfully suspended {p_name} (PID {pid})."}
                return {"success": False, "error": f"NtSuspendProcess returned error code {hex(status)}"}
            finally:
                kernel32.CloseHandle(h_proc)

        elif action_upper == "RESUME":
            h_proc = kernel32.OpenProcess(PROCESS_SUSPEND_RESUME, False, pid)
            if not h_proc:
                return {"success": False, "error": "Unable to open process handle for resumption."}
            try:
                status = ntdll.NtResumeProcess(h_proc)
                if status == 0:
                    return {"success": True, "message": f"Successfully resumed {p_name} (PID {pid})."}
                return {"success": False, "error": f"NtResumeProcess returned error code {hex(status)}"}
            finally:
                kernel32.CloseHandle(h_proc)

        elif action_upper == "SET_PRIORITY":
            priority_map = {
                "IDLE": psutil.IDLE_PRIORITY_CLASS,
                "BELOW_NORMAL": getattr(psutil, "BELOW_NORMAL_PRIORITY_CLASS", psutil.IDLE_PRIORITY_CLASS),
                "NORMAL": psutil.NORMAL_PRIORITY_CLASS,
                "ABOVE_NORMAL": getattr(psutil, "ABOVE_NORMAL_PRIORITY_CLASS", psutil.HIGH_PRIORITY_CLASS),
                "HIGH": psutil.HIGH_PRIORITY_CLASS,
            }
            target_class = priority_map.get((priority or "NORMAL").upper(), psutil.NORMAL_PRIORITY_CLASS)
            p.nice(target_class)
            return {"success": True, "message": f"Set priority of {p_name} (PID {pid}) to {priority}."}

        else:
            return {"success": False, "error": f"Unknown remediation action: '{action}'."}

    except psutil.AccessDenied:
        return {"success": False, "error": f"Access denied modifying {p_name} (PID {pid}). Administrator elevation required."}
    except Exception as e:
        return {"success": False, "error": f"Failed executing {action}: {str(e)}"}
