"""La migración 003 convierte las series con ejercicio en texto en ejercicios propios."""

import shutil

import psycopg
import pytest

from app.migrate import MIGRATIONS_DIR, migrate
from tests.conftest import TEST_DB

DB_TEMPORAL = "gymlog_migracion_test"


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


def test_series_existentes_pasan_a_ejercicios_propios(db_vacia, tmp_path):
    for nombre in ["001_crear_series.sql", "002_cuentas.sql"]:
        shutil.copy(MIGRATIONS_DIR / nombre, tmp_path / nombre)
    migrate(db_vacia, tmp_path)

    db_vacia.execute(
        "INSERT INTO usuarios (nombre_usuario, password_hash) VALUES ('ana', 'x'), ('bea', 'x')"
    )
    for usuario, ejercicio in [
        (1, "Press banca"),
        (1, "press  BÁNCA "),
        (1, "Sentadilla"),
        (2, "Press banca"),
    ]:
        db_vacia.execute(
            "INSERT INTO series (usuario_id, fecha, ejercicio, peso_kg, repeticiones) "
            "VALUES (%s, '2026-11-01', %s, 80, 8)",
            (usuario, ejercicio),
        )

    # Solo hasta la 003: las posteriores (p. ej. la 007 borra las series de prueba) no aplican aquí.
    shutil.copy(MIGRATIONS_DIR / "003_ejercicios.sql", tmp_path / "003_ejercicios.sql")
    assert migrate(db_vacia, tmp_path) == ["003_ejercicios"]

    ejercicios = db_vacia.execute(
        "SELECT usuario_id, nombre, nombre_normalizado FROM ejercicios ORDER BY usuario_id, id"
    ).fetchall()
    assert sorted(ejercicios) == [
        (1, "Press banca", "press banca"),
        (1, "Sentadilla", "sentadilla"),
        (2, "Press banca", "press banca"),
    ]
    series = db_vacia.execute(
        "SELECT s.usuario_id, e.nombre FROM series s JOIN ejercicios e ON e.id = s.ejercicio_id "
        "ORDER BY s.id"
    ).fetchall()
    assert series == [
        (1, "Press banca"),
        (1, "Press banca"),
        (1, "Sentadilla"),
        (2, "Press banca"),
    ]
