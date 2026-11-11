/** Lógica de los botones − / +: sumar o restar un paso sin errores de coma flotante. */

export type Limites = { paso: number; min: number; max: number };

/** Decimales del paso (2,5 → 1; 0,25 → 2; 1 → 0). */
function decimales(n: number): number {
  const texto = String(n);
  const punto = texto.indexOf(".");
  return punto === -1 ? 0 : texto.length - punto - 1;
}

/**
 * Suma `direccion` pasos (+1 o −1). Si el valor no cae en un múltiplo del paso,
 * primero se ajusta al múltiplo en esa dirección (61 kg con paso 2,5: + → 62,5; − → 60).
 */
export function ajustar(valor: number, direccion: 1 | -1, { paso, min, max }: Limites): number {
  const escala = 10 ** decimales(paso);
  const v = Math.round(valor * escala);
  const p = Math.round(paso * escala);
  const resto = ((v % p) + p) % p;
  let siguiente: number;
  if (resto === 0) siguiente = v + direccion * p;
  else siguiente = direccion === 1 ? v - resto + p : v - resto;
  const resultado = siguiente / escala;
  return Math.min(max, Math.max(min, resultado));
}

/** Número con coma decimal y sin ceros sobrantes: 62.5 → «62,5»; 60 → «60». */
export function formatearNumero(n: number): string {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 2, useGrouping: false });
}
