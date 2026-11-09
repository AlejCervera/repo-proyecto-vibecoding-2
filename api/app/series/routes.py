from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.ejercicios import repository as ejercicios
from app.series import repository
from app.series.validation import SerieInvalida, validar_serie

router = APIRouter(prefix="/series")
Usuario = Annotated[dict, Depends(usuario_actual)]


@router.get("")
def listar_series(usuario: Usuario):
    with db.connect() as conn:
        return repository.listar(conn, usuario["id"])


@router.post("", status_code=201)
def crear_serie(usuario: Usuario, datos: Annotated[Any, Body()] = None):
    try:
        serie = validar_serie(datos)
    except SerieInvalida as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    with db.connect() as conn:
        if not ejercicios.visible(conn, usuario["id"], serie.ejercicio_id):
            return JSONResponse({"error": "El ejercicio no existe"}, status_code=400)
        return repository.crear(conn, usuario["id"], serie)
