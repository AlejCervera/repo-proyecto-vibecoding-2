/** Bienvenida (Fase 9f): lógica pura de los pasos. */
import { DIAS_SEMANA } from "../diario/SelectorSemana";
import type { Rutina } from "../rutinas/rutina";

export const PASOS = 3;

/** «Lunes · Pecho» por cada día con rutina (los de descanso no salen). */
export function resumenPlan(dias: (number | null)[], rutinas: Pick<Rutina, "id" | "nombre">[]): string[] {
  return dias.flatMap((id, i) => {
    const rutina = id === null ? undefined : rutinas.find((r) => r.id === id);
    return rutina ? [`${DIAS_SEMANA[i]} · ${rutina.nombre}`] : [];
  });
}
