/**
 * Precarga (Fase 9e3): pide en segundo plano lo mismo que piden las pestañas, con las mismas rutas,
 * para que la memoria de la API (api/cache.ts) ya lo tenga cuando se abran.
 */
import { misEjercicios } from "./api/ejercicios";
import { listarEntrenamientos } from "./api/entrenamientos";
import { obtenerHistorial } from "./api/historial";
import { obtenerPerfil } from "./api/perfil";
import { leerCambios, leerSemana } from "./api/plan";
import { listarRutinas } from "./api/rutinas";
import { listarSeries } from "./api/series";
import { limitesMes, sumarDias } from "./diario/calendario";
import { hoyISO } from "./series/serie";

/** Inicio, Diario (mes actual), Entrenar, Ejercicios y Perfil. Nunca falla: si algo no llega, la pantalla lo pedirá. */
export function precargarPestanas(hoy = hoyISO()): Promise<unknown> {
  const mes = limitesMes(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1);
  return Promise.allSettled([
    listarSeries(),
    listarRutinas(),
    listarEntrenamientos(),
    leerSemana(),
    leerCambios(sumarDias(hoy, -55), sumarDias(hoy, 6)), // Inicio: racha de 8 semanas
    leerCambios(mes.desde, mes.hasta), // Diario: el calendario del mes
    misEjercicios(),
    obtenerPerfil(),
  ]);
}

/** Al empezar un entreno: el historial de cada ejercicio, para pasar de uno a otro sin esperar. */
export function precargarHistoriales(ejercicioIds: number[]): Promise<unknown> {
  return Promise.allSettled(ejercicioIds.map((id) => obtenerHistorial(id)));
}
