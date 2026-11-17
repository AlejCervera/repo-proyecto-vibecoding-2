import type { Serie } from "../series/serie";

/** Series en el orden en que se registraron. */
const porRegistro = (series: Serie[]) => [...series].sort((a, b) => a.id - b.id);

/** Series de hoy, en el orden en que se hicieron. */
export function seriesDeHoy(series: Serie[], hoy: string): Serie[] {
  return porRegistro(series.filter((s) => s.fecha === hoy));
}

/** La sesión anterior a hoy más reciente: su fecha y sus series en orden. */
export function ultimaSesion(series: Serie[], hoy: string): { fecha: string; series: Serie[] } | null {
  const anteriores = series.filter((s) => s.fecha < hoy);
  if (anteriores.length === 0) return null;
  const fecha = anteriores.reduce((max, s) => (s.fecha > max ? s.fecha : max), anteriores[0].fecha);
  return { fecha, series: porRegistro(anteriores.filter((s) => s.fecha === fecha)) };
}

const iguales = (a: Serie, b: Serie) => a.peso_kg === b.peso_kg && a.repeticiones === b.repeticiones;

/**
 * Valores con los que se rellena la serie siguiente: repetir la última vez, serie a serie (Fase 9f).
 * La serie N de hoy propone la serie N de la última sesión. Si hoy cambiaste la anterior (no es
 * igual que entonces) o ya has hecho más series que entonces, sigue desde la última de hoy.
 */
export function valoresIniciales(series: Serie[], hoy: string): { peso: string; repeticiones: string } {
  const hechas = seriesDeHoy(series, hoy);
  const antes = ultimaSesion(series, hoy)?.series ?? [];
  const k = hechas.length;
  const ultimaHoy = hechas.at(-1);
  const sigueComoEntonces = k === 0 || (antes[k - 1] !== undefined && iguales(ultimaHoy!, antes[k - 1]));
  const valor = (sigueComoEntonces ? antes[k] : undefined) ?? ultimaHoy ?? antes.at(-1);
  if (!valor) return { peso: "", repeticiones: "" };
  return { peso: String(valor.peso_kg).replace(".", ","), repeticiones: String(valor.repeticiones) };
}

/** Cuántas series de hoy lleva cada ejercicio. */
export function contarHoy(series: Serie[], hoy: string): Map<number, number> {
  const cuenta = new Map<number, number>();
  for (const s of series) {
    if (s.fecha === hoy) cuenta.set(s.ejercicio_id, (cuenta.get(s.ejercicio_id) ?? 0) + 1);
  }
  return cuenta;
}
