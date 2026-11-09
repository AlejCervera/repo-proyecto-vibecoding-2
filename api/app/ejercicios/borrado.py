"""Qué hacer con las series al borrar un ejercicio propio. Lógica pura."""

from dataclasses import dataclass


class BorradoInvalido(ValueError):
    pass


class FaltaDecidir(Exception):
    """El ejercicio tiene series y no se ha dicho qué hacer con ellas."""

    def __init__(self, num_series: int):
        super().__init__(num_series)
        self.num_series = num_series


@dataclass(frozen=True)
class Plan:
    borrar_series: bool = False
    mover_a: int | None = None


def decidir(
    ejercicio_id: int, num_series: int, series: str | None, mover_a: int | None
) -> Plan:
    """series='borrar' borra también las series; mover_a=<id> las pasa a ese ejercicio."""
    if series is not None and series != "borrar":
        raise BorradoInvalido("Opción no válida: usa series=borrar o mover_a=<ejercicio>")
    if series and mover_a is not None:
        raise BorradoInvalido("Elige solo una opción: borrar las series o pasarlas a otro")
    if mover_a == ejercicio_id:
        raise BorradoInvalido("No se pueden pasar las series al mismo ejercicio")
    if num_series == 0:
        return Plan()
    if series == "borrar":
        return Plan(borrar_series=True)
    if mover_a is not None:
        return Plan(mover_a=mover_a)
    raise FaltaDecidir(num_series)
