import type { Ejercicio } from "../ejercicios/ejercicio";
import { ApiError, enviarJson, pedir } from "./http";

export function buscarEjercicios(texto: string): Promise<Ejercicio[]> {
  return pedir<Ejercicio[]>(`/ejercicios?q=${encodeURIComponent(texto)}`);
}

export type ResultadoCrear =
  | { tipo: "creado"; ejercicio: Ejercicio }
  | { tipo: "existe"; mensaje: string; ejercicio: Ejercicio };

/** Crea un ejercicio propio; si ya existe uno igual, devuelve el existente. */
export async function crearEjercicio(nombre: string): Promise<ResultadoCrear> {
  try {
    return { tipo: "creado", ejercicio: await pedir<Ejercicio>("/ejercicios", enviarJson({ nombre })) };
  } catch (e) {
    const datos = e instanceof ApiError ? (e.datos as { ejercicio?: Ejercicio } | null) : null;
    if (e instanceof ApiError && e.status === 409 && datos?.ejercicio) {
      return { tipo: "existe", mensaje: e.message, ejercicio: datos.ejercicio };
    }
    throw e;
  }
}
