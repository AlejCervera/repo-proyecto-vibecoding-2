import type { EntradaDiario } from "../api/entrenamientos";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «2 ejercicios · 6 series» */
export function resumenEntrada(e: EntradaDiario): string {
  return `${plural(e.num_ejercicios, "ejercicio", "ejercicios")} · ${plural(e.num_series, "serie", "series")}`;
}
