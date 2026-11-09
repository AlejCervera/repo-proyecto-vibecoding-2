import pytest

from tests.imagenes_falsas import PNG


def crear(cliente, nombre):
    r = cliente.post("/ejercicios", json={"nombre": nombre})
    assert r.status_code == 201
    return r.json()


def serie(cliente, ejercicio_id, peso=50):
    r = cliente.post(
        "/series",
        json={"fecha": "2026-11-09", "ejercicio_id": ejercicio_id, "peso_kg": peso, "repeticiones": 10},
    )
    assert r.status_code == 201
    return r.json()


def contar(conn, tabla):
    return conn.execute(f"SELECT count(*) FROM {tabla}").fetchone()[0]


@pytest.fixture
def remo(ana):
    return crear(ana, "Remo maquina")


def test_mis_ejercicios_con_numero_de_series(ana, bea, remo, catalogo):
    otro = crear(ana, "Curl martillo")
    serie(ana, remo["id"])
    serie(ana, remo["id"])
    crear(bea, "De Bea")
    assert ana.get("/ejercicios/propios").json() == [
        {"id": otro["id"], "nombre": "Curl martillo", "num_series": 0},
        {"id": remo["id"], "nombre": "Remo maquina", "num_series": 2},
    ]


def test_renombrar(ana, remo):
    r = ana.put(f"/ejercicios/{remo['id']}", json={"nombre": "Remo en máquina"})
    assert r.status_code == 200
    assert r.json()["nombre"] == "Remo en máquina"
    assert ana.get("/ejercicios", params={"q": "remo en maquina"}).json()[0]["id"] == remo["id"]


def test_renombrar_solo_mayusculas_esta_permitido(ana, remo):
    r = ana.put(f"/ejercicios/{remo['id']}", json={"nombre": "REMO MAQUINA"})
    assert r.status_code == 200


def test_renombrar_a_un_nombre_existente_da_409(ana, remo, catalogo):
    crear(ana, "Curl martillo")
    assert ana.put(f"/ejercicios/{remo['id']}", json={"nombre": "curl  martillo"}).status_code == 409
    r = ana.put(f"/ejercicios/{remo['id']}", json={"nombre": "Press de BANCA"})
    assert r.status_code == 409
    assert r.json()["ejercicio"]["nombre"] == "Press de banca"


def test_renombrar_nombre_invalido_da_400(ana, remo):
    assert ana.put(f"/ejercicios/{remo['id']}", json={"nombre": " "}).status_code == 400


def test_no_se_renombran_ni_borran_los_del_catalogo_ni_los_de_otro(ana, bea, remo, catalogo):
    banca = catalogo["Press de banca"]
    assert ana.put(f"/ejercicios/{banca}", json={"nombre": "Mío"}).status_code == 404
    assert ana.delete(f"/ejercicios/{banca}").status_code == 404
    assert bea.put(f"/ejercicios/{remo['id']}", json={"nombre": "Mío"}).status_code == 404
    assert bea.delete(f"/ejercicios/{remo['id']}").status_code == 404
    assert ana.get("/ejercicios/propios").json()[0]["nombre"] == "Remo maquina"


def test_borrar_sin_series(ana, remo, conn):
    ana.put(f"/ejercicios/{remo['id']}/imagen", content=PNG)
    assert ana.delete(f"/ejercicios/{remo['id']}").status_code == 204
    assert ana.get("/ejercicios/propios").json() == []
    assert contar(conn, "imagenes") == 0  # su imagen se borra con él


def test_borrar_con_series_sin_decidir_da_409_y_no_borra(ana, remo, conn):
    serie(ana, remo["id"])
    serie(ana, remo["id"])
    r = ana.delete(f"/ejercicios/{remo['id']}")
    assert r.status_code == 409
    assert r.json()["num_series"] == 2
    assert contar(conn, "series") == 2


def test_borrar_con_sus_series(ana, remo, conn, catalogo):
    serie(ana, remo["id"])
    otra = serie(ana, catalogo["Sentadilla"])
    assert ana.delete(f"/ejercicios/{remo['id']}", params={"series": "borrar"}).status_code == 204
    assert ana.get("/series").json() == [otra]


def test_pasar_las_series_a_otro_ejercicio(ana, remo, catalogo):
    destino = crear(ana, "Remo en máquina")
    s1 = serie(ana, remo["id"], peso=50)
    s2 = serie(ana, remo["id"], peso=55)
    r = ana.delete(f"/ejercicios/{remo['id']}", params={"mover_a": destino["id"]})
    assert r.status_code == 204
    historial = ana.get(f"/ejercicios/{destino['id']}/series").json()["series"]
    assert sorted(s["id"] for s in historial) == sorted([s1["id"], s2["id"]])
    assert {s["peso_kg"] for s in historial} == {50.0, 55.0}
    assert ana.get(f"/ejercicios/{remo['id']}/series").status_code == 404


def test_pasar_a_uno_del_catalogo(ana, remo, catalogo):
    serie(ana, remo["id"])
    params = {"mover_a": catalogo["Remo con barra"]}
    assert ana.delete(f"/ejercicios/{remo['id']}", params=params).status_code == 204
    assert ana.get("/series").json()[0]["ejercicio"] == "Remo con barra"


@pytest.mark.parametrize(
    "params",
    [{"series": "quizas"}, {"series": "borrar", "mover_a": 1}, {"mover_a": 99999}],
)
def test_opciones_de_borrado_invalidas_dan_400_y_no_borran(ana, remo, conn, params):
    serie(ana, remo["id"])
    assert ana.delete(f"/ejercicios/{remo['id']}", params=params).status_code == 400
    assert contar(conn, "series") == 1
    assert len(ana.get("/ejercicios/propios").json()) == 1


def test_no_se_puede_pasar_a_un_ejercicio_propio_de_otro(ana, bea, remo, conn):
    ajeno = crear(bea, "De Bea")
    serie(ana, remo["id"])
    r = ana.delete(f"/ejercicios/{remo['id']}", params={"mover_a": ajeno["id"]})
    assert r.status_code == 400
    assert contar(conn, "series") == 1


def test_sin_sesion_da_401(client, remo):
    assert client.get("/ejercicios/propios").status_code == 401
    assert client.put(f"/ejercicios/{remo['id']}", json={"nombre": "x"}).status_code == 401
    assert client.delete(f"/ejercicios/{remo['id']}").status_code == 401
