from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.ejercicios import repository as ejercicios
from app.series import repository

router = APIRouter(prefix="/ejercicios/{ejercicio_id}/series")


@router.get("")
def historial(ejercicio_id: int, usuario: Annotated[dict, Depends(usuario_actual)]):
    """El ejercicio y todas las series del usuario con él, la más reciente primero."""
    with db.connect() as conn:
        ejercicio = ejercicios.obtener(conn, usuario["id"], ejercicio_id)
        if ejercicio is None:
            return JSONResponse({"error": "El ejercicio no existe"}, status_code=404)
        series = repository.listar_por_ejercicio(conn, usuario["id"], ejercicio_id)
    return {"ejercicio": ejercicio, "series": series}
