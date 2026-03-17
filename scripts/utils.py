"""Cross-platform utilities for Shelf project scripts."""

import os
import sys
import time
import socket
import subprocess
import tempfile
from pathlib import Path

from termcolor import colored


# Paths

ROOT = Path(__file__).parent.parent
API = ROOT / "api"

# Ports

PORTS = {
    "api": 8000,
    "frontend": 5173,
}
TEST_PORTS = {
    "api": 9000,
    "frontend": 9001,
}

# Labels

LABELS = {
    "api": colored("API", "red"),
    "frontend": colored("FRONTEND", "green"),
}

# Defaults

DEV_PASSWORD = "test"
TEST_PASSWORD = DEV_PASSWORD
TEST_DATA_DIR = Path(tempfile.gettempdir()) / "shelf-test"


def load_dotenv() -> None:
    """Load .env from project root into os.environ. Does not override existing vars."""
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if key not in os.environ:
            os.environ[key] = value


def is_test_mode() -> bool:
    """Check if running in test mode via environment variable."""
    return os.environ.get("SHELF_TEST") == "1"


def get_ports() -> dict[str, int]:
    """Return port config for current mode."""
    return TEST_PORTS if is_test_mode() else PORTS


def get_api_env() -> dict[str, str]:
    """Return extra environment variables for the API process."""
    if not is_test_mode():
        return {}
    TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)
    return {"SHELF_DATA_DIR": str(TEST_DATA_DIR)}


# Cross-platform helpers

def get_venv_python(venv_dir: Path) -> Path:
    """Return path to python inside a venv, cross-platform."""
    if sys.platform == "win32":
        return venv_dir / "Scripts" / "python.exe"
    return venv_dir / "bin" / "python"


def get_npm_cmd() -> str:
    """Return the npm command name for this platform."""
    return "npm.cmd" if sys.platform == "win32" else "npm"


def fix_cmd(cmd: list[str]) -> list[str]:
    """Normalise command for the current platform."""
    cmd = [str(c) for c in cmd]
    if sys.platform == "win32":
        exe = cmd[0]
        if not exe.endswith((".exe", ".cmd")):
            cmd[0] = f"{exe}.cmd"
    return cmd


# Subprocess

def run(
    cmd: list[str],
    cwd: Path | None = None,
    check: bool = True,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    """Run a command with consistent error handling."""
    cmd = fix_cmd(cmd)
    merged_env = {**os.environ, **(env or {})}

    print(colored(f"$ {' '.join(cmd)}", "green"))
    result = subprocess.run(cmd, cwd=cwd, check=False, env=merged_env)

    if check and result.returncode != 0:
        raise subprocess.CalledProcessError(result.returncode, cmd)
    return result


# Network

def wait_for_service(host: str, port: int, timeout: int = 30) -> bool:
    """Block until a TCP connection succeeds or timeout expires."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.5)
    return False
