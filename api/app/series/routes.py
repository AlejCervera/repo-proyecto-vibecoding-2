from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Response
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.ejercicios import repository as ejercicios
from app.series import repository
from app.series.validation import NuevaSerie, SerieInvalida, validar_serie

router = APIRouter(prefix="/series")
Usuario = Annotated[dict, Depends(usuario_actual)]


def _error(mensaje: str, status: int) -> JSONResponse:
    return JSONResponse({"error": mensaje}, status_code=status)


def _validar(datos: Any) -> NuevaSerie | JSONResponse:
    try:
        return validar_serie(datos)
    except SerieInvalida as e:
        return _error(str(e), 400)


@router.get("")
def listar_series(usuario: Usuario):
    with db.connect() as conn:
        return repository.listar(conn, usuario["id"])


@router.post("", status_code=201)
def crear_serie(usuario: Usuario, datos: Annotated[Any, Body()] = None):
    serie = _validar(datos)
    if isinstance(serie, JSONResponse):
        return serie
    with db.connect() as conn:
        if not ejercicios.visible(conn, usuario["id"], serie.ejercicio_id):
            return _error("El ejercicio no existe", 400)
        return repository.crear(conn, usuario["id"], serie)


@router.put("/{serie_id}")
def editar_serie(serie_id: int, usuario: Usuario, datos: Annotated[Any, Body()] = None):
    serie = _validar(datos)
    if isinstance(serie, JSONResponse):
        return serie
    with db.connect() as conn:
        if not ejercicios.visible(conn, usuario["id"], serie.ejercicio_id):
            return _error("El ejercicio no existe", 400)
        actualizada = repository.actualizar(conn, usuario["id"], serie_id, serie)
    return actualizada or _error("La serie no existe", 404)


@router.delete("/{serie_id}", status_code=204)
def borrar_serie(serie_id: int, usuario: Usuario):
    with db.connect() as conn:
        if not repository.borrar(conn, usuario["id"], serie_id):
            return _error("La serie no existe", 404)
    return Response(status_code=204)
