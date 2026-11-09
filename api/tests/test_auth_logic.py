import pytest

from app.auth.passwords import hash_password, hash_token, nuevo_token, verify_password
from app.auth.validation import DatosInvalidos, codigo_valido, validar_login, validar_registro


def test_hash_verifica_la_correcta_y_rechaza_la_incorrecta():
    h = hash_password("contraseña-segura")
    assert verify_password("contraseña-segura", h)
    assert not verify_password("otra", h)


def test_misma_contraseña_da_hashes_distintos():
    assert hash_password("igual-igual") != hash_password("igual-igual")


@pytest.mark.parametrize("guardado", ["", "basura", "md5$a$b$c$d$e", "scrypt$x$8$1$00$00"])
def test_hash_mal_formado_no_verifica(guardado):
    assert not verify_password("lo-que-sea", guardado)


def test_tokens_aleatorios_y_hash_depende_del_secreto():
    t = nuevo_token()
    assert t != nuevo_token()
    assert hash_token(t, "a") != hash_token(t, "b")
    assert hash_token(t, "a") == hash_token(t, "a")


def test_registro_valido_quita_espacios_del_nombre():
    c = validar_registro({"nombre_usuario": " ana.g_1 ", "password": "12345678"})
    assert c.nombre_usuario == "ana.g_1"


@pytest.mark.parametrize(
    ("datos", "mensaje"),
    [
        ({"nombre_usuario": "", "password": "12345678"}, "usuario y contraseña"),
        ({"nombre_usuario": "ab", "password": "12345678"}, "3 a 30"),
        ({"nombre_usuario": "con espacio", "password": "12345678"}, "3 a 30"),
        ({"nombre_usuario": "a" * 31, "password": "12345678"}, "3 a 30"),
        ({"nombre_usuario": "ana", "password": "1234567"}, "8 caracteres"),
        ({"nombre_usuario": "ana", "password": "x" * 201}, "demasiado larga"),
        ({"nombre_usuario": 5, "password": "12345678"}, "usuario y contraseña"),
    ],
)
def test_registro_invalido(datos, mensaje):
    with pytest.raises(DatosInvalidos, match=mensaje):
        validar_registro(datos)


def test_login_no_exige_formato_pero_si_datos():
    assert validar_login({"nombre_usuario": "x", "password": "y"}).password == "y"
    with pytest.raises(DatosInvalidos):
        validar_login("no es un objeto")


def test_codigo_de_invitacion():
    assert codigo_valido("abc", "abc")
    assert codigo_valido(" abc ", "abc")
    assert not codigo_valido("abd", "abc")
    assert not codigo_valido(None, "abc")
    assert not codigo_valido("", "")  # sin código configurado, cerrado
