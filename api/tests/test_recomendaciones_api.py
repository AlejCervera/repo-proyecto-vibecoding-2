"""POST /rutinas/{id}/recomendaciones con una IA falsa (nunca se llama a Gemini)."""

import json

import pytest

from app.main import app
from app.recomendaciones.gemini import ErrorIA, LimiteAlcanzado
from app.recomendaciones.routes import INVALIDA, LIMITE, SIN_PERFIL, obtener_ia
from app.rutinas.predefinidas import sembrar


class IaFalsa:
    def __init__(self, respuesta: dict | None = None, error: Exception | None = None):
        self.respuesta, self.error, self.prompts = respuesta, error, []

    def generar(self, prompt, esquema):
        self.prompts.append(prompt)
        if self.error:
            raise self.error
        return json.dumps(self.respuesta)


@pytest.fixture
def usar_ia():
    """Instala una IA falsa para las peticiones; la quita al terminar."""

    def instalar(ia):
        app.dependency_overrides[obtener_ia] = lambda: ia
        return ia

    yield instalar
    app.dependency_overrides.pop(obtener_ia, None)


@pytest.fixture
def rutina(ana, catalogo):
    r = ana.post("/rutinas", json={"nombre": "Empuje"}).json()
    ana.post(
        f"/rutinas/{r['id']}/ejercicios",
        json={"ejercicio_id": catalogo["Press de banca"], "reps_min": 8, "reps_max": 12},
    )
    ana.put("/perfil", json={"altura_cm": 180, "peso_corporal_kg": 85})
    return r


def serie(cliente, ejercicio_id, peso, reps, fecha):
    r = cliente.post(
        "/series",
        json={"fecha": fecha, "ejercicio_id": ejercicio_id, "peso_kg": peso, "repeticiones": reps},
    )
    assert r.status_code == 201


RESPUESTA = {
    "resumen": "Sube en press de banca y añade press militar.",
    "anadir": [
        {
            "ejercicio": "Press militar",
            "series": 3,
            "reps_min": 8,
            "reps_max": 10,
            "motivo": "Hombro.",
        }
    ],
    "sustituir": [],
    "objetivos": [
        {
            "ejercicio": "Press de banca",
            "peso_kg": 82.5,
            "reps_min": 8,
            "reps_max": 12,
            "motivo": "80 × 12 en todas.",
        }
    ],
}


def pedir(cliente, rutina_id):
    return cliente.post(f"/rutinas/{rutina_id}/recomendaciones")


def test_recomendaciones_con_historial_de_pesos_y_repeticiones(ana, bea, catalogo, rutina, usar_ia):
    banca = catalogo["Press de banca"]
    serie(ana, banca, 80, 12, "2026-11-08")
    serie(ana, banca, 80, 11, "2026-11-08")
    serie(ana, banca, 75, 10, "2026-11-01")
    serie(bea, banca, 200, 1, "2026-11-09")  # de otra cuenta: no se envía
    ia = usar_ia(IaFalsa(RESPUESTA))

    r = pedir(ana, rutina["id"])
    assert r.status_code == 200
    datos = r.json()
    assert datos["anadir"][0]["ejercicio_id"] == catalogo["Press militar"]
    assert datos["objetivos"][0] | {"motivo": ""} == {
        "ejercicio_id": banca,
        "nombre": "Press de banca",
        "peso_kg": 82.5,
        "reps_min": 8,
        "reps_max": 12,
        "motivo": "",
    }
    prompt = ia.prompts[0]
    assert "Altura 180 cm, peso corporal 85 kg." in prompt
    assert "2026-11-08: 80 kg × 12, 80 kg × 11" in prompt
    assert "2026-11-01: 75 kg × 10" in prompt
    assert "200 kg" not in prompt
    assert "Sentadilla" in prompt  # catálogo


def test_429_avisa_del_limite(ana, rutina, usar_ia):
    usar_ia(IaFalsa(error=LimiteAlcanzado()))
    r = pedir(ana, rutina["id"])
    assert r.status_code == 429
    assert r.json() == {"error": LIMITE}


def test_respuesta_invalida_502(ana, rutina, usar_ia):
    malo = RESPUESTA | {
        "anadir": [
            {"ejercicio": "Inventado", "series": 3, "reps_min": 8, "reps_max": 12, "motivo": "x"}
        ]
    }
    usar_ia(IaFalsa(malo))
    r = pedir(ana, rutina["id"])
    assert r.status_code == 502
    assert r.json() == {"error": INVALIDA}


def test_subida_absurda_sobre_el_historial_502(ana, catalogo, rutina, usar_ia):
    serie(ana, catalogo["Press de banca"], 60, 10, "2026-11-08")
    usar_ia(IaFalsa(RESPUESTA))  # 82,5 kg cuando la última vez fueron 60 kg
    assert pedir(ana, rutina["id"]).status_code == 502


def test_fallo_de_conexion_502(ana, rutina, usar_ia):
    usar_ia(IaFalsa(error=ErrorIA("sin red")))
    r = pedir(ana, rutina["id"])
    assert r.status_code == 502
    assert "No se ha podido contactar" in r.json()["error"]


def test_sin_perfil_400_y_no_llama_a_la_ia(ana, catalogo, usar_ia):
    r = ana.post("/rutinas", json={"nombre": "Pierna"}).json()
    ia = usar_ia(IaFalsa(RESPUESTA))
    respuesta = pedir(ana, r["id"])
    assert respuesta.status_code == 400
    assert respuesta.json() == {"error": SIN_PERFIL}
    assert ia.prompts == []


def test_sin_configurar_503(ana, rutina, usar_ia, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    r = pedir(ana, rutina["id"])
    assert r.status_code == 503
    assert "GEMINI_API_KEY" in r.json()["error"]


def test_predefinida_403_ajena_404_sin_sesion_401(conn, ana, bea, client, rutina, usar_ia):
    usar_ia(IaFalsa(RESPUESTA))
    sembrar(conn, [{"clave": "pecho", "nombre": "Pecho", "wger_ids": [1]}])
    predefinida = next(x for x in ana.get("/rutinas").json() if x["predefinida"])
    assert pedir(ana, predefinida["id"]).status_code == 403
    assert pedir(bea, rutina["id"]).status_code == 404
    assert pedir(client, rutina["id"]).status_code == 401
