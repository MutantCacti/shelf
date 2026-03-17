"""Set up all project environments."""

import shutil
import signal
import subprocess
import sys

from .utils import ROOT, API, LABELS, get_venv_python, get_npm_cmd, run


def check_node() -> None:
    """Check node is installed."""
    if not shutil.which("node"):
        print(f"[{LABELS['frontend']}] Node not found. Install Node.js 20+.", file=sys.stderr)
        sys.exit(1)


def setup_api() -> None:
    """Create API venv and install dependencies."""
    label = LABELS["api"]
    print(f"\n[{label}] Setting up...")

    venv_dir = API / ".venv"
    if not venv_dir.exists():
        run([sys.executable, "-m", "venv", str(venv_dir)])

    python = get_venv_python(venv_dir)
    run([str(python), "-m", "pip", "install", "-r", "requirements.txt"], cwd=API)


def setup_frontend() -> None:
    """Install npm dependencies."""
    label = LABELS["frontend"]
    print(f"\n[{label}] Setting up...")
    check_node()
    run([get_npm_cmd(), "install"], cwd=ROOT)


def shutdown(sig=None, frame=None) -> None:
    print("\nInterrupted.")
    sys.exit(1)


def main() -> None:
    signal.signal(signal.SIGINT, shutdown)
    if sys.platform != "win32":
        signal.signal(signal.SIGTERM, shutdown)

    print("Installing Shelf dependencies...")
    setup_api()
    setup_frontend()
    print("\nInstallation complete.")


if __name__ == "__main__":
    main()
