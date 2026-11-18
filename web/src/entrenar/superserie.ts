/** Superseries al entrenar (Fase 9g). Lógica pura. */

type Ej = { con_siguiente?: boolean };

/** Índice del otro ejercicio de la superserie de `i`, o null si no va en superserie. */
export function pareja(ejercicios: Ej[], i: number): number | null {
  if (ejercicios[i]?.con_siguiente && i + 1 < ejercicios.length) return i + 1;
  if (i > 0 && ejercicios[i - 1]?.con_siguiente) return i - 1;
  return null;
}

/**
 * Qué hacer tras guardar una serie del ejercicio `i`, sabiendo cuántas series le quedan a cada uno
 * (ya contada la recién guardada). En una superserie A + B: tras A se pasa a B sin descanso; tras B
 * empieza el descanso y se vuelve a A. Si al otro ya no le quedan series, se descansa y se sigue aquí.
 */
export function trasGuardar(
  ejercicios: Ej[],
  i: number,
  quedan: (indice: number) => number,
): { ir: number | null; descanso: boolean } {
  const otro = pareja(ejercicios, i);
  if (otro === null) return { ir: null, descanso: true };
  const esPrimero = otro > i;
  if (esPrimero && quedan(otro) > 0) return { ir: otro, descanso: false };
  if (!esPrimero && quedan(otro) > 0) return { ir: otro, descanso: true };
  return { ir: null, descanso: true };
}
