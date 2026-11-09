"""Aplica en orden los archivos SQL de api/migrations que aún no se han aplicado."""

from pathlib import Path

import psycopg

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def pending(applied: set[str], directory: Path = MIGRATIONS_DIR) -> list[Path]:
    files = sorted(directory.glob("*.sql"))
    return [f for f in files if f.stem not in applied]


def migrate(conn: psycopg.Connection, directory: Path = MIGRATIONS_DIR) -> list[str]:
    """Devuelve los nombres de las migraciones aplicadas en esta llamada."""
    with conn.transaction():
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "version TEXT PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now())"
        )
        conn.execute("LOCK TABLE schema_migrations IN EXCLUSIVE MODE")
        rows = conn.execute("SELECT version FROM schema_migrations").fetchall()
        applied = {r[0] for r in rows}
        done = []
        for file in pending(applied, directory):
            conn.execute(file.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (file.stem,))
            done.append(file.stem)
    return done
