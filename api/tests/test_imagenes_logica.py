import pytest

from app.imagenes.formato import MAX_BYTES, ImagenInvalida, detectar_tipo, validar_subida
from app.imagenes.wger import elegir_principales
from tests.imagenes_falsas import GIF, JPEG, PNG, WEBP


@pytest.mark.parametrize(
    ("datos", "tipo"),
    [(PNG, "image/png"), (JPEG, "image/jpeg"), (WEBP, "image/webp"), (GIF, "image/gif")],
)
def test_detectar_tipo_por_contenido(datos, tipo):
    assert detectar_tipo(datos) == tipo


def test_detectar_tipo_desconocido():
    assert detectar_tipo(b"<svg></svg>") is None
    assert detectar_tipo(b"") is None


def test_validar_subida_acepta_jpeg_png_webp():
    assert validar_subida(PNG) == "image/png"
    assert validar_subida(JPEG) == "image/jpeg"
    assert validar_subida(WEBP) == "image/webp"


@pytest.mark.parametrize(
    ("datos", "mensaje"),
    [
        (b"", "ninguna imagen"),
        (b"%PDF-1.4 no soy imagen", "JPEG, PNG o WebP"),
        (GIF, "JPEG, PNG o WebP"),  # los GIF solo vienen de wger
        (PNG + b"\x00" * MAX_BYTES, "2 MB"),
    ],
)
def test_validar_subida_rechaza(datos, mensaje):
    with pytest.raises(ImagenInvalida, match=mensaje):
        validar_subida(datos)


def imagen(id_, ejercicio, principal=False, medium="m.png", image="o.png", licencia=2, autor="a"):
    return {
        "id": id_,
        "exercise": ejercicio,
        "is_main": principal,
        "image": image,
        "thumbnails": {"medium": medium} if medium else None,
        "license": licencia,
        "license_author": autor,
    }


def test_elegir_principales_una_por_ejercicio_prefiriendo_la_principal():
    res = elegir_principales(
        [
            imagen(1, 10),
            imagen(2, 10, principal=True, medium="principal.png"),
            imagen(3, 11, medium=None, image="anim.gif", licencia=1, autor=""),
            imagen(4, 12, medium=None, image=None),  # sin URL: se descarta
        ]
    )
    por_ejercicio = {r["wger_ejercicio_id"]: r for r in res}
    assert set(por_ejercicio) == {10, 11}
    assert por_ejercicio[10]["url"] == "principal.png"
    assert por_ejercicio[10]["wger_id"] == 2
    assert por_ejercicio[11]["url"] == "anim.gif"  # sin miniatura: la original
    assert por_ejercicio[11]["licencia"] == "CC-BY-SA 3"
    assert por_ejercicio[11]["autor"] is None
