"""Shared .env loading for worker entrypoints.

Loads .env first, then .env.local, checking apps/worker/, apps/, and the
repo root (override=False, so real process env always wins). Replaces the
directory-walk loop that was copy-pasted across the entrypoints.
"""
from pathlib import Path

from dotenv import load_dotenv

_WORKER_DIR = Path(__file__).resolve().parent.parent  # apps/worker


def load_env() -> None:
    for name in ('.env', '.env.local'):
        for directory in (_WORKER_DIR, _WORKER_DIR.parent, _WORKER_DIR.parent.parent):
            path = directory / name
            if path.exists():
                load_dotenv(path, override=False)
                break
