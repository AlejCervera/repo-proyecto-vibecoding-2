def registrar(cliente, ejercicio_id, fecha, peso, reps):
    r = cliente.post(
        "/series",
        json={"fecha": fecha, "ejercicio_id": ejercicio_id, "peso_kg": peso, "repeticiones": reps},
    )
    assert r.status_code == 201
    return r.json()


def filas(respuesta):
    return [(s["fecha"], s["peso_kg"], s["repeticiones"]) for s in respuesta.json()["series"]]


def test_historial_devuelve_el_ejercicio_y_sus_series(ana, catalogo):
    banca = catalogo["Press de banca"]
    registrar(ana, banca, "2026-11-09", 80, 8)
    r = ana.get(f"/ejercicios/{banca}/series")
    assert r.status_code == 200
    assert r.json()["ejercicio"] == {
        "id": banca,
        "nombre": "Press de banca",
        "propio": False,
        "imagen": None,
    }
    assert filas(r) == [("2026-11-09", 80.0, 8)]


def test_cada_serie_por_separado_y_la_mas_reciente_primero(ana, catalogo):
    banca = catalogo["Press de banca"]
    registrar(ana, banca, "2026-11-01", 70, 10)
    registrar(ana, banca, "2026-11-09", 80, 8)
    registrar(ana, banca, "2026-11-09", 85, 6)  # misma fecha, registrada después
    registrar(ana, banca, "2026-11-05", 75, 8)  # registrada tarde con fecha anterior
    assert filas(ana.get(f"/ejercicios/{banca}/series")) == [
        ("2026-11-09", 85.0, 6),
        ("2026-11-09", 80.0, 8),
        ("2026-11-05", 75.0, 8),
        ("2026-11-01", 70.0, 10),
    ]


def test_no_mezcla_otros_ejercicios(ana, catalogo):
    registrar(ana, catalogo["Press de banca"], "2026-11-09", 80, 8)
    registrar(ana, catalogo["Sentadilla"], "2026-11-09", 100, 5)
    assert filas(ana.get(f"/ejercicios/{catalogo['Sentadilla']}/series")) == [
        ("2026-11-09", 100.0, 5)
    ]


def test_no_mezcla_series_de_otro_usuario(ana, bea, catalogo):
    banca = catalogo["Press de banca"]
    registrar(ana, banca, "2026-11-09", 80, 8)
    registrar(bea, banca, "2026-11-09", 40, 12)
    assert filas(ana.get(f"/ejercicios/{banca}/series")) == [("2026-11-09", 80.0, 8)]
    assert filas(bea.get(f"/ejercicios/{banca}/series")) == [("2026-11-09", 40.0, 12)]


def test_ejercicio_sin_series_da_lista_vacia(ana, catalogo):
    r = ana.get(f"/ejercicios/{catalogo['Peso muerto']}/series")
    assert r.status_code == 200
    assert r.json()["series"] == []


def test_ejercicio_propio_de_otro_o_inexistente_da_404(ana, bea):
    secreto = ana.post("/ejercicios", json={"nombre": "Secreto"}).json()
    assert bea.get(f"/ejercicios/{secreto['id']}/series").status_code == 404
    assert ana.get("/ejercicios/99999/series").status_code == 404
    assert ana.get(f"/ejercicios/{secreto['id']}/series").status_code == 200


def test_sin_sesion_da_401(client, catalogo):
    assert client.get(f"/ejercicios/{catalogo['Sentadilla']}/series").status_code == 401
