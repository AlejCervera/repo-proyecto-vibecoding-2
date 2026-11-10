from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Response
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.entrenamientos import repository
from app.entrenamientos.logica import EntrenamientoInvalido, agrupar_por_ejercicio, validar
from app.rutinas import repository as rutinas

router = APIRouter(prefix="/entrenamientos")
Usuario = Annotated[dict, Depends(usuario_actual)]

NO_EXISTE = "El entrenamiento no existe"


def _error(mensaje: str, status: int) -> JSONResponse:
    return JSONResponse({"error": mensaje}, status_code=status)


def _detalle(conn, usuario_id: int, entrenamiento_id: int) -> dict[str, Any] | None:
    encontrado = repository.obtener(conn, usuario_id, entrenamiento_id)
    if encontrado is None:
        return None
    cabecera, series = encontrado
    return {**cabecera, "ejercicios": agrupar_por_ejercicio(series)}


@router.get("")
def listar(usuario: Usuario):
    with db.connect() as conn:
        return repository.listar(conn, usuario["id"])


@router.get("/{entrenamiento_id}")
def ver(entrenamiento_id: int, usuario: Usuario):
    with db.connect() as conn:
        detalle = _detalle(conn, usuario["id"], entrenamiento_id)
    return detalle or _error(NO_EXISTE, 404)


@router.post("", status_code=201)
def guardar(usuario: Usuario, datos: Annotated[Any, Body()] = None):
    """Guarda en el diario las series de ese día de la rutina (las que no estén ya guardadas)."""
    try:
        nuevo = validar(datos)
    except EntrenamientoInvalido as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        rutina = rutinas.obtener(conn, usuario["id"], nuevo.rutina_id)
        if rutina is None:
            return _error("La rutina no existe", 404)
        entrenamiento_id = repository.crear(
            conn, usuario["id"], rutina["id"], rutina["nombre"], nuevo.fecha
        )
        if entrenamiento_id is None:
            return _error("No hay series de este día de esta rutina para guardar", 400)
        return _detalle(conn, usuario["id"], entrenamiento_id)


@router.delete("/{entrenamiento_id}", status_code=204)
def quitar(entrenamiento_id: int, usuario: Usuario):
    """Lo quita del diario. Sus series se quedan en el historial de cada ejercicio."""
    with db.connect() as conn:
        if not repository.quitar(conn, usuario["id"], entrenamiento_id):
            return _error(NO_EXISTE, 404)
    return Response(status_code=204)
