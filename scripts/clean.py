"""Remove generated and temporary files."""

import shutil
import sys

from .utils import ROOT, API, TEST_DATA_DIR


CLEAN_TARGETS = [
    ("Test data", TEST_DATA_DIR),
    ("API venv", API / ".venv"),
    ("API data", API / "data"),
    ("API pycache", API / "__pycache__"),
    ("API pytest cache", API / ".pytest_cache"),
    ("Vite build", ROOT / "dist"),
]


def main() -> None:
    removed = []
    for label, path in CLEAN_TARGETS:
        if path.exists():
            shutil.rmtree(path)
            print(f"Removed {label} ({path})")
            removed.append(label)

    if removed:
        print(f"\nCleaned {len(removed)} targets.")
    else:
        print("Nothing to clean.")


if __name__ == "__main__":
    main()
