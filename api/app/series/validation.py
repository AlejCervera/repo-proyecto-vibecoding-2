"""Reglas de una serie. Lógica pura: sin base de datos ni HTTP."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any


class SerieInvalida(ValueError):
    pass


@dataclass(frozen=True)
class NuevaSerie:
    fecha: date
    ejercicio_id: int
    peso_kg: Decimal
    repeticiones: int


def _vacio(valor: Any) -> bool:
    return valor is None or (isinstance(valor, str) and valor.strip() == "")


def _numero(valor: Any, campo: str) -> Decimal:
    if isinstance(valor, bool):
        raise SerieInvalida(f"{campo} debe ser un número")
    try:
        numero = Decimal(str(valor).strip().replace(",", "."))
    except InvalidOperation:
        raise SerieInvalida(f"{campo} debe ser un número") from None
    if not numero.is_finite():
        raise SerieInvalida(f"{campo} debe ser un número")
    return numero


def validar_serie(datos: Any, hoy: date | None = None) -> NuevaSerie:
    if not isinstance(datos, dict):
        raise SerieInvalida("Los datos de la serie no son válidos")

    ejercicio_id = datos.get("ejercicio_id")
    if _vacio(ejercicio_id):
        raise SerieInvalida("Falta el ejercicio")
    if isinstance(ejercicio_id, bool) or not isinstance(ejercicio_id, int) or ejercicio_id < 1:
        raise SerieInvalida("El ejercicio no es válido")

    if _vacio(datos.get("peso_kg")):
        raise SerieInvalida("Falta el peso")
    peso = _numero(datos["peso_kg"], "El peso")
    if peso <= 0:
        raise SerieInvalida("El peso debe ser mayor que 0")
    if peso >= 10000 or peso != peso.quantize(Decimal("0.01")):
        raise SerieInvalida("El peso no es válido")

    if _vacio(datos.get("repeticiones")):
        raise SerieInvalida("Faltan las repeticiones")
    reps = _numero(datos["repeticiones"], "Las repeticiones")
    if reps != reps.to_integral_value():
        raise SerieInvalida("Las repeticiones deben ser un número entero")
    if reps < 1:
        raise SerieInvalida("Las repeticiones deben ser al menos 1")
    if reps > 10000:
        raise SerieInvalida("Las repeticiones no son válidas")

    fecha_raw = datos.get("fecha")
    if _vacio(fecha_raw):
        fecha = hoy or date.today()
    else:
        try:
            fecha = date.fromisoformat(str(fecha_raw))
        except ValueError:
            raise SerieInvalida("La fecha no es válida") from None

    return NuevaSerie(
        fecha=fecha, ejercicio_id=ejercicio_id, peso_kg=peso, repeticiones=int(reps)
    )
