from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app import db
from app.auth.dependencies import usuario_actual
from app.ejercicios import repository as ejercicios
from app.imagenes import repository
from app.imagenes.formato import MAX_BYTES, ImagenInvalida, validar_subida

router = APIRouter(prefix="/ejercicios/{ejercicio_id}/imagen")
Usuario = Annotated[dict, Depends(usuario_actual)]


def _error(mensaje: str, status: int) -> JSONResponse:
    return JSONResponse({"error": mensaje}, status_code=status)


@router.get("")
def ver_imagen(ejercicio_id: int, usuario: Usuario):
    with db.connect() as conn:
        if not ejercicios.visible(conn, usuario["id"], ejercicio_id):
            return _error("El ejercicio no existe", 404)
        imagen = repository.obtener(conn, ejercicio_id, usuario["id"])
    if imagen is None:
        return _error("Este ejercicio no tiene imagen", 404)
    tipo, contenido = imagen
    return Response(
        contenido,
        media_type=tipo,
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


async def _leer_con_limite(request: Request) -> bytes | None:
    """Lee el cuerpo; None si pasa del límite (sin cargarlo entero en memoria)."""
    partes, total = [], 0
    async for parte in request.stream():
        total += len(parte)
        if total > MAX_BYTES:
            return None
        partes.append(parte)
    return b"".join(partes)


def _guardar(ejercicio_id: int, usuario_id: int, contenido: bytes) -> JSONResponse | None:
    with db.connect() as conn:
        if not ejercicios.visible(conn, usuario_id, ejercicio_id):
            return _error("El ejercicio no existe", 404)
        if repository.tiene_imagen_wger(conn, ejercicio_id):
            return _error("Este ejercicio ya tiene una imagen de ejemplo", 409)
        try:
            tipo = validar_subida(contenido)
        except ImagenInvalida as e:
            return _error(str(e), 400)
        repository.guardar_propia(conn, ejercicio_id, usuario_id, tipo, contenido)
    return None


@router.put("")
async def subir_imagen(ejercicio_id: int, usuario: Usuario, request: Request):
    contenido = await _leer_con_limite(request)
    if contenido is None:
        return _error("La imagen no puede pasar de 2 MB", 400)
    error = await run_in_threadpool(_guardar, ejercicio_id, usuario["id"], contenido)
    return error or {"origen": "propia"}
