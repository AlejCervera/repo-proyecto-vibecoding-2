export type ImagenEjercicio =
  | { origen: "wger"; autor: string | null; licencia: string | null }
  | { origen: "propia" };

export type Ejercicio = {
  id: number;
  nombre: string;
  propio: boolean;
  imagen: ImagenEjercicio | null;
};

export type EjercicioPropio = { id: number; nombre: string; num_series: number };

/** Misma regla que la API: sin tildes, en minúsculas y sin espacios sobrantes. */
export function normalizar(nombre: string): string {
  return nombre
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** ¿Hay que ofrecer crear un ejercicio con este texto? Solo si no coincide con ninguno. */
export function ofrecerCrear(texto: string, resultados: Ejercicio[]): boolean {
  const clave = normalizar(texto);
  return clave !== "" && !resultados.some((e) => normalizar(e.nombre) === clave);
}

/** Solo se puede subir imagen propia si el ejercicio no tiene una de ejemplo de wger. */
export function puedeSubirImagen(e: Ejercicio): boolean {
  return e.imagen?.origen !== "wger";
}

export function atribucion(imagen: ImagenEjercicio | null): string | null {
  if (imagen?.origen !== "wger") return null;
  return ["Imagen de ejemplo: wger.de", imagen.autor, imagen.licencia].filter(Boolean).join(" · ");
}
