"""Perfil: altura y peso corporal de cada cuenta (Fase 8c)."""

import pytest

from app.perfil.logica import Perfil, PerfilInvalido, validar_perfil

# --- Lógica -------------------------------------------------------------------------------


def test_perfil_valido_redondea_el_peso():
    assert validar_perfil({"altura_cm": 178, "peso_corporal_kg": 80.26}) == Perfil(178, 80.3)
    assert validar_perfil({"altura_cm": 178.0, "peso_corporal_kg": 80}) == Perfil(178, 80.0)


def test_perfil_vacio_se_permite_y_no_esta_completo():
    perfil = validar_perfil({"altura_cm": None, "peso_corporal_kg": None})
    assert perfil == Perfil() and not perfil.completo
    assert Perfil(170, 60).completo


@pytest.mark.parametrize(
    ("datos", "mensaje"),
    [
        ({"altura_cm": 99}, "altura"),
        ({"altura_cm": 251}, "altura"),
        ({"altura_cm": 170.5}, "altura"),
        ({"altura_cm": "170"}, "altura"),
        ({"altura_cm": True}, "altura"),
        ({"peso_corporal_kg": 29.9}, "peso"),
        ({"peso_corporal_kg": 301}, "peso"),
        ({"peso_corporal_kg": "80"}, "peso"),
        ("x", "no son válidos"),
    ],
)
def test_perfil_invalido(datos, mensaje):
    with pytest.raises(PerfilInvalido, match=mensaje):
        validar_perfil(datos)


# --- API ----------------------------------------------------------------------------------


def test_perfil_nuevo_esta_vacio(ana):
    assert ana.get("/perfil").json() == {"altura_cm": None, "peso_corporal_kg": None}


def test_guardar_y_leer_perfil(ana):
    r = ana.put("/perfil", json={"altura_cm": 178, "peso_corporal_kg": 80.5})
    assert r.status_code == 200
    assert ana.get("/perfil").json() == {"altura_cm": 178, "peso_corporal_kg": 80.5}


def test_perfil_invalido_400(ana):
    r = ana.put("/perfil", json={"altura_cm": 50, "peso_corporal_kg": 80})
    assert r.status_code == 400
    assert "altura" in r.json()["error"]


def test_cada_cuenta_ve_su_perfil(ana, bea):
    ana.put("/perfil", json={"altura_cm": 178, "peso_corporal_kg": 80})
    assert bea.get("/perfil").json() == {"altura_cm": None, "peso_corporal_kg": None}


def test_perfil_sin_sesion_401(client):
    assert client.get("/perfil").status_code == 401
    assert client.put("/perfil", json={}).status_code == 401
