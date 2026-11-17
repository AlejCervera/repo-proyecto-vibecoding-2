/** Qué propone Inicio para hoy (Fase 9c). Lógica pura. */
import type { EntradaDiario } from "../api/entrenamientos";
import { hayPlan, queToca, type Plan } from "../diario/calendario";
import type { Rutina } from "../rutinas/rutina";

export type Hoy =
  /** Ya hay un entreno de hoy en el diario. */
  | { tipo: "hecho"; entrada: EntradaDiario }
  /** Toca esta rutina (según el plan o, sin plan, la última usada). */
  | { tipo: "toca"; rutina: Rutina; segunPlan: boolean }
  /** El plan dice descanso. */
  | { tipo: "descanso" }
  /** Sin plan y sin rutina usada: elegir una. */
  | { tipo: "elegir" };

export function queHacerHoy(
  hoy: string,
  plan: Plan,
  rutinas: Rutina[],
  diario: EntradaDiario[],
  ultimaUsadaId: number | null,
): Hoy {
  const hecho = diario.find((e) => e.fecha === hoy);
  if (hecho) return { tipo: "hecho", entrada: hecho };
  if (hayPlan(plan)) {
    const { rutina } = queToca(hoy, plan);
    if (rutina === null) return { tipo: "descanso" };
    const completa = rutinas.find((r) => r.id === rutina.id);
    if (completa) return { tipo: "toca", rutina: completa, segunPlan: true };
  }
  // Sin plan: la última rutina usada, si sigue existiendo y tiene ejercicios
  const ultima = rutinas.find((r) => r.id === ultimaUsadaId && r.ejercicios.length > 0);
  return ultima ? { tipo: "toca", rutina: ultima, segunPlan: false } : { tipo: "elegir" };
}

/**
 * «Repetir el último» (Fase 9f): el entreno del diario más reciente anterior a hoy cuya rutina
 * sigue existiendo y tiene ejercicios. El diario va del más reciente al más antiguo.
 */
export function ultimoParaRepetir(
  hoy: string,
  diario: EntradaDiario[],
  rutinas: Rutina[],
): { rutina: Rutina; fecha: string } | null {
  for (const e of diario) {
    if (e.fecha >= hoy) continue;
    const rutina = rutinas.find((r) => r.id === e.rutina_id && r.ejercicios.length > 0);
    if (rutina) return { rutina, fecha: e.fecha };
  }
  return null;
}
