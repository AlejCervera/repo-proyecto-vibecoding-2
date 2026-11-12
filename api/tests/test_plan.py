"""Plan semanal y cambios de un día (Fase 9c)."""

from datetime import date

import pytest

from app.plan.logica import PlanInvalido, validar_dia, validar_rango, validar_semana

DESCANSO = [None] * 7

# --- Lógica -------------------------------------------------------------------------------


def test_semana_valida():
    assert validar_semana({"dias": [1, None, 2, None, 1, None, None]}) == [1, None, 2, None, 1, None, None]


@pytest.mark.parametrize(
    "datos",
    [
        {"dias": [1, 2, 3]},  # no son 7
        {"dias": [None] * 8},
        {"dias": ["1"] + [None] * 6},
        {"dias": [True] + [None] * 6},
        {"dias": [0] + [None] * 6},
        {"dias": "lunes"},
        "x",
        None,
    ],
)
def test_semana_invalida(datos):
    with pytest.raises(PlanInvalido):
        validar_semana(datos)


def test_dia():
    assert validar_dia({"rutina_id": 3}) == 3
    assert validar_dia({"rutina_id": None}) is None
    for malo in [{}, {"rutina_id": "3"}, {"rutina_id": -1}, "x"]:
        with pytest.raises(PlanInvalido):
            validar_dia(malo)


def test_rango():
    assert validar_rango("2026-11-01", "2026-12-31") == (date(2026, 11, 1), date(2026, 12, 31))
    for desde, hasta in [("2026-11-10", "2026-11-01"), ("2026-01-01", "2026-06-01"), ("x", "2026-01-01")]:
        with pytest.raises(PlanInvalido):
            validar_rango(desde, hasta)


# --- API ----------------------------------------------------------------------------------


@pytest.fixture
def rutinas(ana, catalogo):
    """Dos rutinas propias de ana: {nombre: id}."""
    ids = {}
    for nombre in ["Push", "Pierna"]:
        ids[nombre] = ana.post("/rutinas", json={"nombre": nombre}).json()["id"]
    return ids


def nombres(semana):
    return [d and d["nombre"] for d in semana["dias"]]


def test_sin_plan_todo_es_descanso(ana):
    assert ana.get("/plan/semana").json() == {"dias": DESCANSO}


def test_guardar_y_leer_el_plan_semanal(ana, rutinas):
    push, pierna = rutinas["Push"], rutinas["Pierna"]
    r = ana.put("/plan/semana", json={"dias": [push, None, pierna, None, push, None, None]})
    assert r.status_code == 200
    esperado = ["Push", None, "Pierna", None, "Push", None, None]
    assert nombres(r.json()) == esperado
    assert nombres(ana.get("/plan/semana").json()) == esperado

    # Guardar otra vez lo sustituye entero
    ana.put("/plan/semana", json={"dias": [None] * 6 + [pierna]})
    assert nombres(ana.get("/plan/semana").json()) == [None] * 6 + ["Pierna"]


def test_se_pueden_planificar_las_predefinidas(ana, conn):
    conn.execute("INSERT INTO rutinas (nombre, nombre_normalizado, clave) VALUES ('Pecho', 'pecho', 'pecho')")
    pecho = conn.execute("SELECT id FROM rutinas WHERE clave = 'pecho'").fetchone()[0]
    assert ana.put("/plan/semana", json={"dias": [pecho] + [None] * 6}).status_code == 200
    assert nombres(ana.get("/plan/semana").json())[0] == "Pecho"


def test_plan_invalido_400(ana):
    r = ana.put("/plan/semana", json={"dias": [1, 2]})
    assert r.status_code == 400
    assert "7 días" in r.json()["error"]


def test_no_se_puede_planificar_una_rutina_ajena_ni_inexistente(ana, bea, rutinas):
    push = rutinas["Push"]
    assert bea.put("/plan/semana", json={"dias": [push] + [None] * 6}).status_code == 400
    assert ana.put("/plan/semana", json={"dias": [9999] + [None] * 6}).status_code == 400
    assert bea.put("/plan/dias/2026-11-12", json={"rutina_id": push}).status_code == 400


def test_cada_uno_ve_solo_su_plan(ana, bea, rutinas):
    ana.put("/plan/semana", json={"dias": [rutinas["Push"]] + [None] * 6})
    assert bea.get("/plan/semana").json() == {"dias": DESCANSO}


def test_borrar_una_rutina_deja_ese_dia_en_descanso(ana, rutinas):
    ana.put("/plan/semana", json={"dias": [rutinas["Push"], rutinas["Pierna"]] + [None] * 5})
    ana.put("/plan/dias/2026-11-12", json={"rutina_id": rutinas["Push"]})
    ana.delete(f"/rutinas/{rutinas['Push']}")
    assert nombres(ana.get("/plan/semana").json()) == [None, "Pierna"] + [None] * 5
    # El cambio de ese día también desaparece (vuelve a lo que diga el plan)
    assert ana.get("/plan/dias?desde=2026-11-01&hasta=2026-11-30").json() == {"dias": []}


def test_cambiar_un_dia_concreto_y_volver_al_plan(ana, rutinas):
    r = ana.put("/plan/dias/2026-11-12", json={"rutina_id": rutinas["Pierna"]})
    assert r.status_code == 200
    assert r.json() == {"fecha": "2026-11-12", "rutina": {"id": rutinas["Pierna"], "nombre": "Pierna"}}
    # Descanso ese día
    ana.put("/plan/dias/2026-11-14", json={"rutina_id": None})
    # Cambiarlo otra vez lo sustituye
    ana.put("/plan/dias/2026-11-12", json={"rutina_id": rutinas["Push"]})

    dias = ana.get("/plan/dias?desde=2026-11-01&hasta=2026-11-30").json()["dias"]
    assert [(d["fecha"], d["rutina"] and d["rutina"]["nombre"]) for d in dias] == [
        ("2026-11-12", "Push"),
        ("2026-11-14", None),
    ]

    assert ana.delete("/plan/dias/2026-11-12").status_code == 204
    dias = ana.get("/plan/dias?desde=2026-11-01&hasta=2026-11-30").json()["dias"]
    assert [d["fecha"] for d in dias] == ["2026-11-14"]


def test_los_cambios_solo_se_ven_en_su_rango_y_por_su_dueno(ana, bea, rutinas):
    ana.put("/plan/dias/2026-10-31", json={"rutina_id": rutinas["Push"]})
    ana.put("/plan/dias/2026-11-01", json={"rutina_id": rutinas["Push"]})
    assert [d["fecha"] for d in ana.get("/plan/dias?desde=2026-11-01&hasta=2026-11-30").json()["dias"]] == [
        "2026-11-01"
    ]
    assert bea.get("/plan/dias?desde=2026-10-01&hasta=2026-11-30").json() == {"dias": []}


def test_fechas_y_rangos_invalidos_400(ana):
    assert ana.get("/plan/dias?desde=2026-11-30&hasta=2026-11-01").status_code == 400
    assert ana.get("/plan/dias").status_code == 400
    assert ana.put("/plan/dias/mañana", json={"rutina_id": None}).status_code == 400
    assert ana.delete("/plan/dias/mañana").status_code == 400


def test_sin_sesion_da_401(client):
    assert client.get("/plan/semana").status_code == 401
    assert client.put("/plan/dias/2026-11-12", json={"rutina_id": None}).status_code == 401
