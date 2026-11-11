"""Esquema JSON que se pide a Gemini (response_json_schema)."""

_TEXTO = {"type": "string"}
_ENTERO = {"type": "integer"}

ESQUEMA = {
    "type": "object",
    "properties": {
        "resumen": _TEXTO,
        "anadir": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ejercicio": _TEXTO,
                    "series": _ENTERO,
                    "reps_min": _ENTERO,
                    "reps_max": _ENTERO,
                    "motivo": _TEXTO,
                },
                "required": ["ejercicio", "series", "reps_min", "reps_max", "motivo"],
            },
        },
        "sustituir": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"quitar": _TEXTO, "poner": _TEXTO, "motivo": _TEXTO},
                "required": ["quitar", "poner", "motivo"],
            },
        },
        "objetivos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ejercicio": _TEXTO,
                    "peso_kg": {"type": ["number", "null"]},
                    "reps_min": _ENTERO,
                    "reps_max": _ENTERO,
                    "motivo": _TEXTO,
                },
                "required": ["ejercicio", "peso_kg", "reps_min", "reps_max", "motivo"],
            },
        },
    },
    "required": ["resumen", "anadir", "sustituir", "objetivos"],
}
