"""Fase 9e3: las peticiones reutilizan conexiones a Postgres en vez de abrir una nueva cada vez."""

import psycopg
import pytest

from app import db
from tests.conftest import TEST_DB


@pytest.fixture
def entorno_db(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DB)
    yield
    db.cerrar()


def pid() -> int:
    with db.connect() as c:
        return c.execute("SELECT pg_backend_pid()").fetchone()[0]


def test_reutiliza_la_conexion(entorno_db):
    assert pid() == pid()


def test_confirma_al_salir_y_deshace_si_hay_error(entorno_db):
    with db.connect() as c:
        c.execute("CREATE TABLE IF NOT EXISTS prueba_pool (n int)")
        c.execute("TRUNCATE prueba_pool")
        c.execute("INSERT INTO prueba_pool VALUES (1)")
    with pytest.raises(RuntimeError), db.connect() as c:
        c.execute("INSERT INTO prueba_pool VALUES (2)")
        raise RuntimeError("fallo a mitad")
    with psycopg.connect(TEST_DB) as otra:
        assert otra.execute("SELECT n FROM prueba_pool").fetchall() == [(1,)]
        otra.execute("DROP TABLE prueba_pool")


def test_se_recupera_si_la_base_de_datos_corta_la_conexion(entorno_db):
    # En Neon, la base de datos se duerme y corta las conexiones abiertas
    viejo = pid()
    with psycopg.connect(TEST_DB, autocommit=True) as admin:
        admin.execute("SELECT pg_terminate_backend(%s)", (viejo,))
    with db.connect() as c:
        assert c.execute("SELECT 1").fetchone() == (1,)


def test_otra_url_usa_otro_pool(entorno_db, monkeypatch):
    primero = pid()
    monkeypatch.setenv("DATABASE_URL", TEST_DB + "?application_name=otra")
    assert pid() != primero
