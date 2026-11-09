import type { Serie } from "../series/serie";
import { enviarJson, pedir } from "./http";

export function listarSeries(): Promise<Serie[]> {
  return pedir<Serie[]>("/series");
}

export function crearSerie(datos: unknown): Promise<Serie> {
  return pedir<Serie>("/series", enviarJson(datos));
}
