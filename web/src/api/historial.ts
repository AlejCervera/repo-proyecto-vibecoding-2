import type { Ejercicio } from "../ejercicios/ejercicio";
import type { Serie } from "../series/serie";
import { pedir } from "./http";

export type Historial = { ejercicio: Ejercicio; series: Serie[] };

export function obtenerHistorial(ejercicioId: number): Promise<Historial> {
  return pedir<Historial>(`/ejercicios/${ejercicioId}/series`);
}
