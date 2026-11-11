"""Une prompt, IA y validación. No depende de la base de datos ni de HTTP."""

from typing import Any

from app.recomendaciones import prompt
from app.recomendaciones.contexto import Contexto
from app.recomendaciones.esquema import ESQUEMA
from app.recomendaciones.gemini import Generador
from app.recomendaciones.validacion import validar


def recomendar(c: Contexto, ia: Generador, plantilla: str | None = None) -> dict[str, Any]:
    """Recomendaciones validadas. Puede lanzar LimiteAlcanzado, ErrorIA o RespuestaInvalida."""
    texto = ia.generar(prompt.construir(c, plantilla), ESQUEMA)
    return validar(texto, c)
