import type { Serie } from "../series/serie";

export type Dia = { fecha: string; series: Serie[] };

/**
 * Series agrupadas por día: el día más reciente primero y, dentro de cada día, en el orden
 * en que se hicieron (la 1.ª serie arriba), como se lee una sesión.
 */
export function agruparPorDia(series: Serie[]): Dia[] {
  const porFecha = new Map<string, Serie[]>();
  for (const s of series) {
    const lista = porFecha.get(s.fecha) ?? [];
    lista.push(s);
    porFecha.set(s.fecha, lista);
  }
  return [...porFecha.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([fecha, lista]) => ({ fecha, series: [...lista].sort((a, b) => a.id - b.id) }));
}
