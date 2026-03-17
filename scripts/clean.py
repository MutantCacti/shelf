"""Equivalent to git clean -xdf, except the root .venv is preserved."""

import shutil

from .utils import ROOT, API, TEST_DATA_DIR


# Everything git would remove with clean -xdf, minus the root .venv
# (which is where shelf-scripts itself is installed).
CLEAN_TARGETS = [
    ("node_modules", ROOT / "node_modules"),
    ("shelf_scripts.egg-info", ROOT / "shelf_scripts.egg-info"),
    ("Vite build", ROOT / "dist"),
    ("Test data", TEST_DATA_DIR),
    ("API venv", API / ".venv"),
    ("API data", API / "data"),
    ("API pycache", API / "__pycache__"),
    ("API pytest cache", API / ".pytest_cache"),
]


def main() -> None:
    print("Removing all generated files.\n")

    removed = []
    for label, path in CLEAN_TARGETS:
        if path.exists():
            shutil.rmtree(path)
            print(f"  Removed {label} ({path})")
            removed.append(label)

    if removed:
        print(f"\nCleaned {len(removed)} targets. Run shelf-install to rebuild.")
    else:
        print("Nothing to clean.")


if __name__ == "__main__":
    main()
