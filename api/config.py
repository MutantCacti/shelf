from pathlib import Path
import os
import secrets

BASE_DIR = Path(__file__).parent
DATA_DIR = Path(os.environ.get("SHELF_DATA_DIR", BASE_DIR / "data"))

# Database
DATABASE_PATH = DATA_DIR / "shelf.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Session
SECRET_KEY = os.environ.get("SHELF_SECRET_KEY", secrets.token_hex(32))
SESSION_COOKIE_NAME = "shelf_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30  # 30 days

# Transfers
TRANSFERS_DIR = DATA_DIR / "transfers"
THUMBS_DIR = DATA_DIR / "thumbs"
