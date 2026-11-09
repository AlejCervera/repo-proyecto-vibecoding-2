"""Acceso a la tabla series. Todas las consultas van filtradas por usuario."""

from typing import Any

import psycopg

from app.series.validation import NuevaSerie

_SELECT = (
    "SELECT s.id, s.fecha, s.ejercicio_id, e.nombre, s.peso_kg, s.repeticiones "
    "FROM series s JOIN ejercicios e ON e.id = s.ejercicio_id "
)


def _a_dict(row: tuple) -> dict[str, Any]:
    id_, fecha, ejercicio_id, ejercicio, peso, reps = row
    return {
        "id": id_,
        "fecha": fecha.isoformat(),
        "ejercicio_id": ejercicio_id,
        "ejercicio": ejercicio,
        "peso_kg": float(peso),
        "repeticiones": reps,
    }


def crear(conn: psycopg.Connection, usuario_id: int, serie: NuevaSerie) -> dict[str, Any]:
    (nuevo_id,) = conn.execute(
        "INSERT INTO series (usuario_id, fecha, ejercicio_id, peso_kg, repeticiones) "
        "VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (usuario_id, serie.fecha, serie.ejercicio_id, serie.peso_kg, serie.repeticiones),
    ).fetchone()
    return _a_dict(conn.execute(_SELECT + "WHERE s.id = %s", (nuevo_id,)).fetchone())


def listar(conn: psycopg.Connection, usuario_id: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        _SELECT + "WHERE s.usuario_id = %s ORDER BY s.fecha DESC, s.id DESC", (usuario_id,)
    ).fetchall()
    return [_a_dict(r) for r in rows]
