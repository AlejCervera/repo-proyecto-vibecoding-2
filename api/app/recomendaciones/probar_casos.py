"""Lanza los casos de prompts/casos/ contra el Gemini REAL (gasta cuota). Manual, con la app
levantada y GEMINI_API_KEY y GEMINI_MODEL en .env:

    docker compose exec api python -m app.recomendaciones.probar_casos

No forma parte de `npm test`: la respuesta del modelo cambia de una vez a otra."""

import sys

from app.recomendaciones import casos
from app.recomendaciones.gemini import ErrorIA, LimiteAlcanzado, cliente_desde_entorno
from app.recomendaciones.servicio import recomendar
from app.recomendaciones.validacion import RespuestaInvalida


def main() -> int:
    ia = cliente_desde_entorno()
    if ia is None:
        print("Falta GEMINI_API_KEY o GEMINI_MODEL en el entorno.")
        return 2
    fallidos = 0
    for caso in casos.cargar():
        if caso.solo_simulado:
            print(f"- {caso.nombre}: se salta (solo se prueba con respuesta simulada)")
            continue
        try:
            resultado = recomendar(caso.contexto, ia)
        except LimiteAlcanzado:
            print(f"✗ {caso.nombre}: 429, límite de Gemini alcanzado. Prueba más tarde.")
            return 1
        except (RespuestaInvalida, ErrorIA) as e:
            print(f"? {caso.nombre}: {type(e).__name__}: {e}")
            resultado = None
        fallos = casos.comprobar(resultado, caso.esperado)
        fallidos += bool(fallos)
        print(f"{'✗' if fallos else '✓'} {caso.nombre}")
        for f in fallos:
            print(f"    {f}")
        if resultado:
            for o in resultado["objetivos"]:
                print(f"    {o['nombre']}: {o['peso_kg']} kg, {o['reps_min']}-{o['reps_max']}")
            for a in resultado["anadir"]:
                print(f"    + {a['nombre']}")
    return 1 if fallidos else 0


if __name__ == "__main__":
    sys.exit(main())
