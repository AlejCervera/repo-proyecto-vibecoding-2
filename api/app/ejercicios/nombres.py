"""Nombres de ejercicios. Lógica pura."""

import unicodedata
from typing import Any

MAX_NOMBRE = 80


class NombreInvalido(ValueError):
    pass


def limpiar(nombre: str) -> str:
    """Quita espacios sobrantes, conservando mayúsculas y tildes."""
    return " ".join(nombre.split())


def normalizar(nombre: str) -> str:
    """Clave para detectar duplicados: sin tildes, en minúsculas y sin espacios sobrantes."""
    descompuesto = unicodedata.normalize("NFKD", nombre)
    sin_tildes = "".join(c for c in descompuesto if not unicodedata.combining(c))
    return limpiar(sin_tildes).lower()


def validar_nombre(datos: Any) -> str:
    nombre = datos.get("nombre") if isinstance(datos, dict) else None
    if not isinstance(nombre, str) or not nombre.strip():
        raise NombreInvalido("Escribe el nombre del ejercicio")
    nombre = limpiar(nombre)
    if len(nombre) > MAX_NOMBRE:
        raise NombreInvalido(f"El nombre no puede tener más de {MAX_NOMBRE} caracteres")
    return nombre
