"""Los 5 casos de prompts/casos/ con la respuesta simulada de Gemini: el resultado validado
debe cumplir lo esperado en cada caso."""

import json

import pytest

from app.recomendaciones import casos
from app.recomendaciones.servicio import recomendar
from app.recomendaciones.validacion import RespuestaInvalida

CASOS = casos.cargar()


class IaSimulada:
    def __init__(self, respuesta: dict):
        self.respuesta, self.prompts = respuesta, []

    def generar(self, prompt, esquema):
        self.prompts.append(prompt)
        return json.dumps(self.respuesta)


def test_hay_5_casos():
    assert len(CASOS) == 5


@pytest.mark.parametrize("caso", CASOS, ids=[c.nombre for c in CASOS])
def test_caso(caso):
    ia = IaSimulada(caso.respuesta_simulada)
    try:
        resultado = recomendar(caso.contexto, ia)
    except RespuestaInvalida:
        resultado = None
    assert casos.comprobar(resultado, caso.esperado) == []
    # El prompt enviado lleva la rutina y el historial del caso.
    assert f"«{caso.contexto.rutina}»" in ia.prompts[0]


def test_comprobar_detecta_fallos():
    esperado = {
        "anadir_alguno_de": ["Fondos"],
        "objetivos": {"Press": {"peso_min": 82, "peso_max": 85}},
    }
    resultado = {
        "anadir": [{"nombre": "Curl"}],
        "sustituir": [],
        "objetivos": [{"nombre": "Press", "peso_kg": 90}],
    }
    fallos = casos.comprobar(resultado, esperado)
    assert len(fallos) == 2
    assert casos.comprobar(None, esperado) == ["La respuesta se rechazó y se esperaba válida"]
    assert casos.comprobar(resultado, {"valida": False}) != []
