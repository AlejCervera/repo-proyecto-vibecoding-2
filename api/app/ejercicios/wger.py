"""Lectura del catálogo de wger.de. La API pública no pide autenticación."""

import json
from collections.abc import Callable, Iterable, Iterator
from typing import Any
from urllib.request import Request, urlopen

from app.ejercicios.nombres import MAX_NOMBRE, limpiar, normalizar

URL_INICIAL = "https://wger.de/api/v2/exerciseinfo/?format=json&limit=100"
ESPANOL, INGLES = 4, 2  # ids de idioma en wger


def _nombre_en(traducciones: list[dict], idioma: int) -> str:
    for t in traducciones:
        if t.get("language") == idioma and isinstance(t.get("name"), str):
            nombre = limpiar(t["name"])
            if nombre:
                return nombre
    return ""


def extraer_ejercicios(resultados: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Nombre en español o, si no hay, en inglés. Descarta vacíos, largos y repetidos."""
    vistos: set[str] = set()
    ejercicios = []
    for r in resultados:
        traducciones = r.get("translations") or []
        nombre = _nombre_en(traducciones, ESPANOL) or _nombre_en(traducciones, INGLES)
        norm = normalizar(nombre)
        if not nombre or len(nombre) > MAX_NOMBRE or norm in vistos:
            continue
        vistos.add(norm)
        licencia = r.get("license") or {}
        ejercicios.append(
            {
                "wger_id": r["id"],
                "nombre": nombre,
                "nombre_normalizado": norm,
                "licencia": licencia.get("short_name"),
                "autor": r.get("license_author") or None,
            }
        )
    return ejercicios


def _pedir_json(url: str) -> dict[str, Any]:
    peticion = Request(url, headers={"User-Agent": "gym-log-importador/1.0"})
    with urlopen(peticion, timeout=30) as res:
        return json.load(res)


def paginas(
    url: str = URL_INICIAL, pedir: Callable[[str], dict[str, Any]] = _pedir_json
) -> Iterator[dict[str, Any]]:
    """Recorre todas las páginas siguiendo el campo «next»."""
    siguiente: str | None = url
    while siguiente:
        pagina = pedir(siguiente)
        yield from pagina.get("results", [])
        siguiente = pagina.get("next")
