import sys
from pathlib import Path

# Ensure the api directory is on sys.path so local modules (db, models, etc.) resolve
sys.path.insert(0, str(Path(__file__).parent))
