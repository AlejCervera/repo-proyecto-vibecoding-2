"""Rutinas predefinidas que vienen con la app. Se identifican los ejercicios por su id en wger.

Para cambiarlas basta con editar esta lista: al arrancar la API (y al importar el catálogo)
se actualizan solas. Los ejercicios que no estén en el catálogo se saltan.
"""

from typing import TypedDict

import psycopg

from app.ejercicios.nombres import normalizar
from app.rutinas import repository
from app.rutinas.logica import Plan

# Todas las predefinidas: 3 series de 8 a 12 repeticiones por ejercicio.
PLAN = Plan(series=3, reps_min=8, reps_max=12)

class Predefinida(TypedDict):
    clave: str
    nombre: str
    wger_ids: list[int]


PREDEFINIDAS: list[Predefinida] = [
    {
        "clave": "pecho",
        "nombre": "Pecho",
        # Press de Banca, Press de banca inclinado, Aperturas con Mancuernas,
        # Cruce de Poleas para Pecho, Fondos en Paralelas
        "wger_ids": [73, 538, 238, 237, 194],
    },
    {
        "clave": "espalda",
        "nombre": "Espalda",
        # Dominadas, Jalón al pecho, Remo sentado, Remo con mancuernas, Peso Muerto Convencional
        "wger_ids": [475, 355, 394, 81, 184],
    },
    {
        "clave": "pierna",
        "nombre": "Pierna",
        # Sentadilla profunda con barra, Prensa de piernas, Peso muerto rumano con barra,
        # Curl femoral, Zancadas Caminando con Mancuernas, Gemelos en prensa
        "wger_ids": [1801, 371, 507, 364, 206, 146],
    },
    {
        "clave": "hombro",
        "nombre": "Hombro",
        # Press militar, Elevación lateral con mancuernas, Aperturas Posteriores en Polea,
        # Jalón a la Cara (face pull)
        "wger_ids": [418, 348, 822, 222],
    },
    {
        "clave": "brazos",
        "nombre": "Brazos",
        # Curl con barra, Curl Martillo, Extensión de tríceps en polea con cuerda,
        # Press Francés con Barra SZ, Fondos entre Bancos
        "wger_ids": [91, 272, 1185, 246, 197],
    },
    {
        "clave": "cuerpo-completo",
        "nombre": "Cuerpo completo",
        # Sentadilla profunda con barra, Press de Banca, Remo sentado, Press militar,
        # Peso muerto rumano con barra, Plancha frontal
        "wger_ids": [1801, 73, 394, 418, 507, 1307],
    },
]


def sembrar(conn: psycopg.Connection, definiciones: list[Predefinida] = PREDEFINIDAS) -> int:
    """Crea o actualiza las predefinidas. Devuelve cuántas quedan con ejercicios."""
    todos = sorted({w for d in definiciones for w in d["wger_ids"]})
    locales = repository.ids_por_wger(conn, todos)
    creadas = 0
    with conn.transaction():
        for d in definiciones:
            ejercicios = [locales[w] for w in d["wger_ids"] if w in locales]
            if not ejercicios:
                continue  # catálogo aún sin importar
            rutina_id = repository.guardar_predefinida(
                conn, d["clave"], d["nombre"], normalizar(d["nombre"])
            )
            repository.poner_ejercicios(conn, rutina_id, [(e, PLAN) for e in ejercicios])
            creadas += 1
    return creadas
