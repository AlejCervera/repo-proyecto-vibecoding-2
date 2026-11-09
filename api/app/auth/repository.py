"""Acceso a las tablas usuarios y sesiones."""

from datetime import datetime
from typing import Any

import psycopg


class UsuarioExistente(Exception):
    pass


def _usuario(row: tuple | None) -> dict[str, Any] | None:
    return {"id": row[0], "nombre_usuario": row[1]} if row else None


def crear_usuario(conn: psycopg.Connection, nombre: str, password_hash: str) -> dict[str, Any]:
    try:
        row = conn.execute(
            "INSERT INTO usuarios (nombre_usuario, password_hash) VALUES (%s, %s) "
            "RETURNING id, nombre_usuario",
            (nombre, password_hash),
        ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise UsuarioExistente() from None
    return _usuario(row)


def buscar_para_login(conn: psycopg.Connection, nombre: str) -> tuple[dict, str] | None:
    row = conn.execute(
        "SELECT id, nombre_usuario, password_hash FROM usuarios "
        "WHERE lower(nombre_usuario) = lower(%s)",
        (nombre,),
    ).fetchone()
    return (_usuario(row[:2]), row[2]) if row else None


def crear_sesion(
    conn: psycopg.Connection, usuario_id: int, token_hash: str, expira: datetime
) -> None:
    conn.execute(
        "INSERT INTO sesiones (token_hash, usuario_id, expira_en) VALUES (%s, %s, %s)",
        (token_hash, usuario_id, expira),
    )


def usuario_de_sesion(conn: psycopg.Connection, token_hash: str) -> dict[str, Any] | None:
    row = conn.execute(
        "SELECT u.id, u.nombre_usuario FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id "
        "WHERE s.token_hash = %s AND s.expira_en > now()",
        (token_hash,),
    ).fetchone()
    return _usuario(row)


def borrar_sesion(conn: psycopg.Connection, token_hash: str) -> None:
    conn.execute("DELETE FROM sesiones WHERE token_hash = %s", (token_hash,))
