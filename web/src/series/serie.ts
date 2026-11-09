import type { Ejercicio } from "../ejercicios/ejercicio";

export type Serie = {
  id: number;
  fecha: string;
  ejercicio_id: number;
  ejercicio: string;
  peso_kg: number;
  repeticiones: number;
};

export type FormularioSerie = {
  fecha: string;
  ejercicio: Ejercicio | null;
  peso: string;
  repeticiones: string;
};

/** Convierte lo escrito en el formulario en el cuerpo que espera la API. Vacío → null. */
export function aPeticion(f: FormularioSerie) {
  const numero = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    fecha: f.fecha || null,
    ejercicio_id: f.ejercicio?.id ?? null,
    peso_kg: numero(f.peso),
    repeticiones: numero(f.repeticiones),
  };
}

/** «82,5 kg × 8» */
export function pesoPorReps(s: Pick<Serie, "peso_kg" | "repeticiones">): string {
  return `${s.peso_kg.toLocaleString("es-ES")} kg × ${s.repeticiones}`;
}

export function formatearSerie(s: Serie): string {
  return `${s.ejercicio} · ${pesoPorReps(s)}`;
}

/** «2026-11-09» → «09/11/2026» */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function hoyISO(ahora: Date = new Date()): string {
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const dd = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mm}-${dd}`;
}
