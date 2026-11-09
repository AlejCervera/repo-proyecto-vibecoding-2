import os

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.migrate import migrate

TEST_DB = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://gymlog:dev-password-inventada@localhost:5433/gymlog_test"
)


@pytest.fixture
def conn():
    """Conexión al Postgres de pruebas, migrado y con las tablas vacías."""
    with psycopg.connect(TEST_DB, autocommit=True) as c:
        migrate(c)
        c.execute("TRUNCATE series RESTART IDENTITY")
        yield c


@pytest.fixture
def client(monkeypatch, conn):
    monkeypatch.setenv("DATABASE_URL", TEST_DB)
    return TestClient(app)
