from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.perfil import repository
from app.perfil.logica import PerfilInvalido, a_dict, validar_perfil

router = APIRouter(prefix="/perfil")
Usuario = Annotated[dict, Depends(usuario_actual)]


@router.get("")
def ver_perfil(usuario: Usuario):
    with db.connect() as conn:
        return a_dict(repository.obtener(conn, usuario["id"]))


@router.put("")
def guardar_perfil(usuario: Usuario, datos: Annotated[Any, Body()] = None):
    try:
        perfil = validar_perfil(datos)
    except PerfilInvalido as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    with db.connect() as conn:
        repository.guardar(conn, usuario["id"], perfil)
    return a_dict(perfil)
