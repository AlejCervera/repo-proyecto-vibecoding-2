/**
 * Cuenta atrás del descanso. Se guarda la hora de fin (no un contador), así el tiempo es
 * correcto aunque la pestaña se congele, se cambie de app o se recargue.
 */
export type Cronometro = {
  duracion: number; // ms
  fin: number | null; // hora de fin (ms) si está en marcha
  restantePausado: number | null; // ms restantes si está en pausa
};

/** El descanso se ajusta de 15 s en 15 s, entre 15 s y 10 min. */
export const PASO_DESCANSO = 15_000;
export const MIN_DESCANSO = 15_000;
export const MAX_DESCANSO = 600_000;
export const DURACION_INICIAL = 90_000;

const enRango = (ms: number) => Math.min(MAX_DESCANSO, Math.max(MIN_DESCANSO, ms));

/** Duración ± un paso (15 s), dentro del rango. */
export const ajustarDuracion = (ms: number, direccion: 1 | -1) => enRango(ms + direccion * PASO_DESCANSO);

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

/**
 * −15 s / +15 s sobre el descanso que está corriendo (o en pausa). El total crece o
 * mengua con él, para que el anillo siga siendo proporcional; nunca baja de 0.
 */
export function sumarTiempo(c: Cronometro, ms: number, ahora: number): Cronometro {
  const queda = Math.max(0, restante(c, ahora) + ms);
  const duracion = Math.max(queda, c.duracion + ms);
  if (enPausa(c)) return { ...c, duracion, restantePausado: queda };
  return { ...c, duracion, fin: ahora + queda };
}

/** Parte del descanso que queda, de 1 (recién empezado) a 0 (terminado). Para el anillo. */
export function fraccion(c: Cronometro, ahora: number): number {
  if (c.duracion <= 0) return 0;
  return Math.min(1, Math.max(0, restante(c, ahora) / c.duracion));
}

/** «1:30», «0:05». Redondea hacia arriba: 0,2 s restantes se ven como «0:01». */
export function formatear(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}

// --- Recordar en el navegador (si no hay almacenamiento, funciona igual sin recordar) -------

const CLAVE_ESTADO = "gymlog-cronometro";
/** Último descanso elegido: lo usan los ejercicios que aún no tienen uno propio. */
const CLAVE_DURACION = "gymlog-descanso";
const claveEjercicio = (ejercicioId: number) => `gymlog-descanso-${ejercicioId}`;

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

function leerMs(clave: string): number | null {
  try {
    const n = Number(localStorage.getItem(clave));
    return n >= MIN_DESCANSO && n <= MAX_DESCANSO ? n : null;
  } catch {
    return null;
  }
}

/** Descanso de un ejercicio: el suyo, si no el último elegido y, si no, 1:30. */
export function leerDuracion(ejercicioId?: number): number {
  const propio = ejercicioId === undefined ? null : leerMs(claveEjercicio(ejercicioId));
  return propio ?? leerMs(CLAVE_DURACION) ?? DURACION_INICIAL;
}

/** Guarda el descanso de un ejercicio (y lo deja como el último elegido). */
export function guardarDuracion(ms: number, ejercicioId?: number): void {
  try {
    const valor = String(enRango(ms));
    localStorage.setItem(CLAVE_DURACION, valor);
    if (ejercicioId !== undefined) localStorage.setItem(claveEjercicio(ejercicioId), valor);
  } catch {
    // sin almacenamiento
  }
}
