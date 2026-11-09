"""Importa el catálogo base de ejercicios desde wger.de (una sola vez; repetirlo no duplica).

Uso:
    python -m app.importar_wger                  # desde la API de wger
    python -m app.importar_wger --archivo x.json  # desde un archivo ("-" = entrada estándar)
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from app import db
from app.ejercicios import repository
from app.ejercicios.wger import extraer_ejercicios, paginas
from app.migrate import migrate
from app.rutinas import predefinidas


def leer_archivo(ruta: str) -> list[dict[str, Any]]:
    texto = sys.stdin.read() if ruta == "-" else Path(ruta).read_text(encoding="utf-8")
    datos = json.loads(texto)
    return datos["results"] if isinstance(datos, dict) else datos


def importar(conn, resultados) -> tuple[int, int]:
    """Devuelve (leídos, nuevos)."""
    ejercicios = extraer_ejercicios(resultados)
    with conn.transaction():
        nuevos = repository.insertar_base(conn, ejercicios)
    return len(ejercicios), nuevos


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archivo", help="JSON con resultados de exerciseinfo ('-' = stdin)")
    args = parser.parse_args(argv)

    resultados = leer_archivo(args.archivo) if args.archivo else paginas()
    with db.connect() as conn:
        migrate(conn)
        leidos, nuevos = importar(conn, resultados)
        rutinas = predefinidas.sembrar(conn)
    print(f"Ejercicios leídos: {leidos}. Nuevos en el catálogo: {nuevos}.")
    print(f"Rutinas predefinidas disponibles: {rutinas}.")


if __name__ == "__main__":
    main()
