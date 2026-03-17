"""Run all test suites."""

import signal
import sys

from .utils import ROOT, API, LABELS, get_venv_python, get_npm_cmd, run


def test_api() -> bool:
    """Run API integration tests."""
    label = LABELS["api"]
    print(f"\n[{label}] Running tests...")
    python = get_venv_python(API / ".venv")
    if not python.exists():
        print(f"[{label}] Venv not found. Run shelf-install first.", file=sys.stderr)
        return False
    result = run([str(python), "-m", "pytest", "test_api.py", "-v"], cwd=API, check=False)
    return result.returncode == 0


def test_frontend() -> bool:
    """Run frontend unit and component tests."""
    label = LABELS["frontend"]
    print(f"\n[{label}] Running tests...")
    result = run([get_npm_cmd(), "test"], cwd=ROOT, check=False)
    return result.returncode == 0


def shutdown(sig=None, frame=None) -> None:
    print("\nInterrupted.")
    sys.exit(1)


def main() -> None:
    signal.signal(signal.SIGINT, shutdown)
    if sys.platform != "win32":
        signal.signal(signal.SIGTERM, shutdown)

    suites = [
        ("api", test_api),
        ("frontend", test_frontend),
    ]

    results = []
    for name, fn in suites:
        passed = fn()
        label = LABELS[name]
        status = "PASSED" if passed else "FAILED"
        print(f"[{label}] {status}\n")
        results.append((name, passed))

    failed = [name for name, passed in results if not passed]
    if failed:
        print(f"Failed: {', '.join(failed)}")
        sys.exit(1)
    else:
        print("All tests passed.")


if __name__ == "__main__":
    main()
