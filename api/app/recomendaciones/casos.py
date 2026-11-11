"""Casos de prueba del prompt (prompts/casos/*.json) y la comprobación de su resultado esperado.

Cada caso tiene «entrada» (contexto), «respuesta_simulada» (lo que devolvería Gemini, para las
pruebas automáticas) y «esperado» (criterios que debe cumplir el resultado validado)."""

import json
from dataclasses import dataclass
from typing import Any

from app.recomendaciones.contexto import Contexto, desde_dict
from app.recomendaciones.prompt import carpeta_prompts


@dataclass(frozen=True)
class Caso:
    nombre: str
    descripcion: str
    contexto: Contexto
    respuesta_simulada: dict[str, Any]
    esperado: dict[str, Any]
    solo_simulado: bool = False


def cargar() -> list[Caso]:
    casos = []
    for ruta in sorted((carpeta_prompts() / "casos").glob("*.json")):
        datos = json.loads(ruta.read_text(encoding="utf-8"))
        casos.append(
            Caso(
                nombre=ruta.stem,
                descripcion=datos["descripcion"],
                contexto=desde_dict(datos["entrada"]),
                respuesta_simulada=datos["respuesta_simulada"],
                esperado=datos["esperado"],
                solo_simulado=datos.get("solo_simulado", False),
            )
        )
    return casos


def comprobar(resultado: dict[str, Any] | None, esperado: dict[str, Any]) -> list[str]:
    """Fallos respecto a lo esperado (lista vacía = cumple). resultado None = respuesta rechazada."""
    if not esperado.get("valida", True):
        return [] if resultado is None else ["Se esperaba que la respuesta se rechazara"]
    if resultado is None:
        return ["La respuesta se rechazó y se esperaba válida"]

    fallos = []
    anadidos = {a["nombre"] for a in resultado["anadir"]} | {
        s["poner_nombre"] for s in resultado["sustituir"]
    }
    if (opciones := esperado.get("anadir_alguno_de")) and not anadidos & set(opciones):
        fallos.append(f"Debía añadir alguno de {opciones}; añadió {sorted(anadidos)}")

    objetivos = {o["nombre"]: o for o in resultado["objetivos"]}
    for nombre, limites in esperado.get("objetivos", {}).items():
        objetivo = objetivos.get(nombre)
        if objetivo is None:
            fallos.append(f"Falta el objetivo de «{nombre}»")
            continue
        peso = objetivo["peso_kg"]
        if peso is None:
            fallos.append(f"«{nombre}» sin peso recomendado")
            continue
        if "peso_min" in limites and peso < limites["peso_min"]:
            fallos.append(f"«{nombre}»: {peso} kg < mínimo esperado {limites['peso_min']}")
        if "peso_max" in limites and peso > limites["peso_max"]:
            fallos.append(f"«{nombre}»: {peso} kg > máximo esperado {limites['peso_max']}")
    return fallos
