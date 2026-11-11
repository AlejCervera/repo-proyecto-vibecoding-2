"""Construye el prompt a partir de la plantilla de prompts/ y el contexto. Lógica pura."""

import os
from pathlib import Path

from app.recomendaciones.contexto import Contexto, EjercicioRutina, Sesion

PLANTILLA = "recomendar_rutina.md"


def carpeta_prompts() -> Path:
    """prompts/ en la raíz del repositorio (en Docker se monta y se indica con PROMPTS_DIR)."""
    if carpeta := os.environ.get("PROMPTS_DIR"):
        return Path(carpeta)
    return Path(__file__).resolve().parents[3] / "prompts"


def leer_plantilla() -> str:
    return (carpeta_prompts() / PLANTILLA).read_text(encoding="utf-8")


def _kg(peso: float) -> str:
    return f"{peso:g} kg"


def _objetivo(e: EjercicioRutina) -> str:
    if e.reps_min is None:
        return f"{e.series} series, sin objetivo de repeticiones"
    reps = str(e.reps_min) if e.reps_min == e.reps_max else f"{e.reps_min}-{e.reps_max}"
    return f"{e.series} series, objetivo {reps} repeticiones"


def _sesion(s: Sesion) -> str:
    return f"  {s.fecha}: " + ", ".join(f"{_kg(p)} × {r}" for p, r in s.series)


def texto_perfil(c: Contexto) -> str:
    return f"Altura {c.altura_cm} cm, peso corporal {_kg(c.peso_corporal_kg)}."


def texto_rutina(c: Contexto) -> str:
    if not c.ejercicios:
        return f"«{c.rutina}»: todavía no tiene ejercicios."
    lineas = [f"«{c.rutina}»:"] + [f"- {e.nombre}: {_objetivo(e)}" for e in c.ejercicios]
    return "\n".join(lineas)


def texto_historial(c: Contexto) -> str:
    lineas = []
    for e in c.ejercicios:
        sesiones = c.historial.get(e.id, ())
        if not sesiones:
            lineas.append(f"- {e.nombre}: sin historial")
            continue
        lineas.append(f"- {e.nombre}:")
        lineas += [_sesion(s) for s in sesiones]
    return "\n".join(lineas) or "Sin historial."


def texto_catalogo(c: Contexto) -> str:
    return "; ".join(nombre for _, nombre in c.catalogo)


def construir(c: Contexto, plantilla: str | None = None) -> str:
    plantilla = leer_plantilla() if plantilla is None else plantilla
    return (
        plantilla.replace("{{perfil}}", texto_perfil(c))
        .replace("{{rutina}}", texto_rutina(c))
        .replace("{{historial}}", texto_historial(c))
        .replace("{{catalogo}}", texto_catalogo(c))
    )
