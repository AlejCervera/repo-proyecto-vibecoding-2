from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Response
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.ejercicios import repository as ejercicios
from app.ejercicios.nombres import normalizar
from app.rutinas import repository
from app.rutinas.logica import (
    Plan,
    RutinaInvalida,
    nombre_copia,
    validar_ejercicio_id,
    validar_nombre,
    validar_orden,
    validar_plan,
)

router = APIRouter(prefix="/rutinas")
Usuario = Annotated[dict, Depends(usuario_actual)]
Datos = Annotated[Any, Body()]

NO_EXISTE = "La rutina no existe"
PREDEFINIDA = "Las rutinas predefinidas no se pueden cambiar: cópiala a tus rutinas"


def _error(mensaje: str, status: int) -> JSONResponse:
    return JSONResponse({"error": mensaje}, status_code=status)


def _solo_propia(conn, usuario_id: int, rutina_id: int) -> JSONResponse | None:
    """Error si la rutina no se puede modificar; None si es del usuario."""
    tipo = repository.tipo(conn, usuario_id, rutina_id)
    if tipo is None:
        return _error(NO_EXISTE, 404)
    if tipo == "predefinida":
        return _error(PREDEFINIDA, 403)
    return None


def _ya_tienes(nombre: str) -> JSONResponse:
    return _error(f"Ya tienes una rutina llamada «{nombre}»", 409)


@router.get("")
def listar_rutinas(usuario: Usuario):
    with db.connect() as conn:
        return repository.listar(conn, usuario["id"])


@router.get("/{rutina_id}")
def ver_rutina(rutina_id: int, usuario: Usuario):
    with db.connect() as conn:
        rutina = repository.obtener(conn, usuario["id"], rutina_id)
    return rutina or _error(NO_EXISTE, 404)


@router.post("", status_code=201)
def crear_rutina(usuario: Usuario, datos: Datos = None):
    try:
        nombre = validar_nombre(datos)
    except RutinaInvalida as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        rutina_id = repository.crear(conn, usuario["id"], nombre, normalizar(nombre))
        if rutina_id is None:
            return _ya_tienes(nombre)
        return repository.obtener(conn, usuario["id"], rutina_id)


@router.put("/{rutina_id}")
def renombrar_rutina(rutina_id: int, usuario: Usuario, datos: Datos = None):
    try:
        nombre = validar_nombre(datos)
    except RutinaInvalida as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        if error := _solo_propia(conn, usuario["id"], rutina_id):
            return error
        if not repository.renombrar(conn, rutina_id, nombre, normalizar(nombre)):
            return _ya_tienes(nombre)
        return repository.obtener(conn, usuario["id"], rutina_id)


@router.delete("/{rutina_id}", status_code=204)
def borrar_rutina(rutina_id: int, usuario: Usuario):
    with db.connect() as conn:
        if error := _solo_propia(conn, usuario["id"], rutina_id):
            return error
        repository.borrar(conn, rutina_id)
    return Response(status_code=204)


@router.post("/{rutina_id}/ejercicios")
def anadir_ejercicio(rutina_id: int, usuario: Usuario, datos: Datos = None):
    try:
        ejercicio_id = validar_ejercicio_id(datos)
        plan = validar_plan(datos)
    except RutinaInvalida as e:
        return _error(str(e), 400)
    with db.connect() as conn:
        if error := _solo_propia(conn, usuario["id"], rutina_id):
            return error
        if not ejercicios.visible(conn, usuario["id"], ejercicio_id):
            return _error("El ejercicio no existe", 400)
        if not repository.anadir_ejercicio(conn, rutina_id, ejercicio_id, plan):
            return _error("Ese ejercicio ya está en la rutina", 409)
        return repository.obtener(conn, usuario["id"], rutina_id)


@router.put("/{rutina_id}/ejercicios/{ejercicio_id}")
def configurar_ejercicio(rutina_id: int, ejercicio_id: int, usuario: Usuario, datos: Datos = None):
    """Cambia las series y/o las repeticiones objetivo; lo que no se envía se conserva."""
    with db.connect() as conn:
        if error := _solo_propia(conn, usuario["id"], rutina_id):
            return error
        actual = repository.plan_de(conn, rutina_id, ejercicio_id)
        if actual is None:
            return _error("Ese ejercicio no está en la rutina", 404)
        try:
            plan = validar_plan(datos, por_defecto=actual)
        except RutinaInvalida as e:
            return _error(str(e), 400)
        repository.configurar_ejercicio(conn, rutina_id, ejercicio_id, plan)
        return repository.obtener(conn, usuario["id"], rutina_id)


@router.delete("/{rutina_id}/ejercicios/{ejercicio_id}")
def quitar_ejercicio(rutina_id: int, ejercicio_id: int, usuario: Usuario):
    with db.connect() as conn:
        if error := _solo_propia(conn, usuario["id"], rutina_id):
            return error
        if not repository.quitar_ejercicio(conn, rutina_id, ejercicio_id):
            return _error("Ese ejercicio no está en la rutina", 404)
        return repository.obtener(conn, usuario["id"], rutina_id)


@router.put("/{rutina_id}/orden")
def reordenar(rutina_id: int, usuario: Usuario, datos: Datos = None):
    with db.connect() as conn:
        if error := _solo_propia(conn, usuario["id"], rutina_id):
            return error
        try:
            orden = validar_orden(repository.ids_ejercicios(conn, rutina_id), datos)
        except RutinaInvalida as e:
            return _error(str(e), 400)
        repository.reordenar(conn, rutina_id, orden)
        return repository.obtener(conn, usuario["id"], rutina_id)


@router.post("/{rutina_id}/copiar", status_code=201)
def copiar(rutina_id: int, usuario: Usuario):
    with db.connect() as conn:
        original = repository.obtener(conn, usuario["id"], rutina_id)
        if original is None:
            return _error(NO_EXISTE, 404)
        with conn.transaction():
            nombre = nombre_copia(original["nombre"], repository.nombres_propios(conn, usuario["id"]))
            nueva = repository.crear(conn, usuario["id"], nombre, normalizar(nombre))
            if nueva is None:  # otra petición usó el nombre a la vez
                return _ya_tienes(nombre)
            planes = [
                (e["id"], Plan(e["series"], e["reps_min"], e["reps_max"]))
                for e in original["ejercicios"]
            ]
            repository.poner_ejercicios(conn, nueva, planes)
        return repository.obtener(conn, usuario["id"], nueva)
