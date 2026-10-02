# 📘 Phase 2: Win32 Deep Probe & App Responsiveness

**Status:** 🟢 *Completed*  
**Last Updated:** 2026-10-02  
**Target Module:** `backend/doctor/probe.py`

---

## 🎯 Objectives & Learning Goals
1. Interfacing with Win32 APIs without C++ compilers or bulky external wrappers, using Python's built-in `ctypes`.
2. Discovering all top-level windows for a PID via `EnumWindows`.
3. Querying window responsiveness using `user32.IsHungAppWindow`.
4. Inspecting loaded DLLs, parent process hierarchy, and open file handles safely.

---

## ⚙️ Technical Mechanics

### 1. `user32.IsHungAppWindow` Internals
Windows GUI applications have a message loop driven by `user32.dll`.
When a program performs a heavy synchronous operation on the UI thread (like an un-threaded network request or infinite loop), messages like `WM_PAINT`, `WM_MOUSEMOVE`, and `WM_KEYDOWN` pile up in the thread's message queue.

To detect this, the Doctor invokes:
```python
import ctypes

user32 = ctypes.windll.user32
# BOOL IsHungAppWindow(HWND hWnd);
user32.IsHungAppWindow.argtypes = [ctypes.c_void_p]
user32.IsHungAppWindow.restype = ctypes.c_bool

is_hung = user32.IsHungAppWindow(hwnd)
```
If `IsHungAppWindow` returns `True`, the process has not pumped its message queue for more than 5 seconds.

### 2. Parent-Child Process Relationship
When an application spawns multiple helper subprocesses (e.g. Chrome rendering tabs, VS Code language servers, or Electron workers), identifying the root parent is critical to diagnosing whether terminating one worker is safe or if the root manager must be addressed.

---

## 📝 Phase Completion & Change Notes
- **2026-10-02**: Outlined Win32 ctypes integration, window enumeration, and message queue health checks.
- **2026-10-02**: Implemented `is_process_hung` with `user32.EnumWindows` + `IsHungAppWindow` and `get_process_details` in `backend/doctor/probe.py`. Added comprehensive error boundaries for `psutil.AccessDenied` and validated tests in `tests/test_probe.py`. Status updated to 🟢 Completed.
