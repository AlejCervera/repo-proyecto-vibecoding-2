"""Fase 9f: la bienvenida sale una vez a las cuentas nuevas y se recuerda en el servidor."""

import shutil

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.migrate import MIGRATIONS_DIR, migrate
from tests.conftest import CODIGO, PASSWORD, TEST_DB

DB_TEMPORAL = "gymlog_bienvenida_test"


def registrar(client: TestClient, nombre: str):
    return client.post(
        "/auth/registro",
        json={"nombre_usuario": nombre, "password": PASSWORD, "codigo_invitacion": CODIGO},
    )


def test_una_cuenta_nueva_no_ha_visto_la_bienvenida(entorno, conn):
    client = TestClient(app)
    r = registrar(client, "ana")
    assert r.status_code == 201
    assert r.json()["bienvenida_vista"] is False
    assert client.get("/auth/yo").json()["bienvenida_vista"] is False


def test_al_terminarla_queda_vista_tambien_al_volver_a_entrar(entorno, conn):
    client = TestClient(app)
    registrar(client, "ana")
    assert client.put("/perfil/bienvenida").status_code == 204
    assert client.get("/auth/yo").json()["bienvenida_vista"] is True

    otro_movil = TestClient(app)
    r = otro_movil.post("/auth/login", json={"nombre_usuario": "ana", "password": PASSWORD})
    assert r.json()["bienvenida_vista"] is True


def test_marcarla_solo_afecta_a_tu_cuenta(entorno, conn):
    ana, bea = TestClient(app), TestClient(app)
    registrar(ana, "ana")
    registrar(bea, "bea")
    ana.put("/perfil/bienvenida")
    assert bea.get("/auth/yo").json()["bienvenida_vista"] is False


def test_sin_sesion_no_se_puede_marcar(entorno, conn):
    assert TestClient(app).put("/perfil/bienvenida").status_code == 401


@pytest.fixture
def db_vacia():
    url = TEST_DB.rsplit("/", 1)[0] + "/" + DB_TEMPORAL
    with psycopg.connect(TEST_DB, autocommit=True) as admin:
        admin.execute(f"DROP DATABASE IF EXISTS {DB_TEMPORAL}")
        admin.execute(f"CREATE DATABASE {DB_TEMPORAL}")
    with psycopg.connect(url, autocommit=True) as c:
        yield c
    with psycopg.connect(TEST_DB, autocommit=True) as admin:
        admin.execute(f"DROP DATABASE IF EXISTS {DB_TEMPORAL} WITH (FORCE)")


def test_la_migracion_da_por_vista_la_bienvenida_a_las_cuentas_que_ya_existian(db_vacia, tmp_path):
    for f in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if f.name < "010":
            shutil.copy(f, tmp_path / f.name)
    migrate(db_vacia, tmp_path)
    db_vacia.execute("INSERT INTO usuarios (nombre_usuario, password_hash) VALUES ('antigua', 'x')")

    migrate(db_vacia)  # aplica la 010
    db_vacia.execute("INSERT INTO usuarios (nombre_usuario, password_hash) VALUES ('nueva', 'x')")
    filas = dict(db_vacia.execute("SELECT nombre_usuario, bienvenida_vista FROM usuarios").fetchall())
    assert filas == {"antigua": True, "nueva": False}
