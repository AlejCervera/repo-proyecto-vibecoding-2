from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app import db
from app.health import check_database
from app.migrate import migrate
from app.series.routes import router as series_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    with db.connect() as conn:
        migrate(conn)
    yield


app = FastAPI(title="Gym Log API", lifespan=lifespan)
app.include_router(series_router)


@app.exception_handler(RequestValidationError)
async def peticion_invalida(_request: Request, _exc: RequestValidationError):
    return JSONResponse({"error": "La petición no es válida"}, status_code=400)


@app.get("/health")
def health():
    if check_database(db.connect):
        return {"status": "ok"}
    return JSONResponse({"status": "error"}, status_code=503)
