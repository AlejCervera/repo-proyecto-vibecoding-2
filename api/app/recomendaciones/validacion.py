"""Valida la respuesta de la IA contra el contexto. Lógica pura.

Si algo no cuadra (JSON roto, ejercicio inventado, valores absurdos…) se rechaza la
respuesta entera con RespuestaInvalida: preferimos avisar a recomendar algo dudoso."""

import json
from typing import Any

from app.recomendaciones.contexto import Contexto

MAX_ANADIR, MAX_SUSTITUIR = 3, 2
MIN_SERIES, MAX_SERIES = 1, 10
MIN_REPS, MAX_REPS = 1, 50
MAX_PESO = 400
# Subida máxima sobre el peso más alto de la última sesión: 10 % o 2,5 kg, lo que sea mayor.
SUBIDA_RELATIVA, SUBIDA_MINIMA = 0.10, 2.5
# Sin historial: como mucho el doble del peso corporal.
FACTOR_SIN_HISTORIAL = 2
MAX_TEXTO = 300


class RespuestaInvalida(ValueError):
    pass


def _lista(datos: dict, clave: str, maximo: int) -> list[dict]:
    valor = datos.get(clave)
    if not isinstance(valor, list) or not all(isinstance(x, dict) for x in valor):
        raise RespuestaInvalida(f"«{clave}» debe ser una lista de objetos")
    if len(valor) > maximo:
        raise RespuestaInvalida(f"«{clave}» tiene más de {maximo} elementos")
    return valor


def _texto(valor: Any, campo: str) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise RespuestaInvalida(f"Falta «{campo}»")
    return valor.strip()[:MAX_TEXTO]


def _entero(valor: Any, campo: str, minimo: int, maximo: int) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int) or not minimo <= valor <= maximo:
        raise RespuestaInvalida(f"«{campo}» debe ser un entero entre {minimo} y {maximo}")
    return valor


def _reps(item: dict) -> tuple[int, int]:
    reps_min = _entero(item.get("reps_min"), "reps_min", MIN_REPS, MAX_REPS)
    reps_max = _entero(item.get("reps_max"), "reps_max", MIN_REPS, MAX_REPS)
    if reps_min > reps_max:
        raise RespuestaInvalida("reps_min no puede ser mayor que reps_max")
    return reps_min, reps_max


def peso_maximo_permitido(c: Contexto, ejercicio_id: int) -> float:
    sesiones = c.historial.get(ejercicio_id)
    if not sesiones:
        return c.peso_corporal_kg * FACTOR_SIN_HISTORIAL
    ultimo = sesiones[0].peso_maximo
    return ultimo + max(ultimo * SUBIDA_RELATIVA, SUBIDA_MINIMA)


def _peso(valor: Any, c: Contexto, ejercicio_id: int, nombre: str) -> float | None:
    if valor is None:
        return None
    if isinstance(valor, bool) or not isinstance(valor, int | float) or not 0 < valor <= MAX_PESO:
        raise RespuestaInvalida(f"Peso no válido para «{nombre}»")
    if valor > peso_maximo_permitido(c, ejercicio_id) + 1e-9:
        raise RespuestaInvalida(f"Subida de peso excesiva en «{nombre}»: {valor} kg")
    return round(float(valor), 2)


def _del_catalogo_nuevo(c: Contexto, nombre: Any, usados: set[int]) -> tuple[int, str]:
    """Ejercicio del catálogo que no está en la rutina ni se ha propuesto ya."""
    nombre = _texto(nombre, "ejercicio")
    encontrado = c.en_catalogo(nombre)
    if encontrado is None:
        raise RespuestaInvalida(f"«{nombre}» no está en el catálogo")
    if c.en_rutina(nombre) or encontrado[0] in usados:
        raise RespuestaInvalida(f"«{nombre}» ya está en la rutina o repetido")
    usados.add(encontrado[0])
    return encontrado


def _de_la_rutina(c: Contexto, nombre: Any):
    nombre = _texto(nombre, "ejercicio")
    ejercicio = c.en_rutina(nombre)
    if ejercicio is None:
        raise RespuestaInvalida(f"«{nombre}» no está en la rutina")
    return ejercicio


def _anadir(c: Contexto, items: list[dict], usados: set[int]) -> list[dict]:
    resultado = []
    for item in items:
        ejercicio_id, nombre = _del_catalogo_nuevo(c, item.get("ejercicio"), usados)
        reps_min, reps_max = _reps(item)
        resultado.append(
            {
                "ejercicio_id": ejercicio_id,
                "nombre": nombre,
                "series": _entero(item.get("series"), "series", MIN_SERIES, MAX_SERIES),
                "reps_min": reps_min,
                "reps_max": reps_max,
                "motivo": _texto(item.get("motivo"), "motivo"),
            }
        )
    return resultado


def _sustituir(c: Contexto, items: list[dict], usados: set[int]) -> list[dict]:
    resultado, quitados = [], set()
    for item in items:
        quitar = _de_la_rutina(c, item.get("quitar"))
        if quitar.id in quitados:
            raise RespuestaInvalida(f"«{quitar.nombre}» se sustituye dos veces")
        quitados.add(quitar.id)
        poner_id, poner_nombre = _del_catalogo_nuevo(c, item.get("poner"), usados)
        resultado.append(
            {
                "quitar_id": quitar.id,
                "quitar_nombre": quitar.nombre,
                "poner_id": poner_id,
                "poner_nombre": poner_nombre,
                "motivo": _texto(item.get("motivo"), "motivo"),
            }
        )
    return resultado


def _objetivos(c: Contexto, items: list[dict]) -> list[dict]:
    resultado, vistos = [], set()
    for item in items:
        ejercicio = _de_la_rutina(c, item.get("ejercicio"))
        if ejercicio.id in vistos:
            continue  # duplicado: nos quedamos con el primero
        vistos.add(ejercicio.id)
        reps_min, reps_max = _reps(item)
        resultado.append(
            {
                "ejercicio_id": ejercicio.id,
                "nombre": ejercicio.nombre,
                "peso_kg": _peso(item.get("peso_kg"), c, ejercicio.id, ejercicio.nombre),
                "reps_min": reps_min,
                "reps_max": reps_max,
                "motivo": _texto(item.get("motivo"), "motivo"),
            }
        )
    return resultado


def validar(texto: str, c: Contexto) -> dict[str, Any]:
    """Del texto JSON de la IA a recomendaciones con ids reales; o RespuestaInvalida."""
    try:
        datos = json.loads(texto)
    except (TypeError, ValueError):
        raise RespuestaInvalida("La respuesta no es JSON") from None
    if not isinstance(datos, dict):
        raise RespuestaInvalida("La respuesta no es un objeto JSON")
    usados: set[int] = set()
    return {
        "resumen": _texto(datos.get("resumen"), "resumen"),
        "anadir": _anadir(c, _lista(datos, "anadir", MAX_ANADIR), usados),
        "sustituir": _sustituir(c, _lista(datos, "sustituir", MAX_SUSTITUIR), usados),
        "objetivos": _objetivos(c, _lista(datos, "objetivos", max(len(c.ejercicios), 1) * 2)),
    }
