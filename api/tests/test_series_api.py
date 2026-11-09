from datetime import date

import pytest

from app.migrate import migrate


def contar(conn):
    return conn.execute("SELECT count(*) FROM series").fetchone()[0]


@pytest.fixture
def serie(catalogo):
    return {
        "fecha": "2026-11-01",
        "ejercicio_id": catalogo["Press de banca"],
        "peso_kg": 80,
        "repeticiones": 8,
    }


def test_crear_y_listar(ana, serie):
    r = ana.post("/series", json=serie)
    assert r.status_code == 201
    creada = r.json()
    assert creada == {**serie, "id": creada["id"], "peso_kg": 80.0, "ejercicio": "Press de banca"}

    assert ana.get("/series").json() == [creada]


def test_sin_fecha_se_guarda_hoy(ana, serie):
    r = ana.post("/series", json={**serie, "fecha": None})
    assert r.json()["fecha"] == date.today().isoformat()


def test_lista_la_mas_reciente_primero(ana, serie):
    ana.post("/series", json={**serie, "fecha": "2026-11-01", "peso_kg": 80})
    ana.post("/series", json={**serie, "fecha": "2026-11-05", "peso_kg": 85})
    ana.post("/series", json={**serie, "fecha": "2026-11-05", "peso_kg": 90})
    pesos = [s["peso_kg"] for s in ana.get("/series").json()]
    assert pesos == [90.0, 85.0, 80.0]


@pytest.mark.parametrize(
    "cambios",
    [
        {"peso_kg": None},
        {"peso_kg": 0},
        {"peso_kg": -1},
        {"repeticiones": 0},
        {"ejercicio_id": None},
        {"ejercicio_id": 9999},
    ],
)
def test_datos_invalidos_dan_400_y_no_guardan(ana, conn, serie, cambios):
    r = ana.post("/series", json={**serie, **cambios})
    assert r.status_code == 400
    assert r.json()["error"]
    assert contar(conn) == 0


def test_no_se_puede_usar_el_ejercicio_propio_de_otro(ana, bea, conn, serie):
    propio = ana.post("/ejercicios", json={"nombre": "Mi ejercicio"}).json()
    r = bea.post("/series", json={**serie, "ejercicio_id": propio["id"]})
    assert r.status_code == 400
    assert r.json() == {"error": "El ejercicio no existe"}
    assert contar(conn) == 0


def test_cuerpo_que_no_es_json_da_400(ana, conn):
    r = ana.post("/series", content=b"no es json", headers={"content-type": "application/json"})
    assert r.status_code == 400
    assert contar(conn) == 0


def test_sin_sesion_da_401(client, conn, serie):
    assert client.get("/series").status_code == 401
    r = client.post("/series", json=serie)
    assert r.status_code == 401
    assert r.json() == {"error": "Inicia sesión para continuar"}
    assert contar(conn) == 0


def test_cada_usuario_ve_solo_sus_series(ana, bea, serie, catalogo):
    ana.post("/series", json=serie)
    bea.post("/series", json={**serie, "ejercicio_id": catalogo["Sentadilla"]})
    assert [s["ejercicio"] for s in ana.get("/series").json()] == ["Press de banca"]
    assert [s["ejercicio"] for s in bea.get("/series").json()] == ["Sentadilla"]


def test_migrar_dos_veces_no_falla(conn):
    assert migrate(conn) == []
