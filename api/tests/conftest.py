import os

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.ejercicios.nombres import normalizar
from app.ejercicios.repository import insertar_base
from app.main import app
from app.migrate import migrate

TEST_DB = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://gymlog:dev-password-inventada@localhost:5433/gymlog_test"
)
SECRETO = "secreto-de-pruebas"
CODIGO = "codigo-de-pruebas"
PASSWORD = "contraseña-segura"


@pytest.fixture
def conn():
    """Conexión al Postgres de pruebas, migrado y con las tablas vacías."""
    with psycopg.connect(TEST_DB, autocommit=True) as c:
        migrate(c)
        c.execute("TRUNCATE series, sesiones, ejercicios, usuarios RESTART IDENTITY CASCADE")
        yield c


def base(nombre: str, wger_id: int) -> dict:
    return {
        "wger_id": wger_id,
        "nombre": nombre,
        "nombre_normalizado": normalizar(nombre),
        "licencia": "CC-BY-SA 4",
        "autor": "autor",
    }


@pytest.fixture
def catalogo(conn) -> dict[str, int]:
    """Catálogo base pequeño. Devuelve {nombre: id}."""
    nombres = ["Press de banca", "Press militar", "Sentadilla", "Peso muerto", "Remo con barra"]
    insertar_base(conn, [base(n, i) for i, n in enumerate(nombres, start=1)])
    rows = conn.execute("SELECT nombre, id FROM ejercicios").fetchall()
    return dict(rows)


@pytest.fixture(autouse=True)
def entorno(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DB)
    monkeypatch.setenv("SESSION_SECRET", SECRETO)
    monkeypatch.setenv("INVITE_CODE", CODIGO)


@pytest.fixture
def client(conn):
    """Cliente sin sesión."""
    return TestClient(app)


def registrar(client: TestClient, nombre: str, password: str = PASSWORD):
    return client.post(
        "/auth/registro",
        json={"nombre_usuario": nombre, "password": password, "codigo_invitacion": CODIGO},
    )


@pytest.fixture
def ana(conn):
    """Cliente con la sesión de «ana» iniciada."""
    c = TestClient(app)
    assert registrar(c, "ana").status_code == 201
    return c


@pytest.fixture
def bea(conn):
    c = TestClient(app)
    assert registrar(c, "bea").status_code == 201
    return c
