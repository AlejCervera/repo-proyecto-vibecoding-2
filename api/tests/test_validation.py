from datetime import date
from decimal import Decimal

import pytest

from app.series.validation import SerieInvalida, validar_serie

HOY = date(2026, 11, 9)
BASE = {"fecha": "2026-11-01", "ejercicio_id": 3, "peso_kg": 80, "repeticiones": 8}


def con(**cambios):
    return {**BASE, **cambios}


def test_serie_valida():
    s = validar_serie(BASE)
    assert s.fecha == date(2026, 11, 1)
    assert s.ejercicio_id == 3
    assert s.peso_kg == Decimal(80)
    assert s.repeticiones == 8


def test_admite_decimales_y_coma():
    assert validar_serie(con(peso_kg=82.5)).peso_kg == Decimal("82.5")
    assert validar_serie(con(peso_kg="82,5")).peso_kg == Decimal("82.5")


def test_sin_fecha_usa_hoy():
    assert validar_serie(con(fecha=None), hoy=HOY).fecha == HOY
    assert validar_serie(con(fecha=""), hoy=HOY).fecha == HOY


@pytest.mark.parametrize(
    ("cambios", "mensaje"),
    [
        ({"peso_kg": None}, "Falta el peso"),
        ({"peso_kg": ""}, "Falta el peso"),
        ({"peso_kg": 0}, "mayor que 0"),
        ({"peso_kg": -5}, "mayor que 0"),
        ({"peso_kg": "abc"}, "número"),
        ({"peso_kg": True}, "número"),
        ({"peso_kg": 80.123}, "no es válido"),
        ({"repeticiones": None}, "Faltan las repeticiones"),
        ({"repeticiones": 0}, "al menos 1"),
        ({"repeticiones": -1}, "al menos 1"),
        ({"repeticiones": 2.5}, "entero"),
        ({"ejercicio_id": None}, "Falta el ejercicio"),
        ({"ejercicio_id": ""}, "Falta el ejercicio"),
        ({"ejercicio_id": "3"}, "ejercicio no es válido"),
        ({"ejercicio_id": 0}, "ejercicio no es válido"),
        ({"ejercicio_id": True}, "ejercicio no es válido"),
        ({"fecha": "ayer"}, "fecha"),
    ],
)
def test_serie_invalida(cambios, mensaje):
    with pytest.raises(SerieInvalida, match=mensaje):
        validar_serie(con(**cambios))


def test_datos_que_no_son_objeto():
    with pytest.raises(SerieInvalida):
        validar_serie(["no", "vale"])
