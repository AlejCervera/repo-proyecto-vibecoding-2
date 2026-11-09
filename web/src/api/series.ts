import type { Serie } from "../series/serie";
import { enviarJson, pedir } from "./http";

export function listarSeries(): Promise<Serie[]> {
  return pedir<Serie[]>("/series");
}

export function crearSerie(datos: unknown): Promise<Serie> {
  return pedir<Serie>("/series", enviarJson(datos));
}

export function actualizarSerie(id: number, datos: unknown): Promise<Serie> {
  return pedir<Serie>(`/series/${id}`, enviarJson(datos, "PUT"));
}

export async function borrarSerie(id: number): Promise<void> {
  await pedir(`/series/${id}`, { method: "DELETE" });
}
