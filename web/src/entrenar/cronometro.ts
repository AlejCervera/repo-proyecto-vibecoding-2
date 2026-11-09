/**
 * Cuenta atrás del descanso. Se guarda la hora de fin (no un contador), así el tiempo es
 * correcto aunque la pestaña se congele, se cambie de app o se recargue.
 */
export type Cronometro = {
  duracion: number; // ms
  fin: number | null; // hora de fin (ms) si está en marcha
  restantePausado: number | null; // ms restantes si está en pausa
};

export const DURACIONES = [60_000, 90_000, 120_000, 180_000];
export const DURACION_INICIAL = 90_000;

export function iniciar(duracion: number, ahora: number): Cronometro {
  return { duracion, fin: ahora + duracion, restantePausado: null };
}

export function restante(c: Cronometro, ahora: number): number {
  if (c.restantePausado !== null) return c.restantePausado;
  return Math.max(0, (c.fin ?? ahora) - ahora);
}

export const enPausa = (c: Cronometro) => c.restantePausado !== null;

export function pausar(c: Cronometro, ahora: number): Cronometro {
  if (enPausa(c)) return c;
  return { ...c, fin: null, restantePausado: restante(c, ahora) };
}

export function reanudar(c: Cronometro, ahora: number): Cronometro {
  if (!enPausa(c)) return c;
  return { ...c, fin: ahora + (c.restantePausado ?? 0), restantePausado: null };
}

export const reiniciar = (c: Cronometro, ahora: number) => iniciar(c.duracion, ahora);

/** «1:30», «0:05». Redondea hacia arriba: 0,2 s restantes se ven como «0:01». */
export function formatear(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}

export function etiquetaDuracion(ms: number): string {
  return ms < 120_000 ? `${ms / 1000} s` : `${ms / 60_000} min`;
}

// --- Recordar en el navegador (si no hay almacenamiento, funciona igual sin recordar) -------

const CLAVE_ESTADO = "gymlog-cronometro";
const CLAVE_DURACION = "gymlog-descanso";

export function leerCronometro(): Cronometro | null {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_ESTADO) ?? "null");
  } catch {
    return null;
  }
}

export function guardarCronometro(c: Cronometro | null): void {
  try {
    if (c) sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify(c));
    else sessionStorage.removeItem(CLAVE_ESTADO);
  } catch {
    // sin almacenamiento
  }
}

export function leerDuracion(): number {
  try {
    const guardada = Number(localStorage.getItem(CLAVE_DURACION));
    return DURACIONES.includes(guardada) ? guardada : DURACION_INICIAL;
  } catch {
    return DURACION_INICIAL;
  }
}

export function guardarDuracion(ms: number): void {
  try {
    localStorage.setItem(CLAVE_DURACION, String(ms));
  } catch {
    // sin almacenamiento
  }
}
