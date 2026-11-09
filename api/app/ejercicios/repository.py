"""Acceso a la tabla ejercicios. Un usuario ve el catálogo base y sus propios ejercicios."""

from typing import Any

import psycopg

_VISIBLE = "(usuario_id IS NULL OR usuario_id = %(usuario)s)"
_COLUMNAS = "id, nombre, usuario_id IS NOT NULL AS propio"


def _a_dict(row: tuple | None) -> dict[str, Any] | None:
    return {"id": row[0], "nombre": row[1], "propio": row[2]} if row else None


def buscar(
    conn: psycopg.Connection, usuario_id: int, texto_normalizado: str, limite: int = 20
) -> list[dict[str, Any]]:
    """Los que contienen el texto; primero los que empiezan por él, luego por orden alfabético."""
    rows = conn.execute(
        f"SELECT {_COLUMNAS} FROM ejercicios "
        f"WHERE {_VISIBLE} AND position(%(q)s IN nombre_normalizado) > 0 "
        "ORDER BY position(%(q)s IN nombre_normalizado) = 1 DESC, nombre_normalizado, id "
        "LIMIT %(limite)s",
        {"usuario": usuario_id, "q": texto_normalizado, "limite": limite},
    ).fetchall()
    return [_a_dict(r) for r in rows]


def duplicado(
    conn: psycopg.Connection, usuario_id: int, normalizado: str
) -> dict[str, Any] | None:
    """Ejercicio visible con el mismo nombre normalizado (primero el propio)."""
    row = conn.execute(
        f"SELECT {_COLUMNAS} FROM ejercicios "
        f"WHERE {_VISIBLE} AND nombre_normalizado = %(norm)s "
        "ORDER BY usuario_id IS NULL LIMIT 1",
        {"usuario": usuario_id, "norm": normalizado},
    ).fetchone()
    return _a_dict(row)


def crear_propio(
    conn: psycopg.Connection, usuario_id: int, nombre: str, normalizado: str
) -> dict[str, Any] | None:
    """Devuelve el ejercicio creado, o None si ya existía uno propio igual."""
    row = conn.execute(
        "INSERT INTO ejercicios (nombre, nombre_normalizado, usuario_id) VALUES (%s, %s, %s) "
        f"ON CONFLICT DO NOTHING RETURNING {_COLUMNAS}",
        (nombre, normalizado, usuario_id),
    ).fetchone()
    return _a_dict(row)


def visible(conn: psycopg.Connection, usuario_id: int, ejercicio_id: int) -> bool:
    row = conn.execute(
        f"SELECT 1 FROM ejercicios WHERE id = %(id)s AND {_VISIBLE}",
        {"id": ejercicio_id, "usuario": usuario_id},
    ).fetchone()
    return row is not None


def insertar_base(conn: psycopg.Connection, ejercicios: list[dict[str, Any]]) -> int:
    """Inserta en el catálogo base los que no existan (por wger_id o por nombre). Devuelve cuántos."""
    nuevos = 0
    for e in ejercicios:
        cur = conn.execute(
            "INSERT INTO ejercicios (nombre, nombre_normalizado, wger_id, licencia, autor) "
            "VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
            (e["nombre"], e["nombre_normalizado"], e["wger_id"], e["licencia"], e["autor"]),
        )
        nuevos += cur.rowcount
    return nuevos
