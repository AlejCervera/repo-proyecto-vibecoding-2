import type { Serie } from "../series/serie";

export class ApiError extends Error {}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${ruta}`, init);
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(cuerpo?.error ?? "No se ha podido conectar con el servidor");
  }
  return cuerpo as T;
}

export function listarSeries(): Promise<Serie[]> {
  return pedir<Serie[]>("/series");
}

export function crearSerie(datos: unknown): Promise<Serie> {
  return pedir<Serie>("/series", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}
