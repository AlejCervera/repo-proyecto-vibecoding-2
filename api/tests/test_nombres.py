import pytest

from app.ejercicios.nombres import NombreInvalido, limpiar, normalizar, validar_nombre


@pytest.mark.parametrize(
    ("nombre", "esperado"),
    [
        ("Press banca", "press banca"),
        ("  Press   BÁNCA ", "press banca"),
        ("Extensión de tríceps", "extension de triceps"),
        ("Pull-over\tcon mancuerna", "pull-over con mancuerna"),
        ("Año", "ano"),
    ],
)
def test_normalizar(nombre, esperado):
    assert normalizar(nombre) == esperado


def test_mismas_variantes_dan_la_misma_clave():
    variantes = ["Press banca", "press banca", "Press  Banca ", "prèss bánca"]
    assert len({normalizar(v) for v in variantes}) == 1


def test_limpiar_conserva_mayusculas_y_tildes():
    assert limpiar("  Extensión   de Tríceps ") == "Extensión de Tríceps"


def test_validar_nombre():
    assert validar_nombre({"nombre": "  Remo  alto "}) == "Remo alto"
    for malo in [{}, {"nombre": ""}, {"nombre": "  "}, {"nombre": 5}, "texto", {"nombre": "x" * 81}]:
        with pytest.raises(NombreInvalido):
            validar_nombre(malo)
