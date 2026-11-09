import pytest

from app.importar_imagenes_wger import importar
from tests.imagenes_falsas import GIF, JPEG, PNG
from tests.test_imagenes_logica import imagen

# En el fixture «catalogo», wger_id 1 = Press de banca, 3 = Sentadilla.
IMAGENES_WGER = [
    imagen(100, 1, principal=True, medium="https://wger/banca.png", autor="Autor Banca"),
    imagen(101, 3, medium=None, image="https://wger/sentadilla.gif", licencia=1),
    imagen(102, 999, medium="https://wger/no-importado.png"),  # ejercicio que no tenemos
    imagen(103, 4, medium="https://wger/roto.png"),  # descarga que no es imagen
]
DESCARGAS = {
    "https://wger/banca.png": PNG,
    "https://wger/sentadilla.gif": GIF,
    "https://wger/roto.png": b"<html>error</html>",
}


@pytest.fixture
def con_imagenes(conn, catalogo):
    importar(conn, IMAGENES_WGER, DESCARGAS.__getitem__)
    return catalogo


def contar_imagenes(conn):
    return conn.execute("SELECT count(*) FROM imagenes").fetchone()[0]


def test_importar_guarda_las_validas_y_no_duplica(conn, catalogo):
    assert importar(conn, IMAGENES_WGER, DESCARGAS.__getitem__) == {"guardadas": 2, "fallidas": 1}
    assert importar(conn, IMAGENES_WGER, DESCARGAS.__getitem__) == {"guardadas": 0, "fallidas": 1}
    assert contar_imagenes(conn) == 2


def test_importar_cuenta_las_descargas_que_fallan(conn, catalogo):
    def falla(url):
        raise OSError("sin red")

    assert importar(conn, IMAGENES_WGER[:1], falla) == {"guardadas": 0, "fallidas": 1}


def test_ver_imagen_de_wger(ana, con_imagenes):
    r = ana.get(f"/ejercicios/{con_imagenes['Press de banca']}/imagen")
    assert r.status_code == 200
    assert r.content == PNG
    assert r.headers["content-type"] == "image/png"
    assert r.headers["x-content-type-options"] == "nosniff"


def test_busqueda_indica_la_imagen_y_su_atribucion(ana, con_imagenes):
    res = {e["nombre"]: e["imagen"] for e in ana.get("/ejercicios").json()}
    assert res["Press de banca"] == {"origen": "wger", "autor": "Autor Banca", "licencia": "CC-BY-SA 4"}
    assert res["Sentadilla"]["licencia"] == "CC-BY-SA 3"
    assert res["Peso muerto"] is None


def test_sin_imagen_da_404(ana, catalogo):
    assert ana.get(f"/ejercicios/{catalogo['Peso muerto']}/imagen").status_code == 404


def test_subir_imagen_a_ejercicio_propio_y_verla(ana):
    ej = ana.post("/ejercicios", json={"nombre": "Mi remo"}).json()
    r = ana.put(f"/ejercicios/{ej['id']}/imagen", content=JPEG)
    assert r.status_code == 200
    assert r.json() == {"origen": "propia"}
    assert ana.get(f"/ejercicios/{ej['id']}/imagen").content == JPEG
    buscado = ana.get("/ejercicios", params={"q": "mi remo"}).json()[0]
    assert buscado["imagen"] == {"origen": "propia"}


def test_subir_otra_vez_la_sustituye(ana, conn):
    ej = ana.post("/ejercicios", json={"nombre": "Mi remo"}).json()
    ana.put(f"/ejercicios/{ej['id']}/imagen", content=JPEG)
    ana.put(f"/ejercicios/{ej['id']}/imagen", content=PNG)
    assert ana.get(f"/ejercicios/{ej['id']}/imagen").content == PNG
    assert contar_imagenes(conn) == 1


def test_subir_a_ejercicio_del_catalogo_sin_imagen(ana, con_imagenes):
    r = ana.put(f"/ejercicios/{con_imagenes['Peso muerto']}/imagen", content=PNG)
    assert r.status_code == 200


def test_no_se_puede_subir_si_ya_tiene_imagen_de_ejemplo(ana, con_imagenes, conn):
    r = ana.put(f"/ejercicios/{con_imagenes['Press de banca']}/imagen", content=JPEG)
    assert r.status_code == 409
    assert ana.get(f"/ejercicios/{con_imagenes['Press de banca']}/imagen").content == PNG


@pytest.mark.parametrize(
    ("contenido", "mensaje"),
    [
        (b"", "ninguna imagen"),
        (b"no soy una imagen", "JPEG, PNG o WebP"),
        (PNG + b"\x00" * (2 * 1024 * 1024), "2 MB"),
    ],
)
def test_imagen_invalida_da_400(ana, conn, contenido, mensaje):
    ej = ana.post("/ejercicios", json={"nombre": "Mi remo"}).json()
    r = ana.put(f"/ejercicios/{ej['id']}/imagen", content=contenido)
    assert r.status_code == 400
    assert mensaje in r.json()["error"]
    assert contar_imagenes(conn) == 0


def test_la_imagen_de_otro_usuario_no_se_ve(ana, bea, catalogo):
    peso_muerto = catalogo["Peso muerto"]
    ana.put(f"/ejercicios/{peso_muerto}/imagen", content=PNG)
    assert bea.get(f"/ejercicios/{peso_muerto}/imagen").status_code == 404
    buscado = bea.get("/ejercicios", params={"q": "peso muerto"}).json()[0]
    assert buscado["imagen"] is None
    # y Bea puede subir la suya sin pisar la de Ana
    bea.put(f"/ejercicios/{peso_muerto}/imagen", content=JPEG)
    assert ana.get(f"/ejercicios/{peso_muerto}/imagen").content == PNG
    assert bea.get(f"/ejercicios/{peso_muerto}/imagen").content == JPEG


def test_ejercicio_propio_de_otro_da_404(ana, bea):
    ej = ana.post("/ejercicios", json={"nombre": "Secreto"}).json()
    assert bea.put(f"/ejercicios/{ej['id']}/imagen", content=PNG).status_code == 404
    assert bea.get(f"/ejercicios/{ej['id']}/imagen").status_code == 404


def test_sin_sesion_da_401(client, catalogo):
    assert client.get(f"/ejercicios/{catalogo['Sentadilla']}/imagen").status_code == 401
    assert client.put(f"/ejercicios/{catalogo['Sentadilla']}/imagen", content=PNG).status_code == 401
