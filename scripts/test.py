"""Run test suites: unit (API + frontend) and e2e (requires test mode services)."""

import os
import signal
import subprocess
import sys
import time

from .utils import (
    ROOT, API, LABELS, TEST_PORTS, TEST_PASSWORD, TEST_DATA_DIR,
    get_venv_python, get_npm_cmd, get_api_env, fix_cmd, run, wait_for_service,
)


e2e_processes: list[subprocess.Popen] = []


def test_api_unit() -> bool:
    """Run API unit and integration tests."""
    label = LABELS["api"]
    print(f"\n[{label}] Running tests...")
    python = get_venv_python(API / ".venv")
    if not python.exists():
        print(f"[{label}] Venv not found. Run shelf-install first.", file=sys.stderr)
        return False
    result = run([str(python), "-m", "pytest", "-v"], cwd=API, check=False)
    return result.returncode == 0


def test_frontend_unit() -> bool:
    """Run frontend unit and component tests."""
    label = LABELS["frontend"]
    print(f"\n[{label}] Running tests...")
    result = run([get_npm_cmd(), "test"], cwd=ROOT, check=False)
    return result.returncode == 0


def start_test_services() -> bool:
    """Start API and frontend in test mode for e2e tests."""
    print("\nStarting test mode services...")

    test_env = {**os.environ, **get_api_env(), "SHELF_TEST": "1"}
    TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Seed test user
    python = get_venv_python(API / ".venv")
    subprocess.run(
        fix_cmd([str(python), "setup_user.py", TEST_PASSWORD]),
        cwd=API,
        env=test_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Start API
    api_proc = subprocess.Popen(
        fix_cmd([str(python), "-m", "uvicorn", "main:app",
                 "--host", "127.0.0.1",
                 "--port", str(TEST_PORTS["api"])]),
        cwd=API,
        env=test_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    e2e_processes.append(api_proc)

    # Start frontend
    frontend_env = {**os.environ, "VITE_API_PORT": str(TEST_PORTS["api"])}
    frontend_proc = subprocess.Popen(
        fix_cmd([get_npm_cmd(), "run", "dev", "--",
                 "--port", str(TEST_PORTS["frontend"]),
                 "--strictPort"]),
        cwd=ROOT,
        env=frontend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    e2e_processes.append(frontend_proc)

    # Wait for both services
    services = [
        ("api", api_proc, TEST_PORTS["api"]),
        ("frontend", frontend_proc, TEST_PORTS["frontend"]),
    ]

    failed = False
    for name, proc, port in services:
        label = LABELS[name]
        if wait_for_service("127.0.0.1", port):
            continue

        # Service didn't start — check why
        failed = True
        returncode = proc.poll()
        if returncode is not None:
            output = proc.stdout.read().decode().strip()
            print(f"[{label}] Exited with code {returncode}", file=sys.stderr)
            if output:
                for line in output.splitlines():
                    print(f"[{label}] {line}", file=sys.stderr)
        else:
            print(f"[{label}] Not responding on port {port} (timed out)", file=sys.stderr)

    if failed:
        stop_test_services()
        return False

    print("Test services ready.")
    return True


def stop_test_services() -> None:
    """Terminate e2e test services."""
    for p in e2e_processes:
        p.terminate()
    for p in e2e_processes:
        try:
            p.wait(timeout=5)
        except subprocess.TimeoutExpired:
            p.kill()
    e2e_processes.clear()


def test_e2e(extra_args: list[str] | None = None) -> bool:
    """Run Playwright e2e tests against test mode services."""
    e2e_dir = ROOT / "e2e"
    if not e2e_dir.exists():
        print("No e2e/ directory found, skipping e2e tests.")
        return True

    if not start_test_services():
        return False

    try:
        cmd = [get_npm_cmd(), "run", "test:e2e"]
        if extra_args:
            cmd += ["--", *extra_args]
        result = run(cmd, cwd=ROOT, check=False)
        return result.returncode == 0
    finally:
        stop_test_services()


def shutdown(sig=None, frame=None) -> None:
    stop_test_services()
    print("\nInterrupted.")
    sys.exit(1)


def main() -> None:
    signal.signal(signal.SIGINT, shutdown)
    if sys.platform != "win32":
        signal.signal(signal.SIGTERM, shutdown)

    # Parse arguments: shelf-test [unit|e2e] [--headed, ...]
    args = sys.argv[1:]
    commands = [a for a in args if not a.startswith("-")]
    extra_args = [a for a in args if a.startswith("-")]

    run_unit = not commands or "unit" in commands
    run_e2e = not commands or "e2e" in commands

    suites = []
    if run_unit:
        suites.append((LABELS["api"], "UNIT", test_api_unit))
        suites.append((LABELS["frontend"], "UNIT", test_frontend_unit))
    if run_e2e:
        suites.append((LABELS["frontend"], "E2E", lambda: test_e2e(extra_args)))

    results = []
    for label, kind, fn in suites:
        passed = fn()
        status = "PASSED" if passed else "FAILED"
        print(f"[{label}] [{kind}] {status}\n")
        results.append((label, kind, passed))

    failed = [f"{label} {kind}" for label, kind, passed in results if not passed]
    if failed:
        print(f"Failed: {', '.join(failed)}")
        sys.exit(1)
    else:
        print("All tests passed.")


if __name__ == "__main__":
    main()
