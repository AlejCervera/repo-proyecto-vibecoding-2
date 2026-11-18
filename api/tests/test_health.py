import time

from fastapi.testclient import TestClient

from app.health import check_database
from app.main import app


def test_health_ok_con_postgres_de_pruebas(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_503_si_la_base_no_responde(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://x:y@localhost:1/nada")
    inicio = time.monotonic()
    r = TestClient(app).get("/health")
    # Con el pool de conexiones (Fase 9e3) llegó a tardar 30 s en avisar. Tope de 10 s: en Windows
    # una conexión rechazada ya tarda 6 s (prueba ::1 y 127.0.0.1, 3 s cada una); en Linux, nada.
    assert time.monotonic() - inicio < 10
    assert r.status_code == 503
    assert r.json() == {"status": "error"}


def test_check_database_false_si_falla_la_conexion():
    def roto():
        raise OSError("sin conexión")

    assert check_database(roto) is False
