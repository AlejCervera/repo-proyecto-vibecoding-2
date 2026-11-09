import pytest


@pytest.fixture
def datos(catalogo):
    return {
        "fecha": "2026-11-09",
        "ejercicio_id": catalogo["Press de banca"],
        "peso_kg": 80,
        "repeticiones": 8,
    }


@pytest.fixture
def serie(ana, datos):
    return ana.post("/series", json=datos).json()


def test_corregir_peso(ana, serie, datos):
    r = ana.put(f"/series/{serie['id']}", json={**datos, "peso_kg": 82.5})
    assert r.status_code == 200
    assert r.json() == {**serie, "peso_kg": 82.5}
    assert ana.get("/series").json() == [{**serie, "peso_kg": 82.5}]


def test_corregir_ejercicio_y_fecha(ana, serie, datos, catalogo):
    cambios = {**datos, "ejercicio_id": catalogo["Sentadilla"], "fecha": "2026-11-01"}
    r = ana.put(f"/series/{serie['id']}", json=cambios)
    assert r.json()["ejercicio"] == "Sentadilla"
    assert r.json()["fecha"] == "2026-11-01"


@pytest.mark.parametrize(
    "cambios", [{"peso_kg": 0}, {"repeticiones": 0}, {"ejercicio_id": 99999}, {"fecha": "x"}]
)
def test_corregir_con_datos_invalidos_da_400_y_no_cambia(ana, serie, datos, cambios):
    assert ana.put(f"/series/{serie['id']}", json={**datos, **cambios}).status_code == 400
    assert ana.get("/series").json() == [serie]


def test_borrar_serie(ana, serie):
    assert ana.delete(f"/series/{serie['id']}").status_code == 204
    assert ana.get("/series").json() == []
    assert ana.delete(f"/series/{serie['id']}").status_code == 404


def test_no_se_tocan_series_de_otro_usuario(ana, bea, serie, datos):
    assert bea.put(f"/series/{serie['id']}", json={**datos, "peso_kg": 1}).status_code == 404
    assert bea.delete(f"/series/{serie['id']}").status_code == 404
    assert ana.get("/series").json() == [serie]


def test_no_se_puede_mover_a_ejercicio_propio_de_otro(ana, bea, serie, datos):
    ajeno = bea.post("/ejercicios", json={"nombre": "De Bea"}).json()
    r = ana.put(f"/series/{serie['id']}", json={**datos, "ejercicio_id": ajeno["id"]})
    assert r.status_code == 400
    assert ana.get("/series").json() == [serie]


def test_sin_sesion_da_401(client, serie, datos):
    assert client.put(f"/series/{serie['id']}", json=datos).status_code == 401
    assert client.delete(f"/series/{serie['id']}").status_code == 401
