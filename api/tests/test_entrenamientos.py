"""Diario de entrenamientos (Fase 8b)."""

from datetime import date

import pytest

from app.entrenamientos.logica import EntrenamientoInvalido, agrupar_por_ejercicio, validar

HOY = "2026-11-09"

# --- Lógica -------------------------------------------------------------------------------


def test_validar():
    assert validar({"rutina_id": 3, "fecha": HOY}).fecha == date(2026, 11, 9)
    assert validar({"rutina_id": 3}, hoy=date(2026, 1, 1)).fecha == date(2026, 1, 1)
    for malo in [{}, {"rutina_id": "3"}, {"rutina_id": 0}, {"rutina_id": 3, "fecha": "x"}, "x"]:
        with pytest.raises(EntrenamientoInvalido):
            validar(malo)


def test_agrupar_por_ejercicio_en_orden():
    def s(id_, ej, nombre):
        return {"id": id_, "ejercicio_id": ej, "ejercicio": nombre}

    grupos = agrupar_por_ejercicio([s(3, 2, "B"), s(1, 1, "A"), s(2, 1, "A"), s(4, 1, "A")])
    assert [(g["nombre"], [x["id"] for x in g["series"]]) for g in grupos] == [
        ("A", [1, 2, 4]),
        ("B", [3]),
    ]


# --- API ----------------------------------------------------------------------------------


@pytest.fixture
def rutina(ana, catalogo):
    r = ana.post("/rutinas", json={"nombre": "Pecho"}).json()
    for nombre in ["Press de banca", "Press militar"]:
        ana.post(f"/rutinas/{r['id']}/ejercicios", json={"ejercicio_id": catalogo[nombre]})
    return r


def serie(cliente, ejercicio_id, peso, fecha=HOY):
    r = cliente.post(
        "/series",
        json={"fecha": fecha, "ejercicio_id": ejercicio_id, "peso_kg": peso, "repeticiones": 8},
    )
    assert r.status_code == 201
    return r.json()


def guardar(cliente, rutina, fecha=HOY):
    return cliente.post("/entrenamientos", json={"rutina_id": rutina["id"], "fecha": fecha})


def test_guardar_en_el_diario_y_ver_el_detalle(ana, rutina, catalogo):
    banca, militar = catalogo["Press de banca"], catalogo["Press militar"]
    serie(ana, banca, 80)
    serie(ana, militar, 40)
    serie(ana, banca, 85)
    serie(ana, catalogo["Sentadilla"], 100)  # no está en la rutina: no entra
    serie(ana, banca, 70, fecha="2026-11-01")  # otro día: no entra

    r = guardar(ana, rutina)
    assert r.status_code == 201
    detalle = r.json()
    assert detalle["fecha"] == HOY
    assert detalle["rutina_nombre"] == "Pecho"
    assert [(e["nombre"], [s["peso_kg"] for s in e["series"]]) for e in detalle["ejercicios"]] == [
        ("Press de banca", [80.0, 85.0]),
        ("Press militar", [40.0]),
    ]
    assert ana.get(f"/entrenamientos/{detalle['id']}").json() == detalle


def test_lista_del_diario(ana, rutina, catalogo):
    serie(ana, catalogo["Press de banca"], 80, fecha="2026-11-01")
    guardar(ana, rutina, fecha="2026-11-01")
    serie(ana, catalogo["Press de banca"], 80)
    serie(ana, catalogo["Press militar"], 40)
    guardar(ana, rutina)
    assert [
        (e["fecha"], e["rutina_nombre"], e["num_ejercicios"], e["num_series"])
        for e in ana.get("/entrenamientos").json()
    ] == [(HOY, "Pecho", 2, 2), ("2026-11-01", "Pecho", 1, 1)]


def test_sin_series_de_ese_dia_no_se_guarda(ana, rutina, catalogo):
    assert guardar(ana, rutina).status_code == 400
    assert ana.get("/entrenamientos").json() == []


def test_guardar_otra_vez_sin_nada_nuevo_devuelve_el_mismo(ana, rutina, catalogo):
    """Al terminar el entreno se guarda solo: repetirlo no da error ni duplica."""
    serie(ana, catalogo["Press de banca"], 80)
    primero = guardar(ana, rutina)
    assert primero.status_code == 201
    otra_vez = guardar(ana, rutina)
    assert otra_vez.status_code == 200
    assert otra_vez.json()["id"] == primero.json()["id"]
    assert len(ana.get("/entrenamientos").json()) == 1


def test_series_nuevas_el_mismo_dia_se_anaden_al_mismo_entreno(ana, rutina, catalogo):
    serie(ana, catalogo["Press de banca"], 80)
    primero = guardar(ana, rutina).json()
    serie(ana, catalogo["Press de banca"], 60)
    serie(ana, catalogo["Press militar"], 40)
    segundo = guardar(ana, rutina)
    assert segundo.status_code == 200
    detalle = segundo.json()
    assert detalle["id"] == primero["id"]
    assert [(e["nombre"], [s["peso_kg"] for s in e["series"]]) for e in detalle["ejercicios"]] == [
        ("Press de banca", [80.0, 60.0]),
        ("Press militar", [40.0]),
    ]
    assert len(ana.get("/entrenamientos").json()) == 1


def test_otro_dia_es_otro_entreno(ana, rutina, catalogo):
    serie(ana, catalogo["Press de banca"], 80)
    serie(ana, catalogo["Press de banca"], 70, fecha="2026-11-01")
    guardar(ana, rutina)
    assert guardar(ana, rutina, fecha="2026-11-01").status_code == 201
    assert len(ana.get("/entrenamientos").json()) == 2


def test_quitar_del_diario_no_borra_las_series(ana, rutina, catalogo):
    banca = catalogo["Press de banca"]
    serie(ana, banca, 80)
    entrenamiento = guardar(ana, rutina).json()
    assert ana.delete(f"/entrenamientos/{entrenamiento['id']}").status_code == 204
    assert ana.get("/entrenamientos").json() == []
    assert ana.get(f"/entrenamientos/{entrenamiento['id']}").status_code == 404
    historial = ana.get(f"/ejercicios/{banca}/series").json()["series"]
    assert [s["peso_kg"] for s in historial] == [80.0]
    # y se pueden volver a guardar
    assert guardar(ana, rutina).status_code == 201


def test_el_diario_conserva_el_nombre_aunque_se_renombre_o_borre_la_rutina(ana, rutina, catalogo):
    serie(ana, catalogo["Press de banca"], 80)
    entrenamiento = guardar(ana, rutina).json()
    ana.put(f"/rutinas/{rutina['id']}", json={"nombre": "Pecho nuevo"})
    ana.delete(f"/rutinas/{rutina['id']}")
    detalle = ana.get(f"/entrenamientos/{entrenamiento['id']}").json()
    assert detalle["rutina_nombre"] == "Pecho"
    assert detalle["rutina_id"] is None
    assert len(detalle["ejercicios"][0]["series"]) == 1


def test_corregir_una_serie_se_ve_en_el_diario(ana, rutina, catalogo):
    banca = catalogo["Press de banca"]
    s = serie(ana, banca, 80)
    entrenamiento = guardar(ana, rutina).json()
    ana.put(
        f"/series/{s['id']}",
        json={"fecha": HOY, "ejercicio_id": banca, "peso_kg": 82.5, "repeticiones": 8},
    )
    detalle = ana.get(f"/entrenamientos/{entrenamiento['id']}").json()
    assert detalle["ejercicios"][0]["series"][0]["peso_kg"] == 82.5


def test_rutina_inexistente_o_datos_invalidos(ana):
    assert ana.post("/entrenamientos", json={"rutina_id": 999}).status_code == 404
    assert ana.post("/entrenamientos", json={}).status_code == 400


def test_cada_uno_ve_solo_su_diario(ana, bea, rutina, catalogo):
    serie(ana, catalogo["Press de banca"], 80)
    entrenamiento = guardar(ana, rutina).json()
    assert bea.get("/entrenamientos").json() == []
    assert bea.get(f"/entrenamientos/{entrenamiento['id']}").status_code == 404
    assert bea.delete(f"/entrenamientos/{entrenamiento['id']}").status_code == 404
    # Bea no puede guardar con la rutina de Ana
    assert bea.post("/entrenamientos", json={"rutina_id": rutina["id"]}).status_code == 404


def test_sin_sesion_da_401(client):
    assert client.get("/entrenamientos").status_code == 401
    assert client.post("/entrenamientos", json={"rutina_id": 1}).status_code == 401
