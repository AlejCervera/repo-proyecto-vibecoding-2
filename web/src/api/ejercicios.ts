import type { Ejercicio, EjercicioPropio } from "../ejercicios/ejercicio";
import { ApiError, enviarJson, pedir } from "./http";

export function buscarEjercicios(texto: string): Promise<Ejercicio[]> {
  return pedir<Ejercicio[]>(`/ejercicios?q=${encodeURIComponent(texto)}`);
}

export function misEjercicios(): Promise<EjercicioPropio[]> {
  return pedir<EjercicioPropio[]>("/ejercicios/propios");
}

export type ResultadoNombre =
  | { tipo: "ok"; ejercicio: Ejercicio }
  | { tipo: "existe"; mensaje: string; ejercicio: Ejercicio };

async function conDuplicado(peticion: Promise<Ejercicio>): Promise<ResultadoNombre> {
  try {
    return { tipo: "ok", ejercicio: await peticion };
  } catch (e) {
    const datos = e instanceof ApiError ? (e.datos as { ejercicio?: Ejercicio } | null) : null;
    if (e instanceof ApiError && e.status === 409 && datos?.ejercicio) {
      return { tipo: "existe", mensaje: e.message, ejercicio: datos.ejercicio };
    }
    throw e;
  }
}

/** Crea un ejercicio propio; si ya existe uno igual, devuelve el existente. */
export function crearEjercicio(nombre: string): Promise<ResultadoNombre> {
  return conDuplicado(pedir<Ejercicio>("/ejercicios", enviarJson({ nombre })));
}

export function renombrarEjercicio(id: number, nombre: string): Promise<ResultadoNombre> {
  return conDuplicado(pedir<Ejercicio>(`/ejercicios/${id}`, enviarJson({ nombre }, "PUT")));
}

/** Qué hacer con las series al borrar: nada (no tiene), borrarlas o pasarlas a otro ejercicio. */
export type OpcionBorrado = { series: "borrar" } | { mover_a: number } | null;

export async function borrarEjercicio(id: number, opcion: OpcionBorrado = null): Promise<void> {
  const params = opcion ? `?${new URLSearchParams(Object.entries(opcion).map(([k, v]) => [k, String(v)]))}` : "";
  await pedir(`/ejercicios/${id}${params}`, { method: "DELETE" });
}
