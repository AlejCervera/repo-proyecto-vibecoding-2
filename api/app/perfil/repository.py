"""Acceso al perfil (columnas de la tabla usuarios)."""

import psycopg

from app.perfil.logica import Perfil


def obtener(conn: psycopg.Connection, usuario_id: int) -> Perfil:
    row = conn.execute(
        "SELECT altura_cm, peso_corporal_kg, barra_kg FROM usuarios WHERE id = %s",
        (usuario_id,),
    ).fetchone()
    if row is None:
        return Perfil()
    altura, peso, barra = row
    return Perfil(altura, float(peso) if peso is not None else None, float(barra))


def guardar(conn: psycopg.Connection, usuario_id: int, perfil: Perfil) -> Perfil:
    """Guarda el perfil; si no trae barra (None), se queda la que había. Devuelve el guardado."""
    conn.execute(
        "UPDATE usuarios SET altura_cm = %s, peso_corporal_kg = %s, "
        "barra_kg = coalesce(%s, barra_kg) WHERE id = %s",
        (perfil.altura_cm, perfil.peso_corporal_kg, perfil.barra_kg, usuario_id),
    )
    return obtener(conn, usuario_id)


def marcar_bienvenida(conn: psycopg.Connection, usuario_id: int) -> None:
    conn.execute("UPDATE usuarios SET bienvenida_vista = true WHERE id = %s", (usuario_id,))
