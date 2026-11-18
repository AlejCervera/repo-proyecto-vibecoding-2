"""Fase 9g: notas en series y entrenos, superseries en las rutinas y peso de la barra."""

import pytest

from app.rutinas.logica import error_al_unir, siguen_unidos

# --- Notas ----------------------------------------------------------------------------------


def serie(cliente, ejercicio_id, fecha="2026-11-09"):
    r = cliente.post(
        "/series",
        json={"fecha": fecha, "ejercicio_id": ejercicio_id, "peso_kg": 80, "repeticiones": 8},
    )
    assert r.status_code == 201
    return r.json()


def test_una_serie_nueva_no_tiene_nota_y_se_le_puede_poner_y_quitar(ana, catalogo):
    s = serie(ana, catalogo["Press de banca"])
    assert s["nota"] is None
    r = ana.put(f"/series/{s['id']}/nota", json={"nota": "  molestia en el hombro "})
    assert r.status_code == 200
    assert r.json()["nota"] == "molestia en el hombro"
    assert ana.get(f"/ejercicios/{catalogo['Press de banca']}/series").json()["series"][0]["nota"] == (
        "molestia en el hombro"
    )
    assert ana.put(f"/series/{s['id']}/nota", json={"nota": "   "}).json()["nota"] is None


def test_editar_la_serie_no_borra_su_nota(ana, catalogo):
    s = serie(ana, catalogo["Press de banca"])
    ana.put(f"/series/{s['id']}/nota", json={"nota": "agarre cerrado"})
    datos = {"fecha": "2026-11-09", "ejercicio_id": catalogo["Press de banca"], "peso_kg": 82.5, "repeticiones": 6}
    assert ana.put(f"/series/{s['id']}", json=datos).json()["nota"] == "agarre cerrado"


@pytest.mark.parametrize(
    ("datos", "error"),
    [
        ({"nota": "x" * 201}, "La nota no puede pasar de 200 caracteres"),
        ({"nota": 5}, "La nota debe ser un texto"),
        ([], "Los datos no son válidos"),
    ],
)
def test_notas_de_serie_invalidas(ana, catalogo, datos, error):
    s = serie(ana, catalogo["Press de banca"])
    r = ana.put(f"/series/{s['id']}/nota", json=datos)
    assert (r.status_code, r.json()["error"]) == (400, error)


def test_no_se_puede_anotar_la_serie_de_otro(ana, bea, catalogo):
    s = serie(ana, catalogo["Press de banca"])
    assert bea.put(f"/series/{s['id']}/nota", json={"nota": "hola"}).status_code == 404


def entreno(cliente, catalogo):
    rutina = cliente.post("/rutinas", json={"nombre": "Pecho"}).json()
    cliente.post(f"/rutinas/{rutina['id']}/ejercicios", json={"ejercicio_id": catalogo["Press de banca"]})
    serie(cliente, catalogo["Press de banca"])
    r = cliente.post("/entrenamientos", json={"rutina_id": rutina["id"], "fecha": "2026-11-09"})
    assert r.status_code == 201
    return r.json()


def test_nota_del_entreno(ana, bea, catalogo):
    e = entreno(ana, catalogo)
    assert e["nota"] is None
    r = ana.put(f"/entrenamientos/{e['id']}/nota", json={"nota": "poco dormido"})
    assert (r.status_code, r.json()["nota"]) == (200, "poco dormido")
    assert ana.get(f"/entrenamientos/{e['id']}").json()["nota"] == "poco dormido"
    assert ana.put(f"/entrenamientos/{e['id']}/nota", json={"nota": "x" * 501}).status_code == 400
    assert bea.put(f"/entrenamientos/{e['id']}/nota", json={"nota": "hola"}).status_code == 404


def test_las_notas_de_las_series_salen_en_el_detalle_del_entreno(ana, catalogo):
    e = entreno(ana, catalogo)
    s = e["ejercicios"][0]["series"][0]
    ana.put(f"/series/{s['id']}/nota", json={"nota": "fácil"})
    detalle = ana.get(f"/entrenamientos/{e['id']}").json()
    assert detalle["ejercicios"][0]["series"][0]["nota"] == "fácil"


# --- Superseries: lógica pura -----------------------------------------------------------------


def test_error_al_unir():
    orden = [(1, False), (2, False), (3, False)]
    assert error_al_unir(orden, 1) is None
    assert error_al_unir(orden, 3) == "No hay un ejercicio después para hacer la superserie"
    assert error_al_unir(orden, 9) == "Ese ejercicio no está en la rutina"
    unidos = [(1, True), (2, False), (3, False)]
    assert error_al_unir(unidos, 2) == "Ese ejercicio ya está en una superserie"  # 2 va con 1
    assert error_al_unir(unidos, 1) is None  # volver a unir lo ya unido no es error
    assert error_al_unir([(1, False), (2, True), (3, False)], 1) == (
        "El siguiente ya está en una superserie"
    )


def test_siguen_unidos_solo_si_conservan_el_mismo_siguiente():
    antes = [(1, True), (2, False), (3, True), (4, False)]
    assert siguen_unidos(antes, [1, 2, 3, 4]) == {1, 3}
    assert siguen_unidos(antes, [3, 4, 1, 2]) == {1, 3}  # se movió el par entero
    assert siguen_unidos(antes, [2, 1, 3, 4]) == {3}  # 1 ya no va seguido de 2
    assert siguen_unidos(antes, [1, 3, 4]) == {3}  # se quitó el 2


# --- Superseries: API ---------------------------------------------------------------------------


@pytest.fixture
def rutina(ana, catalogo):
    r = ana.post("/rutinas", json={"nombre": "Torso"}).json()
    for nombre in ["Press de banca", "Remo con barra", "Press militar"]:
        ana.post(f"/rutinas/{r['id']}/ejercicios", json={"ejercicio_id": catalogo[nombre]})
    return ana.get(f"/rutinas/{r['id']}").json()


def unidos(rutina_json):
    return [e["nombre"] for e in rutina_json["ejercicios"] if e["con_siguiente"]]


def unir(cliente, rutina, ejercicio_id, si=True):
    return cliente.put(
        f"/rutinas/{rutina['id']}/ejercicios/{ejercicio_id}/superserie", json={"con_siguiente": si}
    )


def test_unir_y_separar(ana, rutina, catalogo):
    assert unidos(rutina) == []
    r = unir(ana, rutina, catalogo["Press de banca"])
    assert r.status_code == 200
    assert unidos(r.json()) == ["Press de banca"]
    assert unidos(unir(ana, rutina, catalogo["Press de banca"], False).json()) == []


def test_no_se_puede_encadenar_ni_unir_el_ultimo(ana, rutina, catalogo):
    unir(ana, rutina, catalogo["Press de banca"])
    r = unir(ana, rutina, catalogo["Remo con barra"])
    assert (r.status_code, r.json()["error"]) == (400, "Ese ejercicio ya está en una superserie")
    r = unir(ana, rutina, catalogo["Press militar"])
    assert r.status_code == 400
    assert unir(ana, rutina, catalogo["Sentadilla"]).status_code == 404


def test_al_reordenar_o_quitar_se_deshacen_las_superseries_rotas(ana, rutina, catalogo):
    banca, remo, militar = (catalogo[n] for n in ["Press de banca", "Remo con barra", "Press militar"])
    unir(ana, rutina, banca)
    r = ana.put(f"/rutinas/{rutina['id']}/orden", json={"ejercicios": [militar, banca, remo]})
    assert unidos(r.json()) == ["Press de banca"]  # el par sigue junto
    r = ana.put(f"/rutinas/{rutina['id']}/orden", json={"ejercicios": [banca, militar, remo]})
    assert unidos(r.json()) == []  # ya no van seguidos
    unir(ana, rutina, banca)
    r = ana.delete(f"/rutinas/{rutina['id']}/ejercicios/{militar}")
    assert unidos(r.json()) == []  # se quitó el segundo del par


def test_las_superseries_se_copian_con_la_rutina(ana, rutina, catalogo):
    unir(ana, rutina, catalogo["Remo con barra"])
    copia = ana.post(f"/rutinas/{rutina['id']}/copiar").json()
    assert unidos(copia) == ["Remo con barra"]


def test_solo_en_tus_rutinas(ana, bea, rutina, catalogo):
    assert unir(bea, rutina, catalogo["Press de banca"]).status_code in (403, 404)
    r = ana.put(
        f"/rutinas/{rutina['id']}/ejercicios/{catalogo['Press de banca']}/superserie", json={}
    )
    assert r.status_code == 400


# --- Peso de la barra ---------------------------------------------------------------------------


def test_la_barra_es_de_20_kg_por_defecto_y_se_puede_cambiar(ana):
    assert ana.get("/perfil").json()["barra_kg"] == 20
    r = ana.put("/perfil", json={"altura_cm": None, "peso_corporal_kg": None, "barra_kg": 15})
    assert (r.status_code, r.json()["barra_kg"]) == (200, 15)
    assert ana.get("/perfil").json()["barra_kg"] == 15


def test_sin_barra_en_la_peticion_se_conserva(ana):
    ana.put("/perfil", json={"altura_cm": None, "peso_corporal_kg": None, "barra_kg": 10})
    ana.put("/perfil", json={"altura_cm": 180, "peso_corporal_kg": None})
    assert ana.get("/perfil").json()["barra_kg"] == 10


@pytest.mark.parametrize("barra", [-1, 51, "veinte", True])
def test_barra_invalida(ana, barra):
    r = ana.put("/perfil", json={"altura_cm": None, "peso_corporal_kg": None, "barra_kg": barra})
    assert (r.status_code, r.json()["error"]) == (400, "La barra debe pesar entre 0 y 50 kg")
