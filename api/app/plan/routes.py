"""Plan semanal (qué rutina toca cada día) y cambios de un día concreto (Fase 9c)."""

from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Response
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.plan import repository
from app.plan.logica import PlanInvalido, leer_fecha, validar_dia, validar_rango, validar_semana
from app.rutinas import repository as rutinas

router = APIRouter(prefix="/plan")
Usuario = Annotated[dict, Depends(usuario_actual)]
NO_EXISTE = "La rutina no existe"


def _error(mensaje: str, status: int) -> JSONResponse:
    return JSONResponse({"error": mensaje}, status_code=status)


def _visibles(conn, usuario_id: int, ids: list[int | None]) -> bool:
    """Solo se pueden planificar rutinas propias o predefinidas."""
    return all(rid is None or rutinas.tipo(conn, usuario_id, rid) is not None for rid in ids)


@router.get("/semana")
def ver_semana(usuario: Usuario):
    with db.connect() as conn:
        return {"dias": repository.leer_semana(conn, usuario["id"])}


@router.put("/semana")
def guardar_semana(usuario: Usuario, datos: Annotated[Any, Body()] = None):
    try:
        dias = validar_semana(datos)
    except PlanInvalido as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        if not _visibles(conn, usuario["id"], dias):
            return _error(NO_EXISTE, 400)
        repository.guardar_semana(conn, usuario["id"], dias)
        return {"dias": repository.leer_semana(conn, usuario["id"])}


@router.get("/dias")
def ver_dias(usuario: Usuario, desde: str = "", hasta: str = ""):
    try:
        inicio, fin = validar_rango(desde, hasta)
    except PlanInvalido as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        return {"dias": repository.leer_dias(conn, usuario["id"], inicio, fin)}


@router.put("/dias/{fecha}")
def cambiar_dia(fecha: str, usuario: Usuario, datos: Annotated[Any, Body()] = None):
    try:
        dia = leer_fecha(fecha)
        rutina_id = validar_dia(datos)
    except PlanInvalido as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        if not _visibles(conn, usuario["id"], [rutina_id]):
            return _error(NO_EXISTE, 400)
        repository.guardar_dia(conn, usuario["id"], dia, rutina_id)
        return repository.leer_dias(conn, usuario["id"], dia, dia)[0]


@router.delete("/dias/{fecha}", status_code=204)
def volver_al_plan(fecha: str, usuario: Usuario):
    try:
        dia = leer_fecha(fecha)
    except PlanInvalido as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        repository.quitar_dia(conn, usuario["id"], dia)
    return Response(status_code=204)
