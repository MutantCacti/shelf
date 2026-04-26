"""Set up HTTPS certificates using mkcert"""
import os
import sys
import shutil
import platform
import subprocess
from pathlib import Path

try:
    from .utils import ROOT, run
except ImportError:
    print("Failed to import. Have you run pip install -e .?", file=sys.stderr)
    sys.exit(1)

CERTS_DIR = ROOT / "certs"

MKCERT_VERSION = "v1.4.4"
MKCERT_BINARIES = {
    ("Linux", "x86_64"): f"mkcert-{MKCERT_VERSION}-linux-amd64",
    ("Linux", "aarch64"): f"mkcert-{MKCERT_VERSION}-linux-arm64",
    ("Darwin", "x86_64"): f"mkcert-{MKCERT_VERSION}-darwin-amd64",
    ("Darwin", "arm64"): f"mkcert-{MKCERT_VERSION}-darwin-arm64",
}

# Frontend expects these names (from mkcert default output)
FRONTEND_CERT = "localhost+2.pem"
FRONTEND_KEY = "localhost+2-key.pem"

# Backend expects these names
BACKEND_CERT = "cert.pem"
BACKEND_KEY = "key.pem"


def certs_exist() -> bool:
    return (CERTS_DIR / FRONTEND_CERT).exists() and (CERTS_DIR / FRONTEND_KEY).exists()


def get_mkcert() -> str | None:
    """Find or download mkcert. Returns path to binary or None."""
    # Check PATH first
    found = shutil.which("mkcert")
    if found:
        return found

    # Check if we already downloaded it
    local = CERTS_DIR / "mkcert"
    if local.exists() and os.access(local, os.X_OK):
        return str(local)

    # Download for this platform
    system = platform.system()
    machine = platform.machine()
    binary_name = MKCERT_BINARIES.get((system, machine))

    if not binary_name:
        print(f"No mkcert binary available for {system}/{machine}.", file=sys.stderr)
        print("Install mkcert manually: https://github.com/FiloSottile/mkcert", file=sys.stderr)
        return None

    url = f"https://github.com/FiloSottile/mkcert/releases/download/{MKCERT_VERSION}/{binary_name}"
    CERTS_DIR.mkdir(exist_ok=True)

    print(f"Downloading mkcert from {url}...")
    try:
        run(["curl", "-L", "-o", str(local), url])
        os.chmod(local, 0o755)
        return str(local)
    except subprocess.CalledProcessError:
        print("Failed to download mkcert.", file=sys.stderr)
        return None


def main() -> None:
    if certs_exist():
        print("HTTPS already configured. Certs found in certs/")
        return

    mkcert = get_mkcert()
    if not mkcert:
        sys.exit(1)

    CERTS_DIR.mkdir(exist_ok=True)

    # Install local CA
    print("Installing local CA...")
    subprocess.run([mkcert, "-install"], check=False)

    # Generate certificates
    print("Generating certificates...")
    try:
        run([mkcert, "localhost", "127.0.0.1", "::1"], cwd=CERTS_DIR)
    except subprocess.CalledProcessError:
        print("Failed to generate certificates.", file=sys.stderr)
        sys.exit(1)

    # Create backend cert names (symlinks on Unix, copies on Windows)
    frontend_cert = CERTS_DIR / FRONTEND_CERT
    frontend_key = CERTS_DIR / FRONTEND_KEY
    backend_cert = CERTS_DIR / BACKEND_CERT
    backend_key = CERTS_DIR / BACKEND_KEY

    if not backend_cert.exists():
        if sys.platform == "win32":
            shutil.copy2(frontend_cert, backend_cert)
            shutil.copy2(frontend_key, backend_key)
        else:
            backend_cert.symlink_to(FRONTEND_CERT)
            backend_key.symlink_to(FRONTEND_KEY)

    print("HTTPS configured. Run shelf-start to use HTTPS.")


if __name__ == "__main__":
    main()
