import type { Serie } from "../series/serie";
import { hoyISO } from "../series/serie";

export const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const aFecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};

/** Lunes de la semana de «iso», en formato AAAA-MM-DD. */
export function lunesDe(iso: string): string {
  const f = aFecha(iso);
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7));
  return hoyISO(f);
}

/** Días entrenados (L..D) y total de series de la semana de «hoy». */
export function semana(series: Serie[], hoy: string) {
  const lunes = lunesDe(hoy);
  const fechas = DIAS.map((_, i) => {
    const f = aFecha(lunes);
    f.setDate(f.getDate() + i);
    return hoyISO(f);
  });
  const deLaSemana = series.filter((s) => fechas.includes(s.fecha));
  const entrenados = fechas.map((f) => deLaSemana.some((s) => s.fecha === f));
  return {
    dias: entrenados,
    numDias: entrenados.filter(Boolean).length,
    numSeries: deLaSemana.length,
  };
}

const NOMBRES_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** «Lun 09/11» */
export function fechaCorta(iso: string): string {
  const f = aFecha(iso);
  const [, m, d] = iso.split("-");
  return `${NOMBRES_DIA[f.getDay()]} ${d}/${m}`;
}

// --- Última rutina usada (se recuerda en este móvil) ---------------------------------------

export type RutinaUsada = { id: number; nombre: string };
const CLAVE = "gymlog-ultima-rutina";

export function leerUltimaRutina(): RutinaUsada | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "null");
  } catch {
    return null;
  }
}

export function guardarUltimaRutina(r: RutinaUsada): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ id: r.id, nombre: r.nombre }));
  } catch {
    // sin almacenamiento
  }
}
