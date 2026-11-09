import pytest

from app.rutinas.logica import (
    RutinaInvalida,
    nombre_copia,
    validar_ejercicio_id,
    validar_nombre,
    validar_orden,
)
from app.rutinas.predefinidas import PREDEFINIDAS


def test_nombre_copia():
    assert nombre_copia("Pecho", set()) == "Pecho"
    assert nombre_copia("Pecho", {"pecho"}) == "Pecho (2)"
    assert nombre_copia("Pecho", {"pecho", "pecho (2)"}) == "Pecho (3)"


def test_validar_nombre():
    assert validar_nombre({"nombre": "  Pecho   y  hombro "}) == "Pecho y hombro"
    for malo in [{}, {"nombre": " "}, {"nombre": 3}, "x", {"nombre": "x" * 61}]:
        with pytest.raises(RutinaInvalida):
            validar_nombre(malo)


def test_validar_ejercicio_id():
    assert validar_ejercicio_id({"ejercicio_id": 4}) == 4
    for malo in [{}, {"ejercicio_id": "4"}, {"ejercicio_id": 0}, {"ejercicio_id": True}]:
        with pytest.raises(RutinaInvalida):
            validar_ejercicio_id(malo)


def test_validar_orden_exige_los_mismos_ejercicios():
    assert validar_orden([1, 2, 3], {"ejercicios": [3, 1, 2]}) == [3, 1, 2]
    for malo in [
        {"ejercicios": [1, 2]},  # falta uno
        {"ejercicios": [1, 2, 3, 4]},  # sobra uno
        {"ejercicios": [1, 1, 2]},  # repetido
        {"ejercicios": [1, 2, "3"]},
        {"ejercicios": "1,2,3"},
        None,
    ]:
        with pytest.raises(RutinaInvalida):
            validar_orden([1, 2, 3], malo)


def test_predefinidas_bien_definidas():
    claves = [d["clave"] for d in PREDEFINIDAS]
    nombres = [d["nombre"].lower() for d in PREDEFINIDAS]
    assert len(set(claves)) == len(claves)
    assert len(set(nombres)) == len(nombres)
    assert {"Pecho", "Espalda"} <= {d["nombre"] for d in PREDEFINIDAS}
    for d in PREDEFINIDAS:
        assert d["wger_ids"], d["clave"]
        assert len(set(d["wger_ids"])) == len(d["wger_ids"]), d["clave"]
