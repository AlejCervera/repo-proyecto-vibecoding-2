import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app import db
from app.auth.dependencies import usuario_actual
from app.perfil import repository as perfiles
from app.recomendaciones import repository
from app.recomendaciones.contexto import Contexto, EjercicioRutina
from app.recomendaciones.gemini import (
    ErrorIA,
    Generador,
    LimiteAlcanzado,
    cliente_desde_entorno,
)
from app.recomendaciones.servicio import recomendar
from app.recomendaciones.validacion import RespuestaInvalida
from app.rutinas import repository as rutinas

router = APIRouter()
Usuario = Annotated[dict, Depends(usuario_actual)]
log = logging.getLogger(__name__)

SIN_PERFIL = "Completa tu altura y tu peso en «Mi perfil» para pedir recomendaciones"
NO_CONFIGURADO = "Las recomendaciones no están configuradas (falta GEMINI_API_KEY o GEMINI_MODEL)"
LIMITE = (
    "Gemini ha recibido demasiadas peticiones o se ha agotado la cuota gratuita. "
    "Prueba de nuevo en un rato."
)
INVALIDA = "La IA ha dado una respuesta que no es válida. Prueba de nuevo."
SIN_CONEXION = "No se ha podido contactar con Gemini. Prueba de nuevo."


def obtener_ia() -> Generador | None:
    """Se sustituye en las pruebas por una IA falsa."""
    return cliente_desde_entorno()


def _error(mensaje: str, status: int) -> JSONResponse:
    return JSONResponse({"error": mensaje}, status_code=status)


@router.post("/rutinas/{rutina_id}/recomendaciones")
def recomendaciones(
    rutina_id: int, usuario: Usuario, ia: Annotated[Generador | None, Depends(obtener_ia)]
):
    with db.connect() as conn:
        rutina = rutinas.obtener(conn, usuario["id"], rutina_id)
        if rutina is None:
            return _error("La rutina no existe", 404)
        if rutina["predefinida"]:
            return _error("Copia la rutina a tus rutinas para pedir recomendaciones", 403)
        perfil = perfiles.obtener(conn, usuario["id"])
        if not perfil.completo:
            return _error(SIN_PERFIL, 400)
        if ia is None:
            return _error(NO_CONFIGURADO, 503)
        ejercicios = tuple(
            EjercicioRutina(e["id"], e["nombre"], e["series"], e["reps_min"], e["reps_max"])
            for e in rutina["ejercicios"]
        )
        contexto = Contexto(
            altura_cm=perfil.altura_cm,
            peso_corporal_kg=perfil.peso_corporal_kg,
            rutina=rutina["nombre"],
            ejercicios=ejercicios,
            historial=repository.historial(conn, usuario["id"], [e.id for e in ejercicios]),
            catalogo=repository.catalogo(conn, usuario["id"]),
        )
    # La conexión ya está cerrada: no la tenemos ocupada mientras responde Gemini.
    try:
        return recomendar(contexto, ia)
    except LimiteAlcanzado:
        return _error(LIMITE, 429)
    except RespuestaInvalida as e:
        log.warning("Respuesta de Gemini rechazada: %s", e)
        return _error(INVALIDA, 502)
    except ErrorIA as e:
        log.warning("Error al llamar a Gemini: %s", e)
        return _error(SIN_CONEXION, 502)
