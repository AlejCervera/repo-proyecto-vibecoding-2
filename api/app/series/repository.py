"""Acceso a la tabla series. Todas las consultas van filtradas por usuario."""

from typing import Any

import psycopg

from app.series.validation import NuevaSerie

_COLUMNAS = "id, fecha, ejercicio, peso_kg, repeticiones"


def _a_dict(row: tuple) -> dict[str, Any]:
    id_, fecha, ejercicio, peso, reps = row
    return {
        "id": id_,
        "fecha": fecha.isoformat(),
        "ejercicio": ejercicio,
        "peso_kg": float(peso),
        "repeticiones": reps,
    }


def crear(conn: psycopg.Connection, usuario_id: int, serie: NuevaSerie) -> dict[str, Any]:
    row = conn.execute(
        f"INSERT INTO series (usuario_id, fecha, ejercicio, peso_kg, repeticiones) "
        f"VALUES (%s, %s, %s, %s, %s) RETURNING {_COLUMNAS}",
        (usuario_id, serie.fecha, serie.ejercicio, serie.peso_kg, serie.repeticiones),
    ).fetchone()
    return _a_dict(row)


def listar(conn: psycopg.Connection, usuario_id: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        f"SELECT {_COLUMNAS} FROM series WHERE usuario_id = %s ORDER BY fecha DESC, id DESC",
        (usuario_id,),
    ).fetchall()
    return [_a_dict(r) for r in rows]
