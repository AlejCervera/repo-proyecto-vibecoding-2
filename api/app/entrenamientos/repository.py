"""Acceso a la tabla entrenamientos. Todo filtrado por usuario."""

from datetime import date
from typing import Any

import psycopg

from app.series.repository import SELECT_SERIES, serie_a_dict


def crear(
    conn: psycopg.Connection, usuario_id: int, rutina_id: int, rutina_nombre: str, fecha: date
) -> tuple[int, bool] | None:
    """Guarda en el diario las series de ese día de los ejercicios de la rutina que aún no estén
    en ningún entrenamiento. Si ese día ya hay un entrenamiento de esta rutina, se añaden a él
    (al terminar el entreno se guarda solo y se puede terminar varias veces).

    Devuelve (id, nuevo): nuevo=False si se reutilizó el que ya había. None si no hay nada que
    guardar ni un entrenamiento previo de ese día (y no se crea nada)."""
    with conn.transaction():
        existente = conn.execute(
            "SELECT id FROM entrenamientos WHERE usuario_id = %s AND fecha = %s AND rutina_id = %s "
            "ORDER BY id LIMIT 1",
            (usuario_id, fecha, rutina_id),
        ).fetchone()
        if existente:
            entrenamiento_id = existente[0]
        else:
            (entrenamiento_id,) = conn.execute(
                "INSERT INTO entrenamientos (usuario_id, fecha, rutina_id, rutina_nombre) "
                "VALUES (%s, %s, %s, %s) RETURNING id",
                (usuario_id, fecha, rutina_id, rutina_nombre),
            ).fetchone()
        cur = conn.execute(
            "UPDATE series SET entrenamiento_id = %(e)s "
            "WHERE usuario_id = %(u)s AND fecha = %(f)s AND entrenamiento_id IS NULL "
            "AND ejercicio_id IN (SELECT ejercicio_id FROM rutina_ejercicios WHERE rutina_id = %(r)s)",
            {"e": entrenamiento_id, "u": usuario_id, "f": fecha, "r": rutina_id},
        )
        if existente:
            return entrenamiento_id, False
        if cur.rowcount == 0:
            conn.execute("DELETE FROM entrenamientos WHERE id = %s", (entrenamiento_id,))
            return None
    return entrenamiento_id, True


def listar(conn: psycopg.Connection, usuario_id: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT t.id, t.fecha, t.rutina_id, t.rutina_nombre, "
        "       count(s.id), count(DISTINCT s.ejercicio_id) "
        "FROM entrenamientos t LEFT JOIN series s ON s.entrenamiento_id = t.id "
        "WHERE t.usuario_id = %s GROUP BY t.id ORDER BY t.fecha DESC, t.id DESC",
        (usuario_id,),
    ).fetchall()
    return [
        {
            "id": r[0],
            "fecha": r[1].isoformat(),
            "rutina_id": r[2],
            "rutina_nombre": r[3],
            "num_series": r[4],
            "num_ejercicios": r[5],
        }
        for r in rows
    ]


def obtener(
    conn: psycopg.Connection, usuario_id: int, entrenamiento_id: int
) -> tuple[dict[str, Any], list[dict[str, Any]]] | None:
    """El entrenamiento y sus series, o None si no es del usuario."""
    row = conn.execute(
        "SELECT id, fecha, rutina_id, rutina_nombre FROM entrenamientos "
        "WHERE id = %s AND usuario_id = %s",
        (entrenamiento_id, usuario_id),
    ).fetchone()
    if row is None:
        return None
    series = conn.execute(
        SELECT_SERIES + "WHERE s.entrenamiento_id = %s ORDER BY s.id", (entrenamiento_id,)
    ).fetchall()
    cabecera = {
        "id": row[0],
        "fecha": row[1].isoformat(),
        "rutina_id": row[2],
        "rutina_nombre": row[3],
    }
    return cabecera, [serie_a_dict(s) for s in series]


def quitar(conn: psycopg.Connection, usuario_id: int, entrenamiento_id: int) -> bool:
    """Lo quita del diario; sus series se quedan (ON DELETE SET NULL)."""
    cur = conn.execute(
        "DELETE FROM entrenamientos WHERE id = %s AND usuario_id = %s",
        (entrenamiento_id, usuario_id),
    )
    return cur.rowcount == 1
