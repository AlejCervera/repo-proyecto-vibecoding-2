/** Calculadora de discos (Fase 9g). Lógica pura. */

export const DISCOS_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export type Carga =
  | { tipo: "discos"; porLado: number[]; total: number; exacto: boolean }
  /** El peso es menor que la barra (o igual): no hace falta ningún disco. */
  | { tipo: "sin-discos"; barra: number };

/**
 * Discos que van por lado para llegar a `peso` con una barra de `barra` kg, de mayor a menor.
 * Si no se puede exacto, el más cercano por debajo (y `exacto: false`).
 */
export function discosPorLado(peso: number, barra: number, discos = DISCOS_KG): Carga {
  if (peso <= barra) return { tipo: "sin-discos", barra };
  // En centésimas de kg para no arrastrar errores de coma flotante (1,25 kg)
  let lado = Math.round(((peso - barra) / 2) * 100);
  const porLado: number[] = [];
  for (const d of discos) {
    const c = Math.round(d * 100);
    while (lado >= c) {
      porLado.push(d);
      lado -= c;
    }
  }
  const total = barra + 2 * porLado.reduce((n, d) => n + d, 0);
  return { tipo: "discos", porLado, total: Math.round(total * 100) / 100, exacto: lado === 0 };
}
