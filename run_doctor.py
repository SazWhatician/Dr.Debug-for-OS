import os
import sys
import time
import socket
import argparse
import subprocess
import webbrowser
import threading
import urllib.request
import json
import uvicorn

# Fix Windows console UTF-8 encoding so emojis never cause UnicodeEncodeError
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def is_doctor_running(host: str, port: int) -> bool:
    """Checks if another instance of AI Process Doctor is already responding on this port."""
    try:
        url = f"http://{host}:{port}/api/health"
        req = urllib.request.Request(url, headers={"User-Agent": "AIProcessDoctorProbe"})
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("app") == "AI Process Doctor"
    except Exception:
        return False

def is_port_free(host: str, port: int) -> bool:
    """Checks whether the port is available to bind."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) != 0

def find_available_port(host: str, start_port: int, max_attempts: int = 10) -> int:
    """Finds the first free port starting from start_port."""
    for p in range(start_port, start_port + max_attempts):
        if is_port_free(host, p):
            return p
    return start_port

def launch_desktop_window(url: str):
    """Launches Microsoft Edge in dedicated standalone app-mode window."""
    time.sleep(1.0)
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in edge_paths:
        if os.path.exists(p):
            try:
                subprocess.Popen([p, f"--app={url}", "--window-size=1340,840"])
                return
            except Exception:
                pass
    webbrowser.open(url)

def main():
    parser = argparse.ArgumentParser(description="Windows AI Process Doctor")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Do not auto-launch desktop window")
    args = parser.parse_args()

    host = args.host
    port = args.port

    # 1. Check if Doctor is already running
    if is_doctor_running(host, port):
        active_url = f"http://{host}:{port}"
        print("=" * 65)
        print("[+] AI PROCESS DOCTOR IS ALREADY RUNNING!")
        print(f"    Connecting to active session at: {active_url}")
        print("=" * 65)
        if not args.no_browser:
            print("Opening desktop cockpit window...")
            launch_desktop_window(active_url)
        return

    # 2. Check if port is free or find an open port
    if not is_port_free(host, port):
        new_port = find_available_port(host, port + 1)
        print(f"[!] Port {port} is occupied. Using port {new_port} instead.")
        port = new_port

    active_url = f"http://{host}:{port}"
    print("=" * 65)
    print(" [+] AI PROCESS DOCTOR FOR WINDOWS ")
    print(f"     Real-time Cockpit Running at: {active_url}")
    print("=" * 65)

    if not args.no_browser:
        threading.Thread(target=launch_desktop_window, args=(active_url,), daemon=True).start()

    from backend.server import app
    try:
        uvicorn.run(app, host=host, port=port, log_level="warning")
    except Exception as e:
        print(f"[-] Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
