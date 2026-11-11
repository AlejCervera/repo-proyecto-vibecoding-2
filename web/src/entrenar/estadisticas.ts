/** Cálculos del entreno en modo foco y de su resumen final. Lógica pura, sin interfaz. */
import type { Serie } from "../series/serie";
import { formatearNumero } from "../ui/pasos";

export const PASO_KG = 2.5;

/** Volumen: suma de kilos × repeticiones. */
export function volumen(series: Pick<Serie, "peso_kg" | "repeticiones">[]): number {
  return series.reduce((total, s) => total + s.peso_kg * s.repeticiones, 0);
}

/** La serie con más peso; a igual peso, la de más repeticiones. */
export function mejorSerie<T extends Pick<Serie, "peso_kg" | "repeticiones">>(series: T[]): T | null {
  let mejor: T | null = null;
  for (const s of series) {
    if (
      !mejor ||
      s.peso_kg > mejor.peso_kg ||
      (s.peso_kg === mejor.peso_kg && s.repeticiones > mejor.repeticiones)
    ) {
      mejor = s;
    }
  }
  return mejor;
}

export type RecordHoy = {
  ejercicio_id: number;
  ejercicio: string;
  peso_kg: number;
  repeticiones: number;
  /** Mejor peso antes de hoy. */
  anterior: number;
};

/**
 * Récords de hoy: ejercicios en los que hoy se ha levantado más peso que cualquier día anterior.
 * La primera vez con un ejercicio no cuenta como récord (no hay con qué comparar).
 */
export function recordsDeHoy(series: Serie[], hoy: string): RecordHoy[] {
  const records: RecordHoy[] = [];
  const ids = [...new Set(series.filter((s) => s.fecha === hoy).map((s) => s.ejercicio_id))];
  for (const id of ids) {
    const delEjercicio = series.filter((s) => s.ejercicio_id === id);
    const antes = mejorSerie(delEjercicio.filter((s) => s.fecha < hoy));
    const deHoy = mejorSerie(delEjercicio.filter((s) => s.fecha === hoy));
    if (antes && deHoy && deHoy.peso_kg > antes.peso_kg) {
      records.push({
        ejercicio_id: id,
        ejercicio: deHoy.ejercicio,
        peso_kg: deHoy.peso_kg,
        repeticiones: deHoy.repeticiones,
        anterior: antes.peso_kg,
      });
    }
  }
  return records;
}

/**
 * Volumen de hoy frente al de la vez anterior con los mismos ejercicios
 * (para cada ejercicio, su última sesión antes de hoy). null si no hay vez anterior.
 */
export function comparacionVolumen(
  series: Serie[],
  ejercicioIds: number[],
  hoy: string,
): { hoy: number; anterior: number; diferencia: number } | null {
  const hoySeries = series.filter((s) => s.fecha === hoy && ejercicioIds.includes(s.ejercicio_id));
  let anterior = 0;
  let hayAnterior = false;
  for (const id of ejercicioIds) {
    const previas = series.filter((s) => s.ejercicio_id === id && s.fecha < hoy);
    if (previas.length === 0) continue;
    const fecha = previas.reduce((max, s) => (s.fecha > max ? s.fecha : max), previas[0].fecha);
    anterior += volumen(previas.filter((s) => s.fecha === fecha));
    hayAnterior = true;
  }
  if (!hayAnterior) return null;
  const v = volumen(hoySeries);
  return { hoy: v, anterior, diferencia: v - anterior };
}

/** «47 min», «1 h 05 min». Menos de un minuto: «1 min». */
export function formatearDuracion(ms: number): string {
  const minutos = Math.max(1, Math.round(ms / 60_000));
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** «1250 kg», «+120 kg», «−40 kg». */
export function formatearKilos(kg: number, conSigno = false): string {
  const signo = conSigno ? (kg > 0 ? "+" : kg < 0 ? "−" : "") : "";
  return `${signo}${formatearNumero(conSigno ? Math.abs(kg) : kg)} kg`;
}

/**
 * Pista de progresión (doble progresión): si llegas al máximo del objetivo de repeticiones,
 * la próxima vez toca subir 2,5 kg. Sin objetivo o sin peso, no hay pista.
 */
export function pistaProgresion(peso: number | null, repsMax: number | null): string | null {
  if (repsMax === null || peso === null || !(peso > 0)) return null;
  return `Si completas todas a ${repsMax} repeticiones, la próxima vez ${formatearNumero(peso + PASO_KG)} kg.`;
}

/** Hora de inicio del entreno de hoy con esta rutina: se guarda la primera vez que se abre. */
const claveInicio = (rutinaId: number, hoy: string) => `gymlog-inicio-${rutinaId}-${hoy}`;

export function marcarInicio(rutinaId: number, hoy: string, ahora: number): number {
  try {
    const guardado = Number(localStorage.getItem(claveInicio(rutinaId, hoy)));
    if (guardado > 0) return guardado;
    localStorage.setItem(claveInicio(rutinaId, hoy), String(ahora));
  } catch {
    // sin almacenamiento: la duración cuenta desde que se abrió esta pantalla
  }
  return ahora;
}
