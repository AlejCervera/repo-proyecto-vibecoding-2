def nombres(respuesta):
    return [e["nombre"] for e in respuesta.json()]


def test_buscar_ignora_mayusculas_y_tildes(ana, catalogo):
    assert nombres(ana.get("/ejercicios", params={"q": "PRÉSS"})) == [
        "Press de banca",
        "Press militar",
    ]


def test_buscar_pone_primero_los_que_empiezan_por_el_texto(ana, catalogo):
    # «remo» empieza «Remo con barra»; «peso muerto» lo contiene pero no empieza por él
    ana.post("/ejercicios", json={"nombre": "Muerto rumano"})
    assert nombres(ana.get("/ejercicios", params={"q": "muerto"})) == [
        "Muerto rumano",
        "Peso muerto",
    ]


def test_buscar_sin_texto_devuelve_todos_en_orden(ana, catalogo):
    assert nombres(ana.get("/ejercicios")) == sorted(catalogo, key=str.lower)


def test_resultados_indican_si_es_propio(ana, catalogo):
    ana.post("/ejercicios", json={"nombre": "Press con pausa"})
    res = {e["nombre"]: e["propio"] for e in ana.get("/ejercicios", params={"q": "press"}).json()}
    assert res == {"Press de banca": False, "Press militar": False, "Press con pausa": True}


def test_crear_ejercicio_propio(ana):
    r = ana.post("/ejercicios", json={"nombre": "  Remo   con mancuerna "})
    assert r.status_code == 201
    assert r.json() == {"id": r.json()["id"], "nombre": "Remo con mancuerna", "propio": True}


def test_duplicado_del_catalogo_da_409_con_el_existente(ana, catalogo):
    r = ana.post("/ejercicios", json={"nombre": "press  DE bánca"})
    assert r.status_code == 409
    assert r.json() == {
        "error": "Ya existe «Press de banca»",
        "ejercicio": {"id": catalogo["Press de banca"], "nombre": "Press de banca", "propio": False},
    }


def test_duplicado_propio_da_409(ana, conn):
    creado = ana.post("/ejercicios", json={"nombre": "Curl martillo"}).json()
    r = ana.post("/ejercicios", json={"nombre": "CURL MARTILLO"})
    assert r.status_code == 409
    assert r.json()["ejercicio"] == creado
    assert conn.execute("SELECT count(*) FROM ejercicios").fetchone()[0] == 1


def test_los_propios_no_los_ve_otro_usuario_y_puede_crear_el_mismo(ana, bea):
    ana.post("/ejercicios", json={"nombre": "Curl martillo"})
    assert nombres(bea.get("/ejercicios", params={"q": "curl"})) == []
    assert bea.post("/ejercicios", json={"nombre": "Curl martillo"}).status_code == 201


def test_nombre_invalido_da_400(ana):
    assert ana.post("/ejercicios", json={"nombre": "   "}).status_code == 400
    assert ana.post("/ejercicios", json={"nombre": "x" * 81}).status_code == 400
    assert ana.post("/ejercicios", json=["no"]).status_code == 400


def test_sin_sesion_da_401(client):
    assert client.get("/ejercicios").status_code == 401
    assert client.post("/ejercicios", json={"nombre": "x"}).status_code == 401
