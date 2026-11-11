/** "" → null; si no, el número escrito (admite coma decimal). */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  if (!Number.isFinite(n)) throw new Error("Escribe un número");
  return n;
}
