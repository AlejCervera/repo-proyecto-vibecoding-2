from collections.abc import Callable
from typing import Any

import psycopg


def check_database(connect: Callable[[], Any]) -> bool:
    """Devuelve True si la base de datos responde a un SELECT 1."""
    try:
        with connect() as conn:
            conn.execute("SELECT 1")
        return True
    except (psycopg.Error, OSError, RuntimeError):
        return False
