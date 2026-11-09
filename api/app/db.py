import psycopg

from app.config import database_url


def connect() -> psycopg.Connection:
    return psycopg.connect(database_url(), connect_timeout=3)
