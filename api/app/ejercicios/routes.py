from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Response
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.ejercicios import repository
from app.ejercicios.borrado import BorradoInvalido, FaltaDecidir, decidir
from app.ejercicios.nombres import NombreInvalido, normalizar, validar_nombre

router = APIRouter(prefix="/ejercicios")
Usuario = Annotated[dict, Depends(usuario_actual)]


def _error(mensaje: str, status: int, **extra: Any) -> JSONResponse:
    return JSONResponse({"error": mensaje, **extra}, status_code=status)


def _ya_existe(ejercicio: dict[str, Any]) -> JSONResponse:
    return _error(f"Ya existe «{ejercicio['nombre']}»", 409, ejercicio=ejercicio)


@router.get("")
def buscar_ejercicios(usuario: Usuario, q: str = ""):
    with db.connect() as conn:
        return repository.buscar(conn, usuario["id"], normalizar(q))


@router.get("/propios")
def mis_ejercicios(usuario: Usuario):
    with db.connect() as conn:
        return repository.listar_propios(conn, usuario["id"])


@router.post("", status_code=201)
def crear_ejercicio(usuario: Usuario, datos: Annotated[Any, Body()] = None):
    try:
        nombre = validar_nombre(datos)
    except NombreInvalido as e:
        return _error(str(e), 400)
    norm = normalizar(nombre)
    with db.connect() as conn:
        existente = repository.duplicado(conn, usuario["id"], norm)
        if existente:
            return _ya_existe(existente)
        creado = repository.crear_propio(conn, usuario["id"], nombre, norm)
        # Si otra petición lo creó a la vez, el INSERT no hace nada: devolvemos el existente.
        return creado or _ya_existe(repository.duplicado(conn, usuario["id"], norm))


@router.put("/{ejercicio_id}")
def renombrar_ejercicio(
    ejercicio_id: int, usuario: Usuario, datos: Annotated[Any, Body()] = None
):
    try:
        nombre = validar_nombre(datos)
    except NombreInvalido as e:
        return _error(str(e), 400)
    norm = normalizar(nombre)
    with db.connect() as conn:
        if not repository.es_propio(conn, usuario["id"], ejercicio_id):
            return _error("El ejercicio no existe o no es tuyo", 404)
        existente = repository.duplicado(conn, usuario["id"], norm, excluir_id=ejercicio_id)
        if existente:
            return _ya_existe(existente)
        if not repository.renombrar(conn, usuario["id"], ejercicio_id, nombre, norm):
            return _ya_existe(repository.duplicado(conn, usuario["id"], norm, ejercicio_id))
        return repository.obtener(conn, usuario["id"], ejercicio_id)


@router.delete("/{ejercicio_id}", status_code=204)
def borrar_ejercicio(
    ejercicio_id: int, usuario: Usuario, series: str | None = None, mover_a: int | None = None
):
    with db.connect() as conn:
        if not repository.es_propio(conn, usuario["id"], ejercicio_id):
            return _error("El ejercicio no existe o no es tuyo", 404)
        num = repository.contar_series(conn, usuario["id"], ejercicio_id)
        try:
            plan = decidir(ejercicio_id, num, series, mover_a)
        except BorradoInvalido as e:
            return _error(str(e), 400)
        except FaltaDecidir as e:
            return _error(
                f"Este ejercicio tiene {e.num_series} series: decide qué hacer con ellas",
                409,
                num_series=e.num_series,
            )
        if plan.mover_a is not None and not repository.visible(conn, usuario["id"], plan.mover_a):
            return _error("El ejercicio de destino no existe", 400)
        repository.borrar_propio(conn, usuario["id"], ejercicio_id, plan.mover_a)
    return Response(status_code=204)
