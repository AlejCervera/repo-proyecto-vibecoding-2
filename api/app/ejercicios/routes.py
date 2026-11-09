from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.ejercicios import repository
from app.ejercicios.nombres import NombreInvalido, normalizar, validar_nombre

router = APIRouter(prefix="/ejercicios")
Usuario = Annotated[dict, Depends(usuario_actual)]


@router.get("")
def buscar_ejercicios(usuario: Usuario, q: str = ""):
    with db.connect() as conn:
        return repository.buscar(conn, usuario["id"], normalizar(q))


def _ya_existe(ejercicio: dict[str, Any]) -> JSONResponse:
    return JSONResponse(
        {"error": f"Ya existe «{ejercicio['nombre']}»", "ejercicio": ejercicio}, status_code=409
    )


@router.post("", status_code=201)
def crear_ejercicio(usuario: Usuario, datos: Annotated[Any, Body()] = None):
    try:
        nombre = validar_nombre(datos)
    except NombreInvalido as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    norm = normalizar(nombre)
    with db.connect() as conn:
        existente = repository.duplicado(conn, usuario["id"], norm)
        if existente:
            return _ya_existe(existente)
        creado = repository.crear_propio(conn, usuario["id"], nombre, norm)
        # Si otra petición lo creó a la vez, el INSERT no hace nada: devolvemos el existente.
        return creado or _ya_existe(repository.duplicado(conn, usuario["id"], norm))
