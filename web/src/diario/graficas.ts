/** Cálculos de las gráficas del diario y del historial (Fase 9d). Funciones puras. */
import type { EntradaDiario } from "../api/entrenamientos";
import type { Serie } from "../series/serie";
import { diaSemana, sumarDias } from "./calendario";

export type Punto = { lunes: string; valor: number };

/** Los lunes de las últimas «n» semanas, de la más antigua a la actual. */
export function semanas(hoy: string, n = 12): string[] {
  const lunesActual = sumarDias(hoy, -diaSemana(hoy));
  return Array.from({ length: n }, (_, i) => sumarDias(lunesActual, -7 * (n - 1 - i)));
}

/** Suma por semana (de lunes a domingo); las semanas sin datos quedan a 0. */
function porSemana<T extends { fecha: string }>(datos: T[], hoy: string, n: number, valor: (x: T) => number): Punto[] {
  return semanas(hoy, n).map((lunes) => {
    const domingo = sumarDias(lunes, 6);
    const total = datos.filter((d) => d.fecha >= lunes && d.fecha <= domingo).reduce((s, d) => s + valor(d), 0);
    return { lunes, valor: total };
  });
}

/** Entrenos guardados en el diario por semana. */
export const entrenosPorSemana = (diario: EntradaDiario[], hoy: string, n = 12) => porSemana(diario, hoy, n, () => 1);

/** Volumen (kg × repeticiones) por semana. */
export const volumenPorSemana = (series: Serie[], hoy: string, n = 12) =>
  porSemana(series, hoy, n, (s) => s.peso_kg * s.repeticiones);

/** Media de los valores (0 si no hay). */
export function media(valores: number[]): number {
  return valores.length === 0 ? 0 : valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** 1RM estimado con la fórmula de Epley; con 1 repetición es el propio peso. */
export function unoRM(peso: number, repeticiones: number): number {
  const estimado = repeticiones <= 1 ? peso : peso * (1 + repeticiones / 30);
  return Math.round(estimado * 10) / 10;
}

export type RecordReciente = {
  fecha: string;
  ejercicio_id: number;
  ejercicio: string;
  peso_kg: number;
  repeticiones: number;
  /** Cuánto más que el mejor peso anterior. */
  mejora: number;
};

/**
 * Las últimas veces que se superó el mejor peso de un ejercicio (una por ejercicio y día), de
 * la más reciente a la más antigua. La primera vez con un ejercicio no cuenta.
 */
export function recordsRecientes(series: Serie[], maximo = 5): RecordReciente[] {
  const ordenadas = [...series].sort((a, b) => (a.fecha === b.fecha ? a.id - b.id : a.fecha < b.fecha ? -1 : 1));
  const mejor = new Map<number, number>();
  const records: RecordReciente[] = [];
  const fechas = [...new Set(ordenadas.map((s) => s.fecha))];
  for (const fecha of fechas) {
    const delDia = ordenadas.filter((s) => s.fecha === fecha);
    for (const id of new Set(delDia.map((s) => s.ejercicio_id))) {
      const top = delDia
        .filter((s) => s.ejercicio_id === id)
        .reduce((a, b) => (b.peso_kg > a.peso_kg || (b.peso_kg === a.peso_kg && b.repeticiones > a.repeticiones) ? b : a));
      const antes = mejor.get(id);
      if (antes !== undefined && top.peso_kg > antes) {
        records.push({
          fecha,
          ejercicio_id: id,
          ejercicio: top.ejercicio,
          peso_kg: top.peso_kg,
          repeticiones: top.repeticiones,
          mejora: Math.round((top.peso_kg - antes) * 100) / 100,
        });
      }
      if (antes === undefined || top.peso_kg > antes) mejor.set(id, top.peso_kg);
    }
  }
  return records.reverse().slice(0, maximo);
}

export type Sesion = { fecha: string; pesoMax: number; unoRM: number };

/** Progreso de un ejercicio: por sesión (día), el peso máximo y el mejor 1RM estimado. Las últimas «maximo». */
export function progresoEjercicio(series: Serie[], maximo = 12): Sesion[] {
  const fechas = [...new Set(series.map((s) => s.fecha))].sort();
  return fechas
    .map((fecha) => {
      const delDia = series.filter((s) => s.fecha === fecha);
      return {
        fecha,
        pesoMax: Math.max(...delDia.map((s) => s.peso_kg)),
        unoRM: Math.max(...delDia.map((s) => unoRM(s.peso_kg, s.repeticiones))),
      };
    })
    .slice(-maximo);
}

/** Máximo «redondo» para el eje Y y sus marcas (0, mitad, máximo). */
export function ejeY(maximo: number): number[] {
  if (maximo <= 0) return [0, 1, 2];
  const bruto = maximo / 2;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)!;
  return [0, paso, paso * 2];
}

/** «950», «1250», «12,5 mil» para cifras y ejes. */
export function compacto(n: number): string {
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} mil`;
  return Math.round(n).toLocaleString("es-ES", { useGrouping: false });
}
