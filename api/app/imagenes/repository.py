"""Acceso a la tabla imagenes."""

import psycopg


def guardar_wger(
    conn: psycopg.Connection,
    ejercicio_id: int,
    tipo: str,
    contenido: bytes,
    licencia: str | None,
    autor: str | None,
    wger_id: int,
) -> bool:
    """Guarda la imagen de ejemplo. False si el ejercicio ya tenía una."""
    cur = conn.execute(
        "INSERT INTO imagenes (ejercicio_id, tipo, contenido, licencia, autor, wger_id) "
        "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
        (ejercicio_id, tipo, contenido, licencia, autor, wger_id),
    )
    return cur.rowcount == 1


def ejercicios_sin_imagen_wger(conn: psycopg.Connection) -> dict[int, int]:
    """{wger_id del ejercicio: id local} de los ejercicios del catálogo sin imagen de ejemplo."""
    rows = conn.execute(
        "SELECT e.wger_id, e.id FROM ejercicios e "
        "WHERE e.wger_id IS NOT NULL AND NOT EXISTS "
        "(SELECT 1 FROM imagenes i WHERE i.ejercicio_id = e.id AND i.usuario_id IS NULL)"
    ).fetchall()
    return dict(rows)


def tiene_imagen_wger(conn: psycopg.Connection, ejercicio_id: int) -> bool:
    row = conn.execute(
        "SELECT 1 FROM imagenes WHERE ejercicio_id = %s AND usuario_id IS NULL", (ejercicio_id,)
    ).fetchone()
    return row is not None


def guardar_propia(
    conn: psycopg.Connection, ejercicio_id: int, usuario_id: int, tipo: str, contenido: bytes
) -> None:
    """Guarda la imagen del usuario; si ya tenía una para ese ejercicio, la sustituye."""
    conn.execute(
        "INSERT INTO imagenes (ejercicio_id, usuario_id, tipo, contenido) VALUES (%s, %s, %s, %s) "
        "ON CONFLICT (ejercicio_id, usuario_id) WHERE usuario_id IS NOT NULL "
        "DO UPDATE SET tipo = EXCLUDED.tipo, contenido = EXCLUDED.contenido, creada_en = now()",
        (ejercicio_id, usuario_id, tipo, contenido),
    )


def obtener(
    conn: psycopg.Connection, ejercicio_id: int, usuario_id: int
) -> tuple[str, bytes] | None:
    """La imagen que ve el usuario: la suya o, si no tiene, la de ejemplo."""
    row = conn.execute(
        "SELECT tipo, contenido FROM imagenes "
        "WHERE ejercicio_id = %s AND (usuario_id = %s OR usuario_id IS NULL) "
        "ORDER BY usuario_id IS NULL LIMIT 1",
        (ejercicio_id, usuario_id),
    ).fetchone()
    return (row[0], bytes(row[1])) if row else None
