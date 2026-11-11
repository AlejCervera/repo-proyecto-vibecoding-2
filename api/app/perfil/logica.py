"""Reglas del perfil (altura y peso corporal). Lógica pura."""

from dataclasses import dataclass
from typing import Any

MIN_ALTURA, MAX_ALTURA = 100, 250
MIN_PESO, MAX_PESO = 30, 300


class PerfilInvalido(ValueError):
    pass


@dataclass(frozen=True)
class Perfil:
    altura_cm: int | None = None
    peso_corporal_kg: float | None = None

    @property
    def completo(self) -> bool:
        return self.altura_cm is not None and self.peso_corporal_kg is not None


def _numero(valor: Any) -> bool:
    return isinstance(valor, int | float) and not isinstance(valor, bool)


def validar_perfil(datos: Any) -> Perfil:
    """Altura en cm (entero) y peso en kg (con un decimal). Cada uno puede ser null."""
    if not isinstance(datos, dict):
        raise PerfilInvalido("Los datos no son válidos")
    altura, peso = datos.get("altura_cm"), datos.get("peso_corporal_kg")
    if altura is not None:
        if not _numero(altura) or altura != int(altura) or not MIN_ALTURA <= altura <= MAX_ALTURA:
            raise PerfilInvalido(
                f"La altura debe ser un número entero entre {MIN_ALTURA} y {MAX_ALTURA} cm"
            )
        altura = int(altura)
    if peso is not None:
        if not _numero(peso) or not MIN_PESO <= peso <= MAX_PESO:
            raise PerfilInvalido(f"El peso debe estar entre {MIN_PESO} y {MAX_PESO} kg")
        peso = round(float(peso), 1)
    return Perfil(altura, peso)


def a_dict(perfil: Perfil) -> dict[str, Any]:
    return {"altura_cm": perfil.altura_cm, "peso_corporal_kg": perfil.peso_corporal_kg}
