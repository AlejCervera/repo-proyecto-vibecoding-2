from datetime import UTC, datetime, timedelta

from app.auth.passwords import hash_token
from tests.conftest import CODIGO, PASSWORD, SECRETO, registrar


def login(client, nombre="ana", password=PASSWORD):
    return client.post("/auth/login", json={"nombre_usuario": nombre, "password": password})


def test_registro_inicia_sesion(client):
    r = registrar(client, "ana")
    assert r.status_code == 201
    assert r.json() == {"id": 1, "nombre_usuario": "ana"}
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert client.get("/auth/yo").json() == {"id": 1, "nombre_usuario": "ana"}


def test_registro_guarda_hash_y_no_la_contraseña(client, conn):
    registrar(client, "ana")
    guardado = conn.execute("SELECT password_hash FROM usuarios").fetchone()[0]
    assert PASSWORD not in guardado
    assert guardado.startswith("scrypt$")


def test_registro_sin_codigo_o_con_codigo_malo_da_403(client, conn):
    datos = {"nombre_usuario": "intruso", "password": PASSWORD}
    assert client.post("/auth/registro", json=datos).status_code == 403
    r = client.post("/auth/registro", json={**datos, "codigo_invitacion": "otro"})
    assert r.status_code == 403
    assert conn.execute("SELECT count(*) FROM usuarios").fetchone()[0] == 0


def test_registro_cerrado_si_no_hay_codigo_configurado(client, monkeypatch):
    monkeypatch.setenv("INVITE_CODE", "")
    datos = {"nombre_usuario": "ana", "password": PASSWORD, "codigo_invitacion": ""}
    assert client.post("/auth/registro", json=datos).status_code == 403


def test_registro_con_datos_invalidos_da_400(client):
    datos = {"nombre_usuario": "ana", "password": "corta", "codigo_invitacion": CODIGO}
    r = client.post("/auth/registro", json=datos)
    assert r.status_code == 400
    assert "8 caracteres" in r.json()["error"]


def test_usuario_duplicado_da_409_aunque_cambien_mayusculas(client):
    registrar(client, "ana")
    r = registrar(client, "ANA")
    assert r.status_code == 409


def test_login_correcto_e_ignorando_mayusculas(client):
    registrar(client, "Ana")
    client.cookies.clear()
    r = login(client, "ana")
    assert r.status_code == 200
    assert r.json()["nombre_usuario"] == "Ana"
    assert client.get("/auth/yo").status_code == 200


def test_login_incorrecto_da_401_con_mensaje_generico(client):
    registrar(client, "ana")
    client.cookies.clear()
    malo = login(client, "ana", "otra-contraseña")
    no_existe = login(client, "nadie")
    assert malo.status_code == no_existe.status_code == 401
    assert malo.json() == no_existe.json() == {"error": "Usuario o contraseña incorrectos"}


def test_yo_sin_sesion_da_401(client):
    assert client.get("/auth/yo").status_code == 401


def test_cookie_inventada_da_401(client):
    client.cookies.set("sesion", "inventada")
    assert client.get("/auth/yo").status_code == 401


def test_logout_invalida_la_sesion(ana):
    token = ana.cookies.get("sesion")
    assert ana.post("/auth/logout").status_code == 204
    assert ana.get("/auth/yo").status_code == 401
    ana.cookies.set("sesion", token)  # la cookie vieja ya no sirve
    assert ana.get("/auth/yo").status_code == 401


def test_sesion_caducada_da_401(ana, conn):
    token = ana.cookies.get("sesion")
    pasado = datetime.now(UTC) - timedelta(minutes=1)
    conn.execute(
        "UPDATE sesiones SET expira_en = %s WHERE token_hash = %s",
        (pasado, hash_token(token, SECRETO)),
    )
    assert ana.get("/auth/yo").status_code == 401


def test_la_sesion_se_guarda_como_hash(ana, conn):
    token = ana.cookies.get("sesion")
    guardado = conn.execute("SELECT token_hash FROM sesiones").fetchone()[0]
    assert guardado != token
    assert guardado == hash_token(token, SECRETO)
