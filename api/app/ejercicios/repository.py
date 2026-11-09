"""Acceso a la tabla ejercicios. Un usuario ve el catálogo base y sus propios ejercicios."""

from typing import Any

import psycopg

_VISIBLE = "(e.usuario_id IS NULL OR e.usuario_id = %(usuario)s)"

# Cada ejercicio con la imagen que ve el usuario: la suya o, si no, la de ejemplo de wger.
_SELECT = (
    "SELECT e.id, e.nombre, e.usuario_id IS NOT NULL AS propio, "
    "       i.usuario_id IS NOT NULL AS imagen_propia, i.id IS NOT NULL AS hay_imagen, "
    "       i.autor, i.licencia "
    "FROM ejercicios e "
    "LEFT JOIN LATERAL ("
    "  SELECT id, usuario_id, autor, licencia FROM imagenes "
    "  WHERE ejercicio_id = e.id AND (usuario_id = %(usuario)s OR usuario_id IS NULL) "
    "  ORDER BY usuario_id IS NULL LIMIT 1"
    ") i ON true "
)


def _imagen(hay: bool, propia: bool, autor: str | None, licencia: str | None) -> dict | None:
    if not hay:
        return None
    if propia:
        return {"origen": "propia"}
    return {"origen": "wger", "autor": autor, "licencia": licencia}


def _a_dict(row: tuple | None) -> dict[str, Any] | None:
    if not row:
        return None
    id_, nombre, propio, imagen_propia, hay_imagen, autor, licencia = row
    return {
        "id": id_,
        "nombre": nombre,
        "propio": propio,
        "imagen": _imagen(hay_imagen, imagen_propia, autor, licencia),
    }


def buscar(
    conn: psycopg.Connection, usuario_id: int, texto_normalizado: str, limite: int = 20
) -> list[dict[str, Any]]:
    """Los que contienen el texto; primero los que empiezan por él, luego por orden alfabético."""
    rows = conn.execute(
        _SELECT + f"WHERE {_VISIBLE} AND position(%(q)s IN e.nombre_normalizado) > 0 "
        "ORDER BY position(%(q)s IN e.nombre_normalizado) = 1 DESC, e.nombre_normalizado, e.id "
        "LIMIT %(limite)s",
        {"usuario": usuario_id, "q": texto_normalizado, "limite": limite},
    ).fetchall()
    return [_a_dict(r) for r in rows]


def duplicado(
    conn: psycopg.Connection, usuario_id: int, normalizado: str
) -> dict[str, Any] | None:
    """Ejercicio visible con el mismo nombre normalizado (primero el propio)."""
    row = conn.execute(
        _SELECT + f"WHERE {_VISIBLE} AND e.nombre_normalizado = %(norm)s "
        "ORDER BY e.usuario_id IS NULL LIMIT 1",
        {"usuario": usuario_id, "norm": normalizado},
    ).fetchone()
    return _a_dict(row)


def obtener(conn: psycopg.Connection, usuario_id: int, ejercicio_id: int) -> dict[str, Any] | None:
    """El ejercicio con su imagen, si el usuario puede verlo."""
    row = conn.execute(
        _SELECT + f"WHERE e.id = %(id)s AND {_VISIBLE}",
        {"usuario": usuario_id, "id": ejercicio_id},
    ).fetchone()
    return _a_dict(row)


def crear_propio(
    conn: psycopg.Connection, usuario_id: int, nombre: str, normalizado: str
) -> dict[str, Any] | None:
    """Devuelve el ejercicio creado, o None si ya existía uno propio igual."""
    row = conn.execute(
        "INSERT INTO ejercicios (nombre, nombre_normalizado, usuario_id) VALUES (%s, %s, %s) "
        "ON CONFLICT DO NOTHING RETURNING id, nombre",
        (nombre, normalizado, usuario_id),
    ).fetchone()
    return {"id": row[0], "nombre": row[1], "propio": True, "imagen": None} if row else None


def visible(conn: psycopg.Connection, usuario_id: int, ejercicio_id: int) -> bool:
    row = conn.execute(
        f"SELECT 1 FROM ejercicios e WHERE e.id = %(id)s AND {_VISIBLE}",
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
