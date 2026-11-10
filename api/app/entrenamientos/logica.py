"""Reglas del diario de entrenamientos. Lógica pura."""

from dataclasses import dataclass
from datetime import date
from typing import Any


class EntrenamientoInvalido(ValueError):
    pass


@dataclass(frozen=True)
class NuevoEntrenamiento:
    rutina_id: int
    fecha: date


def validar(datos: Any, hoy: date | None = None) -> NuevoEntrenamiento:
    if not isinstance(datos, dict):
        raise EntrenamientoInvalido("Los datos no son válidos")
    rutina_id = datos.get("rutina_id")
    if isinstance(rutina_id, bool) or not isinstance(rutina_id, int) or rutina_id < 1:
        raise EntrenamientoInvalido("Indica la rutina")
    fecha = datos.get("fecha")
    if fecha in (None, ""):
        return NuevoEntrenamiento(rutina_id, hoy or date.today())
    try:
        return NuevoEntrenamiento(rutina_id, date.fromisoformat(str(fecha)))
    except ValueError:
        raise EntrenamientoInvalido("La fecha no es válida") from None


def agrupar_por_ejercicio(series: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ejercicios en el orden en que se empezaron, cada uno con sus series en orden."""
    grupos: dict[int, dict[str, Any]] = {}
    for s in sorted(series, key=lambda s: s["id"]):
        grupo = grupos.setdefault(
            s["ejercicio_id"], {"id": s["ejercicio_id"], "nombre": s["ejercicio"], "series": []}
        )
        grupo["series"].append(s)
    return list(grupos.values())
