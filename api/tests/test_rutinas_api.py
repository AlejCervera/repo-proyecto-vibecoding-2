import pytest

from app.rutinas.predefinidas import sembrar

# En el fixture «catalogo», wger_id: 1 Press de banca, 2 Press militar, 3 Sentadilla,
# 4 Peso muerto, 5 Remo con barra.
DEFINICIONES = [
    {"clave": "pecho", "nombre": "Pecho", "wger_ids": [1, 999]},  # 999 no existe: se salta
    {"clave": "pierna", "nombre": "Pierna", "wger_ids": [3, 4]},
    {"clave": "vacia", "nombre": "Vacía", "wger_ids": [998]},  # sin ejercicios: no se crea
]


@pytest.fixture
def predefinidas(conn, catalogo):
    assert sembrar(conn, DEFINICIONES) == 2
    return {r[0]: r[1] for r in conn.execute("SELECT nombre, id FROM rutinas").fetchall()}


def nombres(rutina):
    return [e["nombre"] for e in rutina["ejercicios"]]


def nueva(cliente, nombre="Mi pecho"):
    r = cliente.post("/rutinas", json={"nombre": nombre})
    assert r.status_code == 201
    return r.json()


def anadir(cliente, rutina, ejercicio_id):
    return cliente.post(f"/rutinas/{rutina['id']}/ejercicios", json={"ejercicio_id": ejercicio_id})


# --- Predefinidas -------------------------------------------------------------------------


def test_sembrar_crea_y_actualiza_sin_duplicar(conn, catalogo, predefinidas):
    otra_vez = [{**DEFINICIONES[0], "nombre": "Pecho y tríceps", "wger_ids": [2, 1]}]
    assert sembrar(conn, otra_vez) == 1
    rows = conn.execute("SELECT clave, nombre FROM rutinas ORDER BY id").fetchall()
    assert rows == [("pecho", "Pecho y tríceps"), ("pierna", "Pierna")]


def test_predefinidas_visibles_para_todos(ana, bea, predefinidas):
    for cliente in (ana, bea):
        rutinas = cliente.get("/rutinas").json()
        assert [(r["nombre"], r["predefinida"]) for r in rutinas] == [
            ("Pecho", True),
            ("Pierna", True),
        ]
        assert nombres(rutinas[0]) == ["Press de banca"]
        assert nombres(rutinas[1]) == ["Sentadilla", "Peso muerto"]


def test_predefinidas_no_se_pueden_cambiar(ana, predefinidas, catalogo):
    pecho = predefinidas["Pecho"]
    respuestas = [
        ana.put(f"/rutinas/{pecho}", json={"nombre": "Mía"}),
        ana.delete(f"/rutinas/{pecho}"),
        ana.post(f"/rutinas/{pecho}/ejercicios", json={"ejercicio_id": catalogo["Sentadilla"]}),
        ana.delete(f"/rutinas/{pecho}/ejercicios/{catalogo['Press de banca']}"),
        ana.put(f"/rutinas/{pecho}/orden", json={"ejercicios": [catalogo["Press de banca"]]}),
    ]
    for r in respuestas:
        assert r.status_code == 403
        assert "predefinidas no se pueden cambiar" in r.json()["error"]
    assert nombres(ana.get(f"/rutinas/{pecho}").json()) == ["Press de banca"]


def test_copiar_predefinida_da_una_propia_editable(ana, predefinidas, catalogo):
    r = ana.post(f"/rutinas/{predefinidas['Pierna']}/copiar")
    assert r.status_code == 201
    copia = r.json()
    assert copia["nombre"] == "Pierna"
    assert copia["predefinida"] is False
    assert nombres(copia) == ["Sentadilla", "Peso muerto"]

    assert anadir(ana, copia, catalogo["Remo con barra"]).status_code == 200
    assert ana.put(f"/rutinas/{copia['id']}", json={"nombre": "Pierna fuerte"}).status_code == 200
    # la predefinida no cambia
    assert nombres(ana.get(f"/rutinas/{predefinidas['Pierna']}").json()) == [
        "Sentadilla",
        "Peso muerto",
    ]


def test_copiar_dos_veces_numera_el_nombre(ana, predefinidas):
    ana.post(f"/rutinas/{predefinidas['Pecho']}/copiar")
    segunda = ana.post(f"/rutinas/{predefinidas['Pecho']}/copiar").json()
    assert segunda["nombre"] == "Pecho (2)"


# --- Propias ------------------------------------------------------------------------------


def test_crear_anadir_y_ver(ana, catalogo):
    rutina = nueva(ana, "Pecho")
    assert rutina == {"id": rutina["id"], "nombre": "Pecho", "predefinida": False, "ejercicios": []}
    anadir(ana, rutina, catalogo["Press de banca"])
    r = anadir(ana, rutina, catalogo["Press militar"])
    assert nombres(r.json()) == ["Press de banca", "Press militar"]
    assert ana.get(f"/rutinas/{rutina['id']}").json() == r.json()


def test_anadir_ejercicio_propio(ana):
    rutina = nueva(ana)
    propio = ana.post("/ejercicios", json={"nombre": "Aperturas con goma"}).json()
    assert nombres(anadir(ana, rutina, propio["id"]).json()) == ["Aperturas con goma"]


def test_anadir_repetido_da_409(ana, catalogo):
    rutina = nueva(ana)
    anadir(ana, rutina, catalogo["Sentadilla"])
    assert anadir(ana, rutina, catalogo["Sentadilla"]).status_code == 409


@pytest.mark.parametrize("ejercicio_id", [None, "1", 99999])
def test_anadir_ejercicio_invalido_da_400(ana, catalogo, ejercicio_id):
    rutina = nueva(ana)
    assert anadir(ana, rutina, ejercicio_id).status_code == 400


def test_quitar_ejercicio(ana, catalogo):
    rutina = nueva(ana)
    anadir(ana, rutina, catalogo["Sentadilla"])
    anadir(ana, rutina, catalogo["Peso muerto"])
    r = ana.delete(f"/rutinas/{rutina['id']}/ejercicios/{catalogo['Sentadilla']}")
    assert nombres(r.json()) == ["Peso muerto"]
    r = ana.delete(f"/rutinas/{rutina['id']}/ejercicios/{catalogo['Sentadilla']}")
    assert r.status_code == 404


def test_reordenar(ana, catalogo):
    rutina = nueva(ana)
    ids = [catalogo[n] for n in ["Sentadilla", "Peso muerto", "Press militar"]]
    for i in ids:
        anadir(ana, rutina, i)
    r = ana.put(f"/rutinas/{rutina['id']}/orden", json={"ejercicios": [ids[2], ids[0], ids[1]]})
    assert nombres(r.json()) == ["Press militar", "Sentadilla", "Peso muerto"]
    # tras reordenar, añadir sigue poniendo al final
    r = anadir(ana, rutina, catalogo["Remo con barra"])
    assert nombres(r.json())[-1] == "Remo con barra"


def test_reordenar_con_otros_ejercicios_da_400(ana, catalogo):
    rutina = nueva(ana)
    anadir(ana, rutina, catalogo["Sentadilla"])
    r = ana.put(f"/rutinas/{rutina['id']}/orden", json={"ejercicios": [catalogo["Peso muerto"]]})
    assert r.status_code == 400


def test_renombrar_y_duplicados(ana):
    pecho = nueva(ana, "Pecho")
    nueva(ana, "Espalda")
    assert ana.post("/rutinas", json={"nombre": "  PECHO "}).status_code == 409
    assert ana.put(f"/rutinas/{pecho['id']}", json={"nombre": "espalda"}).status_code == 409
    r = ana.put(f"/rutinas/{pecho['id']}", json={"nombre": "Pecho y tríceps"})
    assert r.json()["nombre"] == "Pecho y tríceps"
    assert ana.put(f"/rutinas/{pecho['id']}", json={"nombre": ""}).status_code == 400


def test_borrar_rutina_no_toca_las_series(ana, catalogo):
    rutina = nueva(ana)
    anadir(ana, rutina, catalogo["Sentadilla"])
    ana.post(
        "/series",
        json={"ejercicio_id": catalogo["Sentadilla"], "peso_kg": 100, "repeticiones": 5},
    )
    assert ana.delete(f"/rutinas/{rutina['id']}").status_code == 204
    assert ana.get(f"/rutinas/{rutina['id']}").status_code == 404
    assert len(ana.get("/series").json()) == 1


def test_borrar_ejercicio_propio_lo_quita_de_la_rutina(ana, catalogo):
    rutina = nueva(ana)
    propio = ana.post("/ejercicios", json={"nombre": "Aperturas con goma"}).json()
    anadir(ana, rutina, catalogo["Sentadilla"])
    anadir(ana, rutina, propio["id"])
    ana.delete(f"/ejercicios/{propio['id']}")
    assert nombres(ana.get(f"/rutinas/{rutina['id']}").json()) == ["Sentadilla"]


def test_nadie_ve_ni_toca_las_rutinas_de_otro(ana, bea, catalogo):
    rutina = nueva(ana, "Secreta")
    assert [r["nombre"] for r in bea.get("/rutinas").json()] == []
    assert bea.get(f"/rutinas/{rutina['id']}").status_code == 404
    assert bea.put(f"/rutinas/{rutina['id']}", json={"nombre": "x"}).status_code == 404
    assert bea.delete(f"/rutinas/{rutina['id']}").status_code == 404
    assert anadir(bea, rutina, catalogo["Sentadilla"]).status_code == 404
    assert bea.post(f"/rutinas/{rutina['id']}/copiar").status_code == 404
    # y Bea puede tener una con el mismo nombre
    assert bea.post("/rutinas", json={"nombre": "Secreta"}).status_code == 201


def test_no_se_puede_anadir_el_ejercicio_propio_de_otro(ana, bea):
    rutina = nueva(ana)
    ajeno = bea.post("/ejercicios", json={"nombre": "De Bea"}).json()
    assert anadir(ana, rutina, ajeno["id"]).status_code == 400


def test_sin_sesion_da_401(client):
    assert client.get("/rutinas").status_code == 401
    assert client.post("/rutinas", json={"nombre": "x"}).status_code == 401
