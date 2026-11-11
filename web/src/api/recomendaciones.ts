import { pedir } from "./http";

export type SugerenciaAnadir = {
  ejercicio_id: number;
  nombre: string;
  series: number;
  reps_min: number;
  reps_max: number;
  motivo: string;
};

export type SugerenciaSustituir = {
  quitar_id: number;
  quitar_nombre: string;
  poner_id: number;
  poner_nombre: string;
  motivo: string;
};

export type SugerenciaObjetivo = {
  ejercicio_id: number;
  nombre: string;
  peso_kg: number | null;
  reps_min: number;
  reps_max: number;
  motivo: string;
};

export type Recomendaciones = {
  resumen: string;
  anadir: SugerenciaAnadir[];
  sustituir: SugerenciaSustituir[];
  objetivos: SugerenciaObjetivo[];
};

export const pedirRecomendaciones = (rutinaId: number) =>
  pedir<Recomendaciones>(`/rutinas/${rutinaId}/recomendaciones`, { method: "POST" });
