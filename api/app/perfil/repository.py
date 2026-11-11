"""Acceso al perfil (columnas de la tabla usuarios)."""

import psycopg

from app.perfil.logica import Perfil


def obtener(conn: psycopg.Connection, usuario_id: int) -> Perfil:
    row = conn.execute(
        "SELECT altura_cm, peso_corporal_kg FROM usuarios WHERE id = %s", (usuario_id,)
    ).fetchone()
    if row is None:
        return Perfil()
    altura, peso = row
    return Perfil(altura, float(peso) if peso is not None else None)


def guardar(conn: psycopg.Connection, usuario_id: int, perfil: Perfil) -> None:
    conn.execute(
        "UPDATE usuarios SET altura_cm = %s, peso_corporal_kg = %s WHERE id = %s",
        (perfil.altura_cm, perfil.peso_corporal_kg, usuario_id),
    )
