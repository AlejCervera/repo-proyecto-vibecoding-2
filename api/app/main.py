from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app import db
from app.auth.routes import router as auth_router
from app.ejercicios.routes import router as ejercicios_router
from app.entrenamientos.routes import router as entrenamientos_router
from app.health import check_database
from app.imagenes.routes import router as imagenes_router
from app.migrate import migrate
from app.perfil.routes import router as perfil_router
from app.recomendaciones.routes import router as recomendaciones_router
from app.rutinas import predefinidas
from app.rutinas.routes import router as rutinas_router
from app.series.historial import router as historial_router
from app.series.routes import router as series_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    with db.connect() as conn:
        migrate(conn)
        predefinidas.sembrar(conn)
    yield


app = FastAPI(title="Gym Log API", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(ejercicios_router)
app.include_router(imagenes_router)
app.include_router(historial_router)
app.include_router(rutinas_router)
app.include_router(entrenamientos_router)
app.include_router(series_router)
app.include_router(perfil_router)
app.include_router(recomendaciones_router)


@app.exception_handler(RequestValidationError)
async def peticion_invalida(_request: Request, _exc: RequestValidationError):
    return JSONResponse({"error": "La petición no es válida"}, status_code=400)


@app.exception_handler(HTTPException)
async def error_http(_request: Request, exc: HTTPException):
    """Todos los errores con la misma forma: {"error": "..."}."""
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code, headers=exc.headers)


@app.get("/health")
def health():
    if check_database(db.connect):
        return {"status": "ok"}
    return JSONResponse({"status": "error"}, status_code=503)
