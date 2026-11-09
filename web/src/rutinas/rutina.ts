export type EjercicioRutina = {
  id: number;
  nombre: string;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
};

export type Rutina = {
  id: number;
  nombre: string;
  predefinida: boolean;
  ejercicios: EjercicioRutina[];
};

export const MIN_SERIES = 1;
export const MAX_SERIES = 10;

/** Nuevo orden de ids al mover un ejercicio una posición arriba (-1) o abajo (+1). */
export function mover(ids: number[], indice: number, direccion: -1 | 1): number[] {
  const destino = indice + direccion;
  if (destino < 0 || destino >= ids.length) return ids;
  const nuevo = [...ids];
  [nuevo[indice], nuevo[destino]] = [nuevo[destino], nuevo[indice]];
  return nuevo;
}

export function separar(rutinas: Rutina[]) {
  return {
    predefinidas: rutinas.filter((r) => r.predefinida),
    mias: rutinas.filter((r) => !r.predefinida),
  };
}

export function resumen(r: Rutina): string {
  const n = r.ejercicios.length;
  return n === 1 ? "1 ejercicio" : `${n} ejercicios`;
}

/** «8-12», «10» o "" si no hay objetivo. */
export function textoReps(e: Pick<EjercicioRutina, "reps_min" | "reps_max">): string {
  if (e.reps_min === null || e.reps_max === null) return "";
  return e.reps_min === e.reps_max ? String(e.reps_min) : `${e.reps_min}-${e.reps_max}`;
}

/** «3 × 8-12» o «3 series» si no hay objetivo de repeticiones. */
export function textoPlan(e: Pick<EjercicioRutina, "series" | "reps_min" | "reps_max">): string {
  const reps = textoReps(e);
  if (reps) return `${e.series} × ${reps}`;
  return e.series === 1 ? "1 serie" : `${e.series} series`;
}

/** Lee lo escrito («8-12», «10», «8 a 12» o vacío) como objetivo de repeticiones. */
export function parsearReps(texto: string): { reps_min: number | null; reps_max: number | null } {
  const limpio = texto.trim();
  if (limpio === "") return { reps_min: null, reps_max: null };
  const m = /^(\d{1,3})\s*(?:-|a|–)\s*(\d{1,3})$/.exec(limpio) ?? /^(\d{1,3})$/.exec(limpio);
  if (!m) throw new Error("Escribe las repeticiones como «8-12» o «10»");
  const min = Number(m[1]);
  const max = Number(m[2] ?? m[1]);
  if (min < 1 || max > 100) throw new Error("Las repeticiones deben estar entre 1 y 100");
  if (min > max) throw new Error("El mínimo no puede ser mayor que el máximo");
  return { reps_min: min, reps_max: max };
}
