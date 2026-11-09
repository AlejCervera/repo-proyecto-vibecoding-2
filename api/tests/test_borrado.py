import pytest

from app.ejercicios.borrado import BorradoInvalido, FaltaDecidir, Plan, decidir


def test_sin_series_se_borra_sin_preguntar():
    assert decidir(1, 0, None, None) == Plan()


def test_con_series_hay_que_decidir():
    with pytest.raises(FaltaDecidir) as e:
        decidir(1, 5, None, None)
    assert e.value.num_series == 5


def test_borrar_las_series():
    assert decidir(1, 5, "borrar", None) == Plan(borrar_series=True)


def test_pasarlas_a_otro():
    assert decidir(1, 5, None, 2) == Plan(mover_a=2)


@pytest.mark.parametrize(
    ("series", "mover_a", "mensaje"),
    [
        ("otra", None, "Opción no válida"),
        ("borrar", 2, "solo una opción"),
        (None, 1, "mismo ejercicio"),
    ],
)
def test_opciones_invalidas(series, mover_a, mensaje):
    with pytest.raises(BorradoInvalido, match=mensaje):
        decidir(1, 5, series, mover_a)
