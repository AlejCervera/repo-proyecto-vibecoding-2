export type Ejercicio = { id: number; nombre: string; propio: boolean };

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
