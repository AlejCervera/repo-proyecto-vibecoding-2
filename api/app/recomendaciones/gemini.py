"""Llamada a Gemini con el SDK google-genai. La clave y el modelo vienen de .env."""

from typing import Any, Protocol

from google import genai
from google.genai import errors, types

from app.config import gemini_api_key, gemini_model

# Respuestas cortas y poco creativas: gastan menos y son más estables.
MAX_TOKENS_RESPUESTA = 2048
TEMPERATURA = 0.2
TIEMPO_MAXIMO_MS = 30_000


class LimiteAlcanzado(Exception):
    """Gemini respondió 429: demasiadas peticiones o cuota agotada."""


class ErrorIA(Exception):
    """Cualquier otro fallo al hablar con Gemini."""


class Generador(Protocol):
    def generar(self, prompt: str, esquema: dict[str, Any]) -> str: ...


class ClienteGemini:
    def __init__(self, api_key: str, modelo: str, sdk: Any = None):
        self.modelo = modelo
        self._sdk = sdk or genai.Client(
            api_key=api_key, http_options=types.HttpOptions(timeout=TIEMPO_MAXIMO_MS)
        )

    def generar(self, prompt: str, esquema: dict[str, Any]) -> str:
        """Texto JSON de la respuesta."""
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=esquema,
            temperature=TEMPERATURA,
            max_output_tokens=MAX_TOKENS_RESPUESTA,
        )
        try:
            respuesta = self._sdk.models.generate_content(
                model=self.modelo, contents=prompt, config=config
            )
        except errors.APIError as e:
            if e.code == 429:
                raise LimiteAlcanzado() from e
            raise ErrorIA(f"Gemini respondió {e.code}") from e
        except Exception as e:  # red, tiempo agotado…
            raise ErrorIA(str(e)) from e
        return respuesta.text or ""


def cliente_desde_entorno() -> ClienteGemini | None:
    """None si falta la clave o el modelo en .env."""
    clave, modelo = gemini_api_key(), gemini_model()
    if not clave or not modelo:
        return None
    return ClienteGemini(clave, modelo)
