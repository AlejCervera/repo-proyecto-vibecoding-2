"""Acceso a rutinas y rutina_ejercicios. Un usuario ve las predefinidas y las suyas."""

from typing import Any, Literal

import psycopg

from app.rutinas.logica import Plan

_VISIBLE = "(r.usuario_id IS NULL OR r.usuario_id = %(usuario)s)"


def _ejercicios(conn: psycopg.Connection, rutina_ids: list[int]) -> dict[int, list[dict]]:
    por_rutina: dict[int, list[dict]] = {i: [] for i in rutina_ids}
    if not rutina_ids:
        return por_rutina
    rows = conn.execute(
        "SELECT re.rutina_id, e.id, e.nombre, re.series, re.reps_min, re.reps_max "
        "FROM rutina_ejercicios re JOIN ejercicios e ON e.id = re.ejercicio_id "
        "WHERE re.rutina_id = ANY(%s) ORDER BY re.rutina_id, re.posicion, e.id",
        (rutina_ids,),
    ).fetchall()
    for rutina_id, ejercicio_id, nombre, series, reps_min, reps_max in rows:
        por_rutina[rutina_id].append(
            {
                "id": ejercicio_id,
                "nombre": nombre,
                "series": series,
                "reps_min": reps_min,
                "reps_max": reps_max,
            }
        )
    return por_rutina


def _con_ejercicios(conn: psycopg.Connection, rows: list[tuple]) -> list[dict[str, Any]]:
    ejercicios = _ejercicios(conn, [r[0] for r in rows])
    return [
        {"id": r[0], "nombre": r[1], "predefinida": r[2], "ejercicios": ejercicios[r[0]]}
        for r in rows
    ]


def listar(conn: psycopg.Connection, usuario_id: int) -> list[dict[str, Any]]:
    """Primero las predefinidas (en su orden), luego las propias por nombre."""
    rows = conn.execute(
        "SELECT r.id, r.nombre, r.usuario_id IS NULL FROM rutinas r "
        f"WHERE {_VISIBLE} "
        "ORDER BY r.usuario_id IS NOT NULL, "
        "CASE WHEN r.usuario_id IS NULL THEN r.id END, r.nombre_normalizado, r.id",
        {"usuario": usuario_id},
    ).fetchall()
    return _con_ejercicios(conn, rows)


def obtener(conn: psycopg.Connection, usuario_id: int, rutina_id: int) -> dict[str, Any] | None:
    rows = conn.execute(
        f"SELECT r.id, r.nombre, r.usuario_id IS NULL FROM rutinas r "
        f"WHERE r.id = %(id)s AND {_VISIBLE}",
        {"id": rutina_id, "usuario": usuario_id},
    ).fetchall()
    return _con_ejercicios(conn, rows)[0] if rows else None


def tipo(
    conn: psycopg.Connection, usuario_id: int, rutina_id: int
) -> Literal["propia", "predefinida"] | None:
    row = conn.execute(
        f"SELECT r.usuario_id IS NULL FROM rutinas r WHERE r.id = %(id)s AND {_VISIBLE}",
        {"id": rutina_id, "usuario": usuario_id},
    ).fetchone()
    if row is None:
        return None
    return "predefinida" if row[0] else "propia"


def nombres_propios(conn: psycopg.Connection, usuario_id: int) -> set[str]:
    rows = conn.execute(
        "SELECT nombre_normalizado FROM rutinas WHERE usuario_id = %s", (usuario_id,)
    ).fetchall()
    return {r[0] for r in rows}


def crear(conn: psycopg.Connection, usuario_id: int, nombre: str, norm: str) -> int | None:
    """Id de la rutina nueva, o None si ya tiene una con ese nombre."""
    row = conn.execute(
        "INSERT INTO rutinas (nombre, nombre_normalizado, usuario_id) VALUES (%s, %s, %s) "
        "ON CONFLICT DO NOTHING RETURNING id",
        (nombre, norm, usuario_id),
    ).fetchone()
    return row[0] if row else None


def renombrar(conn: psycopg.Connection, rutina_id: int, nombre: str, norm: str) -> bool:
    try:
        with conn.transaction():
            conn.execute(
                "UPDATE rutinas SET nombre = %s, nombre_normalizado = %s WHERE id = %s",
                (nombre, norm, rutina_id),
            )
    except psycopg.errors.UniqueViolation:
        return False
    return True


def borrar(conn: psycopg.Connection, rutina_id: int) -> None:
    conn.execute("DELETE FROM rutinas WHERE id = %s", (rutina_id,))


def ids_ejercicios(conn: psycopg.Connection, rutina_id: int) -> list[int]:
    rows = conn.execute(
        "SELECT ejercicio_id FROM rutina_ejercicios WHERE rutina_id = %s "
        "ORDER BY posicion, ejercicio_id",
        (rutina_id,),
    ).fetchall()
    return [r[0] for r in rows]


def anadir_ejercicio(
    conn: psycopg.Connection, rutina_id: int, ejercicio_id: int, plan: Plan
) -> bool:
    """Lo añade al final. False si ya estaba."""
    cur = conn.execute(
        "INSERT INTO rutina_ejercicios "
        "(rutina_id, ejercicio_id, posicion, series, reps_min, reps_max) "
        "SELECT %(r)s, %(e)s, coalesce(max(posicion), 0) + 1, %(s)s, %(min)s, %(max)s "
        "FROM rutina_ejercicios WHERE rutina_id = %(r)s ON CONFLICT DO NOTHING",
        {
            "r": rutina_id,
            "e": ejercicio_id,
            "s": plan.series,
            "min": plan.reps_min,
            "max": plan.reps_max,
        },
    )
    return cur.rowcount == 1


def plan_de(conn: psycopg.Connection, rutina_id: int, ejercicio_id: int) -> Plan | None:
    row = conn.execute(
        "SELECT series, reps_min, reps_max FROM rutina_ejercicios "
        "WHERE rutina_id = %s AND ejercicio_id = %s",
        (rutina_id, ejercicio_id),
    ).fetchone()
    return Plan(*row) if row else None


def configurar_ejercicio(
    conn: psycopg.Connection, rutina_id: int, ejercicio_id: int, plan: Plan
) -> None:
    conn.execute(
        "UPDATE rutina_ejercicios SET series = %s, reps_min = %s, reps_max = %s "
        "WHERE rutina_id = %s AND ejercicio_id = %s",
        (plan.series, plan.reps_min, plan.reps_max, rutina_id, ejercicio_id),
    )


def reordenar(conn: psycopg.Connection, rutina_id: int, ejercicio_ids: list[int]) -> None:
    """Cambia solo el orden; conserva series y objetivos."""
    with conn.transaction():
        for posicion, ejercicio_id in enumerate(ejercicio_ids, start=1):
            conn.execute(
                "UPDATE rutina_ejercicios SET posicion = %s "
                "WHERE rutina_id = %s AND ejercicio_id = %s",
                (posicion, rutina_id, ejercicio_id),
            )


def quitar_ejercicio(conn: psycopg.Connection, rutina_id: int, ejercicio_id: int) -> bool:
    cur = conn.execute(
        "DELETE FROM rutina_ejercicios WHERE rutina_id = %s AND ejercicio_id = %s",
        (rutina_id, ejercicio_id),
    )
    return cur.rowcount == 1


def poner_ejercicios(
    conn: psycopg.Connection, rutina_id: int, ejercicios: list[tuple[int, Plan]]
) -> None:
    """Sustituye la lista entera (ejercicio y su plan), en este orden."""
    with conn.transaction():
        conn.execute("DELETE FROM rutina_ejercicios WHERE rutina_id = %s", (rutina_id,))
        for posicion, (ejercicio_id, plan) in enumerate(ejercicios, start=1):
            conn.execute(
                "INSERT INTO rutina_ejercicios "
                "(rutina_id, ejercicio_id, posicion, series, reps_min, reps_max) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (rutina_id, ejercicio_id, posicion, plan.series, plan.reps_min, plan.reps_max),
            )


def ids_por_wger(conn: psycopg.Connection, wger_ids: list[int]) -> dict[int, int]:
    rows = conn.execute(
        "SELECT wger_id, id FROM ejercicios WHERE usuario_id IS NULL AND wger_id = ANY(%s)",
        (wger_ids,),
    ).fetchall()
    return dict(rows)


def guardar_predefinida(conn: psycopg.Connection, clave: str, nombre: str, norm: str) -> int:
    (rutina_id,) = conn.execute(
        "INSERT INTO rutinas (nombre, nombre_normalizado, clave) VALUES (%s, %s, %s) "
        "ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, "
        "nombre_normalizado = EXCLUDED.nombre_normalizado RETURNING id",
        (nombre, norm, clave),
    ).fetchone()
    return rutina_id
