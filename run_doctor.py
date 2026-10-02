import os
import sys
import time
import argparse
import subprocess
import webbrowser
import threading
import uvicorn

def launch_desktop_window(url: str):
    """Launches Microsoft Edge in dedicated standalone app-mode window."""
    time.sleep(1.2)  # Wait for uvicorn to bind
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in edge_paths:
        if os.path.exists(p):
            try:
                subprocess.Popen([p, f"--app={url}", "--window-size=1280,820"])
                return
            except Exception:
                pass
    # Fallback to default browser
    webbrowser.open(url)

def main():
    parser = argparse.ArgumentParser(description="Windows AI Process Doctor")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Do not auto-launch desktop window")
    args = parser.parse_args()

    url = f"http://{args.host}:{args.port}"
    print("=" * 60)
    print(" 🩺 AI PROCESS DOCTOR FOR WINDOWS ")
    print(f" Real-time Cockpit Running at: {url}")
    print("=" * 60)

    if not args.no_browser:
        threading.Thread(target=launch_desktop_window, args=(url,), daemon=True).start()

    from backend.server import app
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")

if __name__ == "__main__":
    main()
