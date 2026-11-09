"""Lista de imágenes de ejercicios de wger.de."""

from collections.abc import Iterable
from typing import Any

URL_INICIAL = "https://wger.de/api/v2/exerciseimage/?format=json&limit=100"

# Licencias de wger (https://wger.de/api/v2/license/, comprobado el 2026-11-09).
LICENCIAS = {1: "CC-BY-SA 3", 2: "CC-BY-SA 4", 3: "CC0", 4: "CC-BY 4", 5: "ODbL"}


def elegir_principales(resultados: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Una imagen por ejercicio: la marcada como principal o, si no hay, la primera.

    Se prefiere la miniatura mediana (400×400) para que pese poco.
    """
    elegidas: dict[int, dict[str, Any]] = {}
    for r in resultados:
        ejercicio = r.get("exercise")
        url = (r.get("thumbnails") or {}).get("medium") or r.get("image")
        if not isinstance(ejercicio, int) or not url:
            continue
        actual = elegidas.get(ejercicio)
        if actual is None or (r.get("is_main") and not actual["principal"]):
            elegidas[ejercicio] = {
                "wger_id": r["id"],
                "wger_ejercicio_id": ejercicio,
                "url": url,
                "principal": bool(r.get("is_main")),
                "licencia": LICENCIAS.get(r.get("license")),
                "autor": r.get("license_author") or None,
            }
    return list(elegidas.values())
