from typing import Annotated, Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse

from app import db
from app.series import repository
from app.series.validation import SerieInvalida, validar_serie

router = APIRouter(prefix="/series")


@router.get("")
def listar_series():
    with db.connect() as conn:
        return repository.listar(conn)


@router.post("", status_code=201)
def crear_serie(datos: Annotated[Any, Body()] = None):
    try:
        serie = validar_serie(datos)
    except SerieInvalida as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    with db.connect() as conn:
        return repository.crear(conn, serie)
