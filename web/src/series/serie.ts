export type Serie = {
  id: number;
  fecha: string;
  ejercicio: string;
  peso_kg: number;
  repeticiones: number;
};

export type FormularioSerie = {
  fecha: string;
  ejercicio: string;
  peso: string;
  repeticiones: string;
};

/** Convierte lo escrito en el formulario en el cuerpo que espera la API. Vacío → null. */
export function aPeticion(f: FormularioSerie) {
  const numero = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    fecha: f.fecha || null,
    ejercicio: f.ejercicio,
    peso_kg: numero(f.peso),
    repeticiones: numero(f.repeticiones),
  };
}

export function formatearSerie(s: Serie): string {
  const peso = s.peso_kg.toLocaleString("es-ES");
  return `${s.ejercicio} · ${peso} kg × ${s.repeticiones}`;
}

export function hoyISO(ahora: Date = new Date()): string {
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const dd = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mm}-${dd}`;
}
