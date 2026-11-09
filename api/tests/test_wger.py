import json

from app.ejercicios.wger import extraer_ejercicios, paginas
from app.importar_wger import importar, leer_archivo


def ejercicio(id_, traducciones, licencia="CC-BY-SA 4", autor="autor"):
    return {
        "id": id_,
        "license": {"short_name": licencia},
        "license_author": autor,
        "translations": [{"language": lang, "name": nombre} for lang, nombre in traducciones],
    }


DATOS = [
    ejercicio(1, [(2, "Bench press"), (4, "Press de banca")]),
    ejercicio(2, [(2, "Deadlift")], autor=""),  # solo inglés
    ejercicio(3, [(1, "Kniebeuge")]),  # ni español ni inglés: se descarta
    ejercicio(4, [(4, "  press  DE bánca ")]),  # repetido tras normalizar: se descarta
    ejercicio(5, [(4, ""), (2, "Squat")]),  # español vacío: usa inglés
    ejercicio(6, [(4, "x" * 81)]),  # demasiado largo
]


def test_extraer_elige_espanol_o_ingles_y_descarta_repetidos():
    res = extraer_ejercicios(DATOS)
    assert [(e["wger_id"], e["nombre"]) for e in res] == [
        (1, "Press de banca"),
        (2, "Deadlift"),
        (5, "Squat"),
    ]
    assert res[0]["licencia"] == "CC-BY-SA 4"
    assert res[0]["nombre_normalizado"] == "press de banca"
    assert res[1]["autor"] is None


def test_paginas_sigue_el_enlace_next():
    respuestas = {
        "u1": {"results": [1, 2], "next": "u2"},
        "u2": {"results": [3], "next": None},
    }
    pedidas = []

    def pedir(url):
        pedidas.append(url)
        return respuestas[url]

    assert list(paginas("u1", pedir)) == [1, 2, 3]
    assert pedidas == ["u1", "u2"]


def test_importar_dos_veces_no_duplica(conn):
    assert importar(conn, DATOS) == (3, 3)
    assert importar(conn, DATOS) == (3, 0)
    assert conn.execute("SELECT count(*) FROM ejercicios").fetchone()[0] == 3
    fila = conn.execute(
        "SELECT usuario_id, wger_id, licencia FROM ejercicios WHERE nombre = 'Deadlift'"
    ).fetchone()
    assert fila == (None, 2, "CC-BY-SA 4")


def test_leer_archivo_acepta_pagina_o_lista(tmp_path):
    pagina = tmp_path / "pagina.json"
    pagina.write_text(json.dumps({"results": DATOS}), encoding="utf-8")
    lista = tmp_path / "lista.json"
    lista.write_text(json.dumps(DATOS), encoding="utf-8")
    assert leer_archivo(str(pagina)) == leer_archivo(str(lista)) == DATOS
