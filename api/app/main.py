from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app import db
from app.health import check_database

app = FastAPI(title="Gym Log API")


@app.get("/health")
def health():
    if check_database(db.connect):
        return {"status": "ok"}
    return JSONResponse({"status": "error"}, status_code=503)
