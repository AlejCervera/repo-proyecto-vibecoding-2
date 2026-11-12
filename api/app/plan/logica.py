"""Reglas del plan semanal y de los cambios de un día. Lógica pura."""

from datetime import date, timedelta
from typing import Any

DIAS_SEMANA = 7  # 0 = lunes … 6 = domingo
MAX_RANGO = timedelta(days=62)  # para pedir los cambios de un mes con margen


class PlanInvalido(ValueError):
    pass


def _rutina_id(valor: Any) -> int | None:
    """Un id de rutina (entero positivo) o None (descanso)."""
    if valor is None:
        return None
    if isinstance(valor, bool) or not isinstance(valor, int) or valor < 1:
        raise PlanInvalido("Cada día debe ser una rutina o descanso")
    return valor


def validar_semana(datos: Any) -> list[int | None]:
    """{"dias": [7 valores]}: el id de la rutina de cada día (de lunes a domingo) o null."""
    if not isinstance(datos, dict) or not isinstance(datos.get("dias"), list):
        raise PlanInvalido("Los datos no son válidos")
    dias = datos["dias"]
    if len(dias) != DIAS_SEMANA:
        raise PlanInvalido("El plan debe tener los 7 días de la semana")
    return [_rutina_id(d) for d in dias]


def validar_dia(datos: Any) -> int | None:
    """{"rutina_id": id} o {"rutina_id": null} (descanso ese día)."""
    if not isinstance(datos, dict) or "rutina_id" not in datos:
        raise PlanInvalido("Los datos no son válidos")
    return _rutina_id(datos["rutina_id"])


def leer_fecha(texto: str) -> date:
    try:
        return date.fromisoformat(texto)
    except (TypeError, ValueError):
        raise PlanInvalido("La fecha no es válida") from None


def validar_rango(desde: str, hasta: str) -> tuple[date, date]:
    inicio, fin = leer_fecha(desde), leer_fecha(hasta)
    if fin < inicio:
        raise PlanInvalido("El final del rango no puede ser anterior al inicio")
    if fin - inicio > MAX_RANGO:
        raise PlanInvalido("Como mucho se pueden pedir 62 días")
    return inicio, fin
