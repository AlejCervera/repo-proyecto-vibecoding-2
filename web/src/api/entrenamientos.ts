import type { Serie } from "../series/serie";
import { enviarJson, pedir } from "./http";

/** Una entrada del diario. */
export type EntradaDiario = {
  id: number;
  fecha: string;
  rutina_id: number | null;
  rutina_nombre: string;
  num_ejercicios: number;
  num_series: number;
};

export type Entrenamiento = {
  id: number;
  fecha: string;
  rutina_id: number | null;
  rutina_nombre: string;
  ejercicios: { id: number; nombre: string; series: Serie[] }[];
};

export const listarEntrenamientos = () => pedir<EntradaDiario[]>("/entrenamientos");

export const obtenerEntrenamiento = (id: number) => pedir<Entrenamiento>(`/entrenamientos/${id}`);

export const guardarEntrenamiento = (rutina_id: number, fecha: string) =>
  pedir<Entrenamiento>("/entrenamientos", enviarJson({ rutina_id, fecha }));

/** Lo quita del diario; las series siguen en el historial de cada ejercicio. */
export async function quitarEntrenamiento(id: number): Promise<void> {
  await pedir(`/entrenamientos/${id}`, { method: "DELETE" });
}
