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


# Para otros módulos que leen series (p. ej. el diario de entrenamientos).
SELECT_SERIES = _SELECT
serie_a_dict = _a_dict


def crear(conn: psycopg.Connection, usuario_id: int, serie: NuevaSerie) -> dict[str, Any]:
    (nuevo_id,) = conn.execute(
        "INSERT INTO series (usuario_id, fecha, ejercicio_id, peso_kg, repeticiones) "
        "VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (usuario_id, serie.fecha, serie.ejercicio_id, serie.peso_kg, serie.repeticiones),
    ).fetchone()
    return _a_dict(conn.execute(_SELECT + "WHERE s.id = %s", (nuevo_id,)).fetchone())


def actualizar(
    conn: psycopg.Connection, usuario_id: int, serie_id: int, serie: NuevaSerie
) -> dict[str, Any] | None:
    """None si la serie no existe o no es del usuario."""
    row = conn.execute(
        "UPDATE series SET fecha = %s, ejercicio_id = %s, peso_kg = %s, repeticiones = %s "
        "WHERE id = %s AND usuario_id = %s RETURNING id",
        (serie.fecha, serie.ejercicio_id, serie.peso_kg, serie.repeticiones, serie_id, usuario_id),
    ).fetchone()
    if row is None:
        return None
    return _a_dict(conn.execute(_SELECT + "WHERE s.id = %s", (serie_id,)).fetchone())


def borrar(conn: psycopg.Connection, usuario_id: int, serie_id: int) -> bool:
    cur = conn.execute(
        "DELETE FROM series WHERE id = %s AND usuario_id = %s", (serie_id, usuario_id)
    )
    return cur.rowcount == 1


def listar_por_ejercicio(
    conn: psycopg.Connection, usuario_id: int, ejercicio_id: int
) -> list[dict[str, Any]]:
    rows = conn.execute(
        _SELECT + "WHERE s.usuario_id = %s AND s.ejercicio_id = %s "
        "ORDER BY s.fecha DESC, s.id DESC",
        (usuario_id, ejercicio_id),
    ).fetchall()
    return [_a_dict(r) for r in rows]


def listar(conn: psycopg.Connection, usuario_id: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        _SELECT + "WHERE s.usuario_id = %s ORDER BY s.fecha DESC, s.id DESC", (usuario_id,)
    ).fetchall()
    return [_a_dict(r) for r in rows]
