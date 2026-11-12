"""Acceso a plan_semanal y plan_dias. Todo filtrado por usuario."""

from datetime import date
from typing import Any

import psycopg

from app.plan.logica import DIAS_SEMANA


def _rutina(rid: int | None, nombre: str | None) -> dict[str, Any] | None:
    return None if rid is None else {"id": rid, "nombre": nombre}


def leer_semana(conn: psycopg.Connection, usuario_id: int) -> list[dict[str, Any] | None]:
    """Los 7 días (lunes … domingo): la rutina de cada uno o None si es descanso."""
    rows = conn.execute(
        "SELECT p.dia, r.id, r.nombre FROM plan_semanal p JOIN rutinas r ON r.id = p.rutina_id "
        "WHERE p.usuario_id = %s",
        (usuario_id,),
    ).fetchall()
    semana: list[dict[str, Any] | None] = [None] * DIAS_SEMANA
    for dia, rid, nombre in rows:
        semana[dia] = _rutina(rid, nombre)
    return semana


def guardar_semana(conn: psycopg.Connection, usuario_id: int, dias: list[int | None]) -> None:
    with conn.transaction():
        conn.execute("DELETE FROM plan_semanal WHERE usuario_id = %s", (usuario_id,))
        for dia, rid in enumerate(dias):
            if rid is not None:
                conn.execute(
                    "INSERT INTO plan_semanal (usuario_id, dia, rutina_id) VALUES (%s, %s, %s)",
                    (usuario_id, dia, rid),
                )


def leer_dias(
    conn: psycopg.Connection, usuario_id: int, desde: date, hasta: date
) -> list[dict[str, Any]]:
    """Cambios de días concretos en el rango, por fecha. rutina None = descanso ese día."""
    rows = conn.execute(
        "SELECT d.fecha, r.id, r.nombre FROM plan_dias d LEFT JOIN rutinas r ON r.id = d.rutina_id "
        "WHERE d.usuario_id = %s AND d.fecha BETWEEN %s AND %s ORDER BY d.fecha",
        (usuario_id, desde, hasta),
    ).fetchall()
    return [{"fecha": f.isoformat(), "rutina": _rutina(rid, nombre)} for f, rid, nombre in rows]


def guardar_dia(
    conn: psycopg.Connection, usuario_id: int, fecha: date, rutina_id: int | None
) -> None:
    conn.execute(
        "INSERT INTO plan_dias (usuario_id, fecha, rutina_id) VALUES (%s, %s, %s) "
        "ON CONFLICT (usuario_id, fecha) DO UPDATE SET rutina_id = EXCLUDED.rutina_id",
        (usuario_id, fecha, rutina_id),
    )


def quitar_dia(conn: psycopg.Connection, usuario_id: int, fecha: date) -> None:
    conn.execute(
        "DELETE FROM plan_dias WHERE usuario_id = %s AND fecha = %s", (usuario_id, fecha)
    )
