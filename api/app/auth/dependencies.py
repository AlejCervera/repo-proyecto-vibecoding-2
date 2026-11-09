from typing import Any

from fastapi import HTTPException, Request

from app import db
from app.auth import repository
from app.auth.passwords import hash_token
from app.config import session_secret

COOKIE = "sesion"


def usuario_actual(request: Request) -> dict[str, Any]:
    """Usuario de la cookie de sesión, o 401."""
    token = request.cookies.get(COOKIE)
    if token:
        with db.connect() as conn:
            usuario = repository.usuario_de_sesion(conn, hash_token(token, session_secret()))
        if usuario:
            return usuario
    raise HTTPException(status_code=401, detail="Inicia sesión para continuar")
