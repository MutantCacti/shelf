"""Start Shelf services (API + frontend dev server)."""

import sys
import signal
import threading
import subprocess
from typing import BinaryIO

from .utils import (
    ROOT, API, LABELS, load_dotenv, is_test_mode, get_ports, get_api_env,
    get_venv_python, get_npm_cmd, fix_cmd, wait_for_service,
    TEST_PASSWORD,
)

processes: list[subprocess.Popen] = []


def prefix_output(stream: BinaryIO, prefix: str) -> None:
    """Read lines from stream and print with prefix."""
    for line in iter(stream.readline, b""):
        print(f"[{prefix}] {line.decode().rstrip()}")
    stream.close()


def start_service(cmd: list[str], cwd, prefix: str, env: dict[str, str] | None = None) -> subprocess.Popen:
    """Start a subprocess with prefixed output."""
    import os
    merged_env = {**os.environ, **(env or {})}

    proc = subprocess.Popen(
        fix_cmd(cmd),
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=merged_env,
    )
    threading.Thread(
        target=prefix_output,
        args=(proc.stdout, prefix),
        daemon=True,
    ).start()
    return proc


def seed_test_user() -> None:
    """Create a test user in the test database if none exists."""
    python = get_venv_python(API / ".venv")
    try:
        run([str(python), "setup_user.py", TEST_PASSWORD], cwd=API, env=get_api_env())
    except subprocess.CalledProcessError:
        pass


def start_api() -> subprocess.Popen:
    """Start uvicorn API server."""
    python = get_venv_python(API / ".venv")
    ports = get_ports()
    return start_service(
        cmd=[str(python), "-m", "uvicorn", "main:app",
             "--host", "127.0.0.1", "--port", str(ports["api"])],
        cwd=API,
        prefix=LABELS["api"],
        env=get_api_env(),
    )


def start_frontend() -> subprocess.Popen:
    """Start Vite dev server."""
    ports = get_ports()
    api_port = ports["api"]
    frontend_port = ports["frontend"]

    return start_service(
        cmd=[get_npm_cmd(), "run", "dev", "--",
             "--port", str(frontend_port),
             "--strictPort"],
        cwd=ROOT,
        prefix=LABELS["frontend"],
        env={"VITE_API_PORT": str(api_port)},
    )


def shutdown(sig=None, frame=None) -> None:
    """Terminate all child processes."""
    print("\nShutting down...")
    for p in processes:
        p.terminate()
    for p in processes:
        try:
            p.wait(timeout=5)
        except subprocess.TimeoutExpired:
            p.kill()
    sys.exit(0)


def main() -> None:
    load_dotenv()

    signal.signal(signal.SIGINT, shutdown)
    if sys.platform != "win32":
        signal.signal(signal.SIGTERM, shutdown)

    python = get_venv_python(API / ".venv")
    if not python.exists():
        print("API venv not found. Run shelf-install first.", file=sys.stderr)
        sys.exit(1)

    ports = get_ports()
    mode = "test" if is_test_mode() else "dev"
    print(f"Starting Shelf ({mode} mode)...")

    if is_test_mode():
        seed_test_user()

    processes.extend([start_api(), start_frontend()])

    for name, port in ports.items():
        label = LABELS[name]
        if wait_for_service("127.0.0.1", port):
            print(f"[{label}] Ready on port {port}")
        else:
            print(f"[{label}] Failed to start on port {port}", file=sys.stderr)

    print(f"\nServices running. Press Ctrl+C to stop.")

    for p in processes:
        p.wait()


if __name__ == "__main__":
    main()
