#!/usr/bin/env python3
"""Initialize or update the single user password."""

import sys
import getpass

import bcrypt

from db import init_db, SessionLocal
from models import Auth


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def main():
    init_db()

    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = getpass.getpass("Enter password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Passwords don't match")
            sys.exit(1)

    password_hash = hash_password(password)

    session = SessionLocal()
    try:
        auth = session.query(Auth).first()
        if auth:
            auth.password_hash = password_hash
            print("Password updated")
        else:
            auth = Auth(id=1, password_hash=password_hash)
            session.add(auth)
            print("User created")
        session.commit()
    finally:
        session.close()


if __name__ == "__main__":
    main()
