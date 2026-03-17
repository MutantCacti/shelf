"""Stop Shelf services by port."""

import sys

import psutil

from .utils import LABELS, load_dotenv, get_ports


def kill_port(port: int) -> bool:
    """Kill process listening on port. Returns True if killed."""
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.pid:
            try:
                psutil.Process(conn.pid).terminate()
                return True
            except psutil.AccessDenied:
                print(f"Permission denied killing process on port {port}", file=sys.stderr)
            except psutil.NoSuchProcess:
                pass
    return False


def main() -> None:
    load_dotenv()
    ports = get_ports()

    for name, port in ports.items():
        label = LABELS[name]
        if kill_port(port):
            print(f"[{label}] Stopped (port {port})")
        else:
            print(f"[{label}] Nothing on port {port}")


if __name__ == "__main__":
    main()
