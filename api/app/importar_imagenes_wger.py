"""Descarga una vez las imágenes de ejemplo de wger.de para los ejercicios del catálogo.

Uso: python -m app.importar_imagenes_wger   (repetirlo no duplica: salta los que ya tienen imagen)
Requiere haber importado antes el catálogo (python -m app.importar_wger).
"""

from collections.abc import Callable, Iterable
from typing import Any
from urllib.request import Request, urlopen

from app import db
from app.ejercicios.wger import paginas
from app.imagenes import repository
from app.imagenes.formato import MAX_BYTES, detectar_tipo
from app.imagenes.wger import URL_INICIAL, elegir_principales
from app.migrate import migrate


def descargar(url: str) -> bytes:
    peticion = Request(url, headers={"User-Agent": "gym-log-importador/1.0"})
    with urlopen(peticion, timeout=30) as res:
        return res.read(MAX_BYTES + 1)


def importar(
    conn, resultados: Iterable[dict[str, Any]], bajar: Callable[[str], bytes] = descargar
) -> dict[str, int]:
    pendientes = repository.ejercicios_sin_imagen_wger(conn)
    cuenta = {"guardadas": 0, "fallidas": 0}
    for img in elegir_principales(resultados):
        ejercicio_id = pendientes.get(img["wger_ejercicio_id"])
        if ejercicio_id is None:
            continue  # ejercicio no importado o ya con imagen
        try:
            contenido = bajar(img["url"])
        except OSError:
            cuenta["fallidas"] += 1
            continue
        tipo = detectar_tipo(contenido)
        if tipo is None or len(contenido) > MAX_BYTES:
            cuenta["fallidas"] += 1
            continue
        with conn.transaction():
            guardada = repository.guardar_wger(
                conn, ejercicio_id, tipo, contenido, img["licencia"], img["autor"], img["wger_id"]
            )
        cuenta["guardadas"] += int(guardada)
    return cuenta


def main() -> None:
    with db.connect() as conn:
        migrate(conn)
        cuenta = importar(conn, paginas(URL_INICIAL))
    print(f"Imágenes guardadas: {cuenta['guardadas']}. Fallidas: {cuenta['fallidas']}.")


if __name__ == "__main__":
    main()
