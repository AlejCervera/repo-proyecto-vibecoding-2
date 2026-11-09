from datetime import date

import pytest

from app.migrate import migrate

SERIE = {"fecha": "2026-11-01", "ejercicio": "Press banca", "peso_kg": 80, "repeticiones": 8}


def contar(conn):
    return conn.execute("SELECT count(*) FROM series").fetchone()[0]


def test_crear_y_listar(client):
    r = client.post("/series", json=SERIE)
    assert r.status_code == 201
    creada = r.json()
    assert creada == {**SERIE, "id": creada["id"], "peso_kg": 80.0}

    assert client.get("/series").json() == [creada]


def test_sin_fecha_se_guarda_hoy(client):
    r = client.post("/series", json={**SERIE, "fecha": None})
    assert r.json()["fecha"] == date.today().isoformat()


def test_lista_la_mas_reciente_primero(client):
    client.post("/series", json={**SERIE, "fecha": "2026-11-01", "peso_kg": 80})
    client.post("/series", json={**SERIE, "fecha": "2026-11-05", "peso_kg": 85})
    client.post("/series", json={**SERIE, "fecha": "2026-11-05", "peso_kg": 90})
    pesos = [s["peso_kg"] for s in client.get("/series").json()]
    assert pesos == [90.0, 85.0, 80.0]


@pytest.mark.parametrize(
    "cambios",
    [{"peso_kg": None}, {"peso_kg": 0}, {"peso_kg": -1}, {"repeticiones": 0}, {"ejercicio": ""}],
)
def test_datos_invalidos_dan_400_y_no_guardan(client, conn, cambios):
    r = client.post("/series", json={**SERIE, **cambios})
    assert r.status_code == 400
    assert r.json()["error"]
    assert contar(conn) == 0


def test_cuerpo_que_no_es_json_da_400(client, conn):
    r = client.post("/series", content=b"no es json", headers={"content-type": "application/json"})
    assert r.status_code == 400
    assert contar(conn) == 0


def test_migrar_dos_veces_no_falla(conn):
    assert migrate(conn) == []
