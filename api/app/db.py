"""Conexiones a Postgres a través de un pool (Fase 9e3).

Abrir una conexión cuesta mucho más que la consulta (≈ 6 ms en local, cientos de ms con TLS en
Neon), y cada petición abría dos. Ahora se reutilizan unas pocas conexiones abiertas.
`with connect() as conn:` se usa igual que antes: al salir confirma, y si hay error deshace.
"""

from contextlib import AbstractContextManager
from threading import Lock

import psycopg
from psycopg_pool import ConnectionPool

from app.config import database_url

_pools: dict[str, ConnectionPool] = {}
_cerrojo = Lock()


def _pool() -> ConnectionPool:
    url = database_url()
    with _cerrojo:
        pool = _pools.get(url)
        if pool is None:
            pool = ConnectionPool(
                url,
                min_size=1,
                max_size=10,
                kwargs={"connect_timeout": 3},
                # Comprueba la conexión antes de darla: si la base de datos la cortó, abre otra
                check=ConnectionPool.check_connection,
                timeout=10,
                open=True,
            )
            try:
                # La primera conexión lista antes de usarla (si no, abre otra de más). Si la base
                # de datos no responde, se avisa en 3 s (no en 30) y no se deja el pool reintentando.
                pool.wait(timeout=3)
            except Exception:
                pool.close(timeout=0)  # sin esperar al intento de conexión en curso
                raise
            _pools[url] = pool
        return pool


def connect() -> AbstractContextManager[psycopg.Connection]:
    return _pool().connection()


def cerrar() -> None:
    """Cierra todos los pools (al apagar la API y en las pruebas)."""
    with _cerrojo:
        for pool in _pools.values():
            pool.close()
        _pools.clear()
