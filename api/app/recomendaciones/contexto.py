"""Datos que necesita la IA para recomendar. Lógica pura: se crean desde la base de datos
(repository.py) o desde los casos de prueba de prompts/casos/."""

from dataclasses import dataclass, field
from typing import Any

from app.ejercicios.nombres import normalizar

SESIONES_HISTORIAL = 3


@dataclass(frozen=True)
class EjercicioRutina:
    id: int
    nombre: str
    series: int
    reps_min: int | None
    reps_max: int | None


@dataclass(frozen=True)
class Sesion:
    """Un día de un ejercicio: sus series como (peso en kg, repeticiones)."""

    fecha: str
    series: tuple[tuple[float, int], ...]

    @property
    def peso_maximo(self) -> float:
        return max(p for p, _ in self.series)


@dataclass(frozen=True)
class Contexto:
    altura_cm: int
    peso_corporal_kg: float
    rutina: str
    ejercicios: tuple[EjercicioRutina, ...]
    # ejercicio_id -> sesiones, de la más reciente a la más antigua
    historial: dict[int, tuple[Sesion, ...]] = field(default_factory=dict)
    # Catálogo visible para el usuario: (id, nombre)
    catalogo: tuple[tuple[int, str], ...] = ()

    def en_rutina(self, nombre: str) -> EjercicioRutina | None:
        buscado = normalizar(nombre)
        return next((e for e in self.ejercicios if normalizar(e.nombre) == buscado), None)

    def en_catalogo(self, nombre: str) -> tuple[int, str] | None:
        buscado = normalizar(nombre)
        return next((c for c in self.catalogo if normalizar(c[1]) == buscado), None)


def agrupar_sesiones(filas: list[tuple[int, str, float, int]]) -> dict[int, tuple[Sesion, ...]]:
    """De filas (ejercicio_id, fecha, peso, reps), ya ordenadas por ejercicio y fecha
    descendente, a las últimas SESIONES_HISTORIAL sesiones de cada ejercicio."""
    por_ejercicio: dict[int, dict[str, list[tuple[float, int]]]] = {}
    for ejercicio_id, fecha, peso, reps in filas:
        por_ejercicio.setdefault(ejercicio_id, {}).setdefault(fecha, []).append((peso, reps))
    return {
        ejercicio_id: tuple(Sesion(f, tuple(s)) for f, s in fechas.items())[:SESIONES_HISTORIAL]
        for ejercicio_id, fechas in por_ejercicio.items()
    }


def desde_dict(datos: dict[str, Any]) -> Contexto:
    """Contexto escrito a mano (casos de prueba). Los ids se asignan por orden del catálogo."""
    catalogo = tuple(enumerate(datos["catalogo"], start=1))
    ids = {normalizar(nombre): i for i, nombre in catalogo}
    ejercicios = tuple(
        EjercicioRutina(
            ids[normalizar(e["nombre"])],
            e["nombre"],
            e["series"],
            e.get("reps_min"),
            e.get("reps_max"),
        )
        for e in datos["rutina"]["ejercicios"]
    )
    historial = {
        ids[normalizar(nombre)]: tuple(
            Sesion(s["fecha"], tuple((float(p), int(r)) for p, r in s["series"])) for s in sesiones
        )
        for nombre, sesiones in datos.get("historial", {}).items()
    }
    return Contexto(
        altura_cm=datos["perfil"]["altura_cm"],
        peso_corporal_kg=datos["perfil"]["peso_corporal_kg"],
        rutina=datos["rutina"]["nombre"],
        ejercicios=ejercicios,
        historial=historial,
        catalogo=catalogo,
    )
