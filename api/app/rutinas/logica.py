"""Reglas de las rutinas. Lógica pura."""

from typing import Any

from app.ejercicios.nombres import limpiar, normalizar

MAX_NOMBRE = 60


class RutinaInvalida(ValueError):
    pass


def validar_nombre(datos: Any) -> str:
    nombre = datos.get("nombre") if isinstance(datos, dict) else None
    if not isinstance(nombre, str) or not nombre.strip():
        raise RutinaInvalida("Escribe el nombre de la rutina")
    nombre = limpiar(nombre)
    if len(nombre) > MAX_NOMBRE:
        raise RutinaInvalida(f"El nombre no puede tener más de {MAX_NOMBRE} caracteres")
    return nombre


def nombre_copia(nombre: str, existentes_normalizados: set[str]) -> str:
    """«Pecho» si está libre; si no, «Pecho (2)», «Pecho (3)»…"""
    candidato, n = nombre, 1
    while normalizar(candidato) in existentes_normalizados:
        n += 1
        candidato = f"{nombre} ({n})"
    return candidato


def validar_ejercicio_id(datos: Any) -> int:
    valor = datos.get("ejercicio_id") if isinstance(datos, dict) else None
    if isinstance(valor, bool) or not isinstance(valor, int) or valor < 1:
        raise RutinaInvalida("Elige un ejercicio")
    return valor


def validar_orden(actual: list[int], datos: Any) -> list[int]:
    """El nuevo orden debe contener exactamente los mismos ejercicios, sin repetir."""
    nuevo = datos.get("ejercicios") if isinstance(datos, dict) else None
    if not isinstance(nuevo, list) or not all(
        isinstance(x, int) and not isinstance(x, bool) for x in nuevo
    ):
        raise RutinaInvalida("El orden no es válido")
    if len(nuevo) != len(actual) or set(nuevo) != set(actual):
        raise RutinaInvalida("El orden debe incluir los mismos ejercicios de la rutina")
    return nuevo
