"""Series previstas y repeticiones objetivo de cada ejercicio de una rutina (Fase 7a)."""

import pytest

from app.rutinas.logica import Plan, RutinaInvalida, validar_plan
from app.rutinas.predefinidas import sembrar

# --- Lógica -------------------------------------------------------------------------------


def test_plan_por_defecto_3_series_sin_objetivo():
    assert validar_plan({}) == Plan(3, None, None)
    assert validar_plan(None) == Plan(3, None, None)


def test_plan_completo_y_parcial():
    assert validar_plan({"series": 4, "reps_min": 8, "reps_max": 10}) == Plan(4, 8, 10)
    actual = Plan(4, 8, 10)
    assert validar_plan({"series": 5}, por_defecto=actual) == Plan(5, 8, 10)
    assert validar_plan({"reps_min": 6, "reps_max": 6}, por_defecto=actual) == Plan(4, 6, 6)
    # quitar el objetivo
    assert validar_plan({"reps_min": None, "reps_max": None}, actual) == Plan(4, None, None)


@pytest.mark.parametrize(
    ("datos", "mensaje"),
    [
        ({"series": 0}, "entre 1 y 10"),
        ({"series": 11}, "entre 1 y 10"),
        ({"series": "3"}, "entre 1 y 10"),
        ({"series": True}, "entre 1 y 10"),
        ({"reps_min": 8}, "o ninguno"),
        ({"reps_min": 12, "reps_max": 8}, "no puede ser mayor"),
        ({"reps_min": 0, "reps_max": 8}, "entre 1 y 100"),
        ({"reps_min": 8, "reps_max": 101}, "entre 1 y 100"),
        ("x", "no son válidos"),
    ],
)
def test_plan_invalido(datos, mensaje):
    with pytest.raises(RutinaInvalida, match=mensaje):
        validar_plan(datos)


# --- API ----------------------------------------------------------------------------------


@pytest.fixture
def rutina(ana, catalogo):
    r = ana.post("/rutinas", json={"nombre": "Mi pecho"}).json()
    for nombre in ["Press de banca", "Press militar"]:
        ana.post(f"/rutinas/{r['id']}/ejercicios", json={"ejercicio_id": catalogo[nombre]})
    return ana.get(f"/rutinas/{r['id']}").json()


def plan(rutina, i=0):
    e = rutina["ejercicios"][i]
    return (e["series"], e["reps_min"], e["reps_max"])


def test_al_anadir_3_series_sin_objetivo(rutina):
    assert plan(rutina) == (3, None, None)


def test_anadir_con_plan(ana, rutina, catalogo):
    r = ana.post(
        f"/rutinas/{rutina['id']}/ejercicios",
        json={"ejercicio_id": catalogo["Sentadilla"], "series": 5, "reps_min": 5, "reps_max": 5},
    )
    assert plan(r.json(), 2) == (5, 5, 5)


def test_cambiar_series_y_objetivo_se_guarda(ana, rutina, catalogo):
    banca = catalogo["Press de banca"]
    url = f"/rutinas/{rutina['id']}/ejercicios/{banca}"
    assert plan(ana.put(url, json={"series": 4}).json()) == (4, None, None)
    assert plan(ana.put(url, json={"reps_min": 8, "reps_max": 10}).json()) == (4, 8, 10)
    assert plan(ana.get(f"/rutinas/{rutina['id']}").json()) == (4, 8, 10)
    assert plan(ana.get(f"/rutinas/{rutina['id']}").json(), 1) == (3, None, None)  # el otro igual


@pytest.mark.parametrize("datos", [{"series": 0}, {"series": 11}, {"reps_min": 9, "reps_max": 1}])
def test_cambiar_con_datos_invalidos_da_400(ana, rutina, catalogo, datos):
    url = f"/rutinas/{rutina['id']}/ejercicios/{catalogo['Press de banca']}"
    assert ana.put(url, json=datos).status_code == 400
    assert plan(ana.get(f"/rutinas/{rutina['id']}").json()) == (3, None, None)


def test_cambiar_ejercicio_que_no_esta_da_404(ana, rutina, catalogo):
    url = f"/rutinas/{rutina['id']}/ejercicios/{catalogo['Sentadilla']}"
    assert ana.put(url, json={"series": 4}).status_code == 404


def test_reordenar_conserva_el_plan(ana, rutina, catalogo):
    banca, militar = catalogo["Press de banca"], catalogo["Press militar"]
    ana.put(f"/rutinas/{rutina['id']}/ejercicios/{banca}", json={"series": 5})
    r = ana.put(f"/rutinas/{rutina['id']}/orden", json={"ejercicios": [militar, banca]})
    assert [(e["nombre"], e["series"]) for e in r.json()["ejercicios"]] == [
        ("Press militar", 3),
        ("Press de banca", 5),
    ]


def test_predefinidas_3_x_8_12_no_se_cambian_y_la_copia_conserva(conn, ana, catalogo):
    sembrar(conn, [{"clave": "pecho", "nombre": "Pecho", "wger_ids": [1, 2]}])
    (pecho,) = conn.execute("SELECT id FROM rutinas").fetchone()
    predefinida = ana.get(f"/rutinas/{pecho}").json()
    assert [plan(predefinida, i) for i in (0, 1)] == [(3, 8, 12), (3, 8, 12)]

    url = f"/rutinas/{pecho}/ejercicios/{catalogo['Press de banca']}"
    assert ana.put(url, json={"series": 4}).status_code == 403

    copia = ana.post(f"/rutinas/{pecho}/copiar").json()
    assert plan(copia) == (3, 8, 12)
    url = f"/rutinas/{copia['id']}/ejercicios/{catalogo['Press de banca']}"
    assert plan(ana.put(url, json={"series": 4, "reps_min": 8, "reps_max": 10}).json()) == (4, 8, 10)


def test_rutina_de_otro_da_404(bea, rutina, catalogo):
    url = f"/rutinas/{rutina['id']}/ejercicios/{catalogo['Press de banca']}"
    assert bea.put(url, json={"series": 4}).status_code == 404
