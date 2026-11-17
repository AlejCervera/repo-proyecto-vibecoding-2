/** Microanimaciones (Fase 9e): utilidades sin interfaz, para poder probarlas. */

/** true solo si el sistema no pide «Reducir movimiento» (y el navegador sabe decirlo). */
export function hayMovimiento(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Curva de salida suave: rápido al principio, frena al final. */
export function salidaSuave(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** Valor de una cuenta de 0 a `final` tras `transcurrido` ms de `duracion` ms. */
export function valorEn(final: number, transcurrido: number, duracion: number): number {
  if (duracion <= 0 || transcurrido >= duracion) return final;
  return final * salidaSuave(transcurrido / duracion);
}

/** Pequeño salto de un elemento (p. ej. el número al pulsar − / +), si hay movimiento. */
export function saltito(el: Element | null): void {
  if (!el || !hayMovimiento() || typeof el.animate !== "function") return;
  el.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], {
    duration: 120,
    easing: "ease-out",
  });
}
