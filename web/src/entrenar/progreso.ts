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

/** Valores con los que se rellena el formulario: la última serie registrada (hoy o antes). */
export function valoresIniciales(series: Serie[], hoy: string): { peso: string; repeticiones: string } {
  const hoySeries = seriesDeHoy(series, hoy);
  const ultima = hoySeries.at(-1) ?? ultimaSesion(series, hoy)?.series.at(-1);
  if (!ultima) return { peso: "", repeticiones: "" };
  return { peso: String(ultima.peso_kg).replace(".", ","), repeticiones: String(ultima.repeticiones) };
}

/** Cuántas series de hoy lleva cada ejercicio. */
export function contarHoy(series: Serie[], hoy: string): Map<number, number> {
  const cuenta = new Map<number, number>();
  for (const s of series) {
    if (s.fecha === hoy) cuenta.set(s.ejercicio_id, (cuenta.get(s.ejercicio_id) ?? 0) + 1);
  }
  return cuenta;
}
