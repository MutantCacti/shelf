"""Create a new Shelf user."""

import sys

from .utils import API, get_venv_python, run, load_dotenv, get_api_env


def main() -> None:
    load_dotenv()
    python = get_venv_python(API / ".venv")
    if not python.exists():
        print("API venv not found. Run shelf-install first.", file=sys.stderr)
        sys.exit(1)
    args = sys.argv[1:]
    run(
        cmd=[str(python), "setup_user.py", *args],
        cwd=API,
        env=get_api_env(),
    )


if __name__ == "__main__":
    main()
