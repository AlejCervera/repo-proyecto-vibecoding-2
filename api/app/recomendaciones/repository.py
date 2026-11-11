"""Lee de la base de datos lo que necesita el contexto de las recomendaciones."""

import psycopg

from app.recomendaciones.contexto import SESIONES_HISTORIAL, Sesion, agrupar_sesiones


def historial(
    conn: psycopg.Connection, usuario_id: int, ejercicio_ids: list[int]
) -> dict[int, tuple[Sesion, ...]]:
    """Las últimas sesiones (días) de cada ejercicio, con todas sus series."""
    if not ejercicio_ids:
        return {}
    rows = conn.execute(
        "SELECT ejercicio_id, fecha, peso_kg, repeticiones FROM ("
        "  SELECT s.*, dense_rank() OVER (PARTITION BY s.ejercicio_id ORDER BY s.fecha DESC) AS n"
        "  FROM series s WHERE s.usuario_id = %s AND s.ejercicio_id = ANY(%s)"
        ") t WHERE n <= %s ORDER BY ejercicio_id, fecha DESC, id",
        (usuario_id, ejercicio_ids, SESIONES_HISTORIAL),
    ).fetchall()
    return agrupar_sesiones([(e, f.isoformat(), float(p), r) for e, f, p, r in rows])


def catalogo(conn: psycopg.Connection, usuario_id: int) -> tuple[tuple[int, str], ...]:
    """Catálogo base y ejercicios propios del usuario."""
    rows = conn.execute(
        "SELECT id, nombre FROM ejercicios WHERE usuario_id IS NULL OR usuario_id = %s "
        "ORDER BY nombre_normalizado, id",
        (usuario_id,),
    ).fetchall()
    return tuple((i, n) for i, n in rows)
