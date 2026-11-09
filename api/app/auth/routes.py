from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Request, Response
from fastapi.responses import JSONResponse

from app import db
from app.auth import repository
from app.auth.dependencies import COOKIE, usuario_actual
from app.auth.passwords import HASH_FALSO, hash_password, hash_token, nuevo_token, verify_password
from app.auth.validation import DatosInvalidos, codigo_valido, validar_login, validar_registro
from app.config import cookie_secure, invite_code, session_secret

router = APIRouter(prefix="/auth")
DURACION = timedelta(days=30)


def _error(mensaje: str, status: int) -> JSONResponse:
    return JSONResponse({"error": mensaje}, status_code=status)


def _iniciar_sesion(conn, usuario: dict[str, Any], status: int) -> JSONResponse:
    token = nuevo_token()
    repository.crear_sesion(
        conn, usuario["id"], hash_token(token, session_secret()), datetime.now(UTC) + DURACION
    )
    res = JSONResponse(usuario, status_code=status)
    res.set_cookie(
        COOKIE,
        token,
        max_age=int(DURACION.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=cookie_secure(),
        path="/",
    )
    return res


@router.post("/registro")
def registro(datos: Annotated[Any, Body()] = None):
    try:
        cred = validar_registro(datos)
    except DatosInvalidos as e:
        return _error(str(e), 400)
    if not codigo_valido(datos.get("codigo_invitacion"), invite_code()):
        return _error("El código de invitación no es correcto", 403)
    with db.connect() as conn:
        try:
            usuario = repository.crear_usuario(
                conn, cred.nombre_usuario, hash_password(cred.password)
            )
        except repository.UsuarioExistente:
            return _error("Ese nombre de usuario ya existe", 409)
        return _iniciar_sesion(conn, usuario, 201)


@router.post("/login")
def login(datos: Annotated[Any, Body()] = None):
    try:
        cred = validar_login(datos)
    except DatosInvalidos as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        encontrado = repository.buscar_para_login(conn, cred.nombre_usuario)
        usuario, guardado = encontrado or (None, HASH_FALSO)
        if not verify_password(cred.password, guardado) or usuario is None:
            return _error("Usuario o contraseña incorrectos", 401)
        return _iniciar_sesion(conn, usuario, 200)


@router.post("/logout", status_code=204)
def logout(request: Request):
    token = request.cookies.get(COOKIE)
    if token:
        with db.connect() as conn:
            repository.borrar_sesion(conn, hash_token(token, session_secret()))
    res = Response(status_code=204)
    res.delete_cookie(COOKIE, path="/", httponly=True, samesite="lax", secure=cookie_secure())
    return res


@router.get("/yo")
def yo(usuario: Annotated[dict, Depends(usuario_actual)]):
    return usuario
