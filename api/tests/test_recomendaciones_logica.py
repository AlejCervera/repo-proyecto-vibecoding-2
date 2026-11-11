"""Recomendaciones con IA: contexto, prompt, validación y cliente de Gemini (Fase 8c)."""

import json

import pytest
from google.genai import errors

from app.recomendaciones import gemini, prompt
from app.recomendaciones.contexto import Contexto, EjercicioRutina, Sesion, agrupar_sesiones
from app.recomendaciones.esquema import ESQUEMA
from app.recomendaciones.validacion import RespuestaInvalida, validar

CATALOGO = (
    (1, "Press de banca"),
    (2, "Aperturas con mancuernas"),
    (3, "Fondos"),
    (4, "Sentadilla"),
)
BANCA = EjercicioRutina(1, "Press de banca", 3, 8, 12)
HISTORIAL = {
    1: (
        Sesion("2026-11-08", ((80.0, 12), (80.0, 12), (80.0, 12))),
        Sesion("2026-11-05", ((80.0, 11), (77.5, 10))),
    )
}


def contexto(**cambios) -> Contexto:
    datos = {
        "altura_cm": 180,
        "peso_corporal_kg": 85.0,
        "rutina": "Pecho",
        "ejercicios": (BANCA,),
        "historial": HISTORIAL,
        "catalogo": CATALOGO,
    }
    return Contexto(**(datos | cambios))


def respuesta(**cambios) -> str:
    datos = {
        "resumen": "Bien.",
        "anadir": [
            {
                "ejercicio": "aperturas con MANCUERNAS",
                "series": 3,
                "reps_min": 10,
                "reps_max": 12,
                "motivo": "Aislamiento de pecho.",
            }
        ],
        "sustituir": [],
        "objetivos": [
            {
                "ejercicio": "Press de banca",
                "peso_kg": 82.5,
                "reps_min": 8,
                "reps_max": 12,
                "motivo": "80 kg × 12 en todas: sube.",
            }
        ],
    }
    return json.dumps(datos | cambios)


# --- Contexto y prompt --------------------------------------------------------------------


def test_agrupar_sesiones_por_dia_y_solo_las_3_ultimas():
    filas = [
        (1, "2026-11-10", 80.0, 8),
        (1, "2026-11-10", 80.0, 7),
        (1, "2026-11-08", 77.5, 9),
        (1, "2026-11-06", 75.0, 10),
        (1, "2026-11-01", 70.0, 12),  # cuarta sesión: fuera
        (2, "2026-11-10", 20.0, 12),
    ]
    sesiones = agrupar_sesiones(filas)
    assert [s.fecha for s in sesiones[1]] == ["2026-11-10", "2026-11-08", "2026-11-06"]
    assert sesiones[1][0].series == ((80.0, 8), (80.0, 7))
    assert sesiones[2][0].peso_maximo == 20.0


def test_el_prompt_incluye_perfil_rutina_pesos_y_repeticiones_anteriores_y_catalogo():
    texto = prompt.construir(contexto())
    assert "Altura 180 cm, peso corporal 85 kg." in texto
    assert "- Press de banca: 3 series, objetivo 8-12 repeticiones" in texto
    assert "2026-11-08: 80 kg × 12, 80 kg × 12, 80 kg × 12" in texto
    assert "2026-11-05: 80 kg × 11, 77.5 kg × 10" in texto
    assert "Press de banca; Aperturas con mancuernas; Fondos; Sentadilla" in texto
    assert "{{" not in texto


def test_prompt_sin_historial_ni_ejercicios():
    texto = prompt.construir(contexto(ejercicios=(), historial={}), "{{rutina}}|{{historial}}")
    assert texto == "«Pecho»: todavía no tiene ejercicios.|Sin historial."
    texto = prompt.construir(contexto(historial={}), "{{historial}}")
    assert texto == "- Press de banca: sin historial"


def test_la_plantilla_esta_en_prompts():
    plantilla = prompt.leer_plantilla()
    for marca in ("{{perfil}}", "{{rutina}}", "{{historial}}", "{{catalogo}}"):
        assert marca in plantilla


# --- Validación ---------------------------------------------------------------------------


def test_respuesta_valida_con_ids_reales_y_nombres_del_catalogo():
    r = validar(respuesta(), contexto())
    assert r["anadir"] == [
        {
            "ejercicio_id": 2,
            "nombre": "Aperturas con mancuernas",
            "series": 3,
            "reps_min": 10,
            "reps_max": 12,
            "motivo": "Aislamiento de pecho.",
        }
    ]
    assert r["objetivos"][0] | {"motivo": ""} == {
        "ejercicio_id": 1,
        "nombre": "Press de banca",
        "peso_kg": 82.5,
        "reps_min": 8,
        "reps_max": 12,
        "motivo": "",
    }


def test_sustituir_valido():
    r = validar(
        respuesta(sustituir=[{"quitar": "Press de banca", "poner": "Fondos", "motivo": "Variar."}]),
        contexto(),
    )
    assert r["sustituir"] == [
        {
            "quitar_id": 1,
            "quitar_nombre": "Press de banca",
            "poner_id": 3,
            "poner_nombre": "Fondos",
            "motivo": "Variar.",
        }
    ]


def test_peso_null_se_permite():
    objetivo = {
        "ejercicio": "Press de banca",
        "peso_kg": None,
        "reps_min": 8,
        "reps_max": 12,
        "motivo": "x",
    }
    assert validar(respuesta(objetivos=[objetivo]), contexto())["objetivos"][0]["peso_kg"] is None


def _objetivo(peso, reps_min=8, reps_max=12):
    return [
        {
            "ejercicio": "Press de banca",
            "peso_kg": peso,
            "reps_min": reps_min,
            "reps_max": reps_max,
            "motivo": "x",
        }
    ]


@pytest.mark.parametrize(
    ("texto", "mensaje"),
    [
        ("esto no es json", "no es JSON"),
        ("[]", "no es un objeto"),
        (respuesta(anadir="x"), "lista"),
        (respuesta(resumen=""), "resumen"),
        (
            respuesta(
                anadir=[
                    {
                        "ejercicio": "Press hiperbólico",
                        "series": 3,
                        "reps_min": 8,
                        "reps_max": 12,
                        "motivo": "x",
                    }
                ]
            ),
            "no está en el catálogo",
        ),
        (
            respuesta(
                anadir=[
                    {
                        "ejercicio": "Press de banca",
                        "series": 3,
                        "reps_min": 8,
                        "reps_max": 12,
                        "motivo": "x",
                    }
                ]
            ),
            "ya está en la rutina",
        ),
        (
            respuesta(
                anadir=[
                    {
                        "ejercicio": "Fondos",
                        "series": 11,
                        "reps_min": 8,
                        "reps_max": 12,
                        "motivo": "x",
                    }
                ]
            ),
            "series",
        ),
        (
            respuesta(sustituir=[{"quitar": "Sentadilla", "poner": "Fondos", "motivo": "x"}]),
            "no está en la rutina",
        ),
        (
            respuesta(
                sustituir=[
                    {"quitar": "Press de banca", "poner": "Aperturas con mancuernas", "motivo": "x"}
                ]
            ),
            "repetido",
        ),
        (
            respuesta(
                objetivos=[
                    {
                        "ejercicio": "Sentadilla",
                        "peso_kg": 50,
                        "reps_min": 8,
                        "reps_max": 12,
                        "motivo": "x",
                    }
                ]
            ),
            "no está en la rutina",
        ),
        (respuesta(objetivos=_objetivo(82.5, 12, 8)), "reps_min"),
        (respuesta(objetivos=_objetivo(82.5, 0, 8)), "reps_min"),
        (respuesta(objetivos=_objetivo(82.5, 8, 51)), "reps_max"),
        (respuesta(objetivos=_objetivo(-5)), "Peso no válido"),
        (respuesta(objetivos=_objetivo("80")), "Peso no válido"),
        # Última sesión 80 kg: como mucho 88 kg (+10 %).
        (respuesta(objetivos=_objetivo(90)), "Subida de peso excesiva"),
        (
            respuesta(
                objetivos=[
                    {"ejercicio": "Press de banca", "peso_kg": 80, "reps_min": 8, "reps_max": 12}
                ]
            ),
            "motivo",
        ),
    ],
)
def test_respuesta_invalida(texto, mensaje):
    with pytest.raises(RespuestaInvalida, match=mensaje):
        validar(texto, contexto())


def test_subida_limite_10_por_ciento_o_2_5_kg():
    assert validar(respuesta(objetivos=_objetivo(88)), contexto())["objetivos"][0]["peso_kg"] == 88
    # Con 10 kg, el 10 % es 1 kg: se permiten 2,5 kg.
    poco = {1: (Sesion("2026-11-08", ((10.0, 12),)),)}
    assert validar(respuesta(objetivos=_objetivo(12.5)), contexto(historial=poco))
    with pytest.raises(RespuestaInvalida):
        validar(respuesta(objetivos=_objetivo(13)), contexto(historial=poco))


def test_sin_historial_como_mucho_el_doble_del_peso_corporal():
    c = contexto(historial={}, peso_corporal_kg=60.0)
    assert validar(respuesta(objetivos=_objetivo(120)), c)
    with pytest.raises(RespuestaInvalida, match="excesiva"):
        validar(respuesta(objetivos=_objetivo(121)), c)


def test_demasiadas_sugerencias():
    item = {"ejercicio": "Fondos", "series": 3, "reps_min": 8, "reps_max": 12, "motivo": "x"}
    with pytest.raises(RespuestaInvalida, match="más de 3"):
        validar(respuesta(anadir=[item] * 4), contexto())


# --- Cliente de Gemini (SDK simulado) ----------------------------------------------------


class SdkFalso:
    def __init__(self, resultado=None, error=None):
        self.resultado, self.error, self.llamadas = resultado, error, []
        self.models = self

    def generate_content(self, **kwargs):
        self.llamadas.append(kwargs)
        if self.error:
            raise self.error

        class R:
            text = self.resultado

        return R()


def test_cliente_pide_json_con_el_esquema_y_el_modelo_de_env():
    sdk = SdkFalso(resultado='{"ok": 1}')
    cliente = gemini.ClienteGemini("clave", "gemini-3.1-flash-lite", sdk=sdk)
    assert cliente.generar("hola", ESQUEMA) == '{"ok": 1}'
    llamada = sdk.llamadas[0]
    assert llamada["model"] == "gemini-3.1-flash-lite"
    assert llamada["contents"] == "hola"
    assert llamada["config"].response_mime_type == "application/json"
    assert llamada["config"].response_json_schema == ESQUEMA
    assert llamada["config"].max_output_tokens == gemini.MAX_TOKENS_RESPUESTA


def test_cliente_429_es_limite_alcanzado():
    error = errors.ClientError(429, {"error": {"message": "Quota", "status": "RESOURCE_EXHAUSTED"}})
    with pytest.raises(gemini.LimiteAlcanzado):
        gemini.ClienteGemini("k", "m", sdk=SdkFalso(error=error)).generar("x", ESQUEMA)


@pytest.mark.parametrize(
    "error",
    [
        errors.ServerError(503, {"error": {"message": "Ocupado"}}),
        errors.ClientError(400, {"error": {"message": "Mal"}}),
        ConnectionError("sin red"),
    ],
)
def test_cliente_otros_errores_son_error_ia(error):
    with pytest.raises(gemini.ErrorIA):
        gemini.ClienteGemini("k", "m", sdk=SdkFalso(error=error)).generar("x", ESQUEMA)


def test_cliente_respuesta_vacia_es_texto_vacio():
    assert gemini.ClienteGemini("k", "m", sdk=SdkFalso(resultado=None)).generar("x", {}) == ""


def test_sin_clave_o_sin_modelo_no_hay_cliente(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    assert gemini.cliente_desde_entorno() is None
    monkeypatch.setenv("GEMINI_API_KEY", "clave-inventada")
    monkeypatch.setenv("GEMINI_MODEL", "")
    assert gemini.cliente_desde_entorno() is None
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    cliente = gemini.cliente_desde_entorno()
    assert cliente is not None and cliente.modelo == "gemini-3.1-flash-lite"
