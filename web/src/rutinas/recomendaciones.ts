import type { SugerenciaAnadir, SugerenciaObjetivo, SugerenciaSustituir } from "../api/recomendaciones";
import { anadirEjercicio, configurarEjercicio, quitarEjercicio, reordenarRutina } from "../api/rutinas";
import type { Rutina } from "./rutina";

/** Mueve «id» a la posición indicada (si ya está). */
export function colocar(ids: number[], id: number, posicion: number): number[] {
  const resto = ids.filter((x) => x !== id);
  if (resto.length === ids.length) return ids;
  const destino = Math.max(0, Math.min(posicion, resto.length));
  return [...resto.slice(0, destino), id, ...resto.slice(destino)];
}

/** «82,5 kg» o null si no hay peso recomendado. */
export function textoPeso(peso: number | null): string | null {
  return peso === null ? null : `${peso.toLocaleString("es-ES")} kg`;
}

export function aplicarAnadir(rutinaId: number, s: SugerenciaAnadir): Promise<Rutina> {
  return anadirEjercicio(rutinaId, s.ejercicio_id, {
    series: s.series,
    reps_min: s.reps_min,
    reps_max: s.reps_max,
  });
}

export function aplicarObjetivo(rutinaId: number, s: SugerenciaObjetivo): Promise<Rutina> {
  return configurarEjercicio(rutinaId, s.ejercicio_id, { reps_min: s.reps_min, reps_max: s.reps_max });
}

/** Cambia un ejercicio por otro en el mismo sitio, conservando sus series y su objetivo. */
export async function aplicarSustitucion(rutina: Rutina, s: SugerenciaSustituir): Promise<Rutina> {
  const posicion = rutina.ejercicios.findIndex((e) => e.id === s.quitar_id);
  if (posicion < 0) throw new Error(`«${s.quitar_nombre}» ya no está en la rutina`);
  const { series, reps_min, reps_max } = rutina.ejercicios[posicion];
  await anadirEjercicio(rutina.id, s.poner_id, { series, reps_min, reps_max });
  const sinViejo = await quitarEjercicio(rutina.id, s.quitar_id);
  const ids = sinViejo.ejercicios.map((e) => e.id);
  const orden = colocar(ids, s.poner_id, posicion);
  if (orden.every((id, i) => id === ids[i])) return sinViejo;
  return reordenarRutina(rutina.id, orden);
}
