"""Reglas de las rutinas. Lógica pura."""

from dataclasses import dataclass
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


MIN_SERIES, MAX_SERIES, SERIES_POR_DEFECTO = 1, 10, 3
MAX_REPS = 100


@dataclass(frozen=True)
class Plan:
    """Lo previsto para un ejercicio de la rutina: nº de series y repeticiones objetivo."""

    series: int = SERIES_POR_DEFECTO
    reps_min: int | None = None
    reps_max: int | None = None


def _entero(valor: Any) -> bool:
    return isinstance(valor, int) and not isinstance(valor, bool)


PLAN_POR_DEFECTO = Plan()


def validar_plan(datos: Any, por_defecto: Plan = PLAN_POR_DEFECTO) -> Plan:
    """Lee series, reps_min y reps_max; los que no vengan se toman de «por_defecto»."""
    if datos is None:
        datos = {}
    if not isinstance(datos, dict):
        raise RutinaInvalida("Los datos no son válidos")
    series = datos.get("series", por_defecto.series)
    if not _entero(series) or not MIN_SERIES <= series <= MAX_SERIES:
        raise RutinaInvalida(f"Las series deben estar entre {MIN_SERIES} y {MAX_SERIES}")

    if "reps_min" in datos or "reps_max" in datos:
        reps_min, reps_max = datos.get("reps_min"), datos.get("reps_max")
    else:
        reps_min, reps_max = por_defecto.reps_min, por_defecto.reps_max
    if (reps_min is None) != (reps_max is None):
        raise RutinaInvalida("Indica el mínimo y el máximo de repeticiones, o ninguno")
    if reps_min is not None:
        if not all(_entero(r) and 1 <= r <= MAX_REPS for r in (reps_min, reps_max)):
            raise RutinaInvalida(f"Las repeticiones objetivo deben estar entre 1 y {MAX_REPS}")
        if reps_min > reps_max:
            raise RutinaInvalida("El mínimo de repeticiones no puede ser mayor que el máximo")
    return Plan(series, reps_min, reps_max)


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
