export type EjercicioRutina = { id: number; nombre: string };

export type Rutina = {
  id: number;
  nombre: string;
  predefinida: boolean;
  ejercicios: EjercicioRutina[];
};

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
