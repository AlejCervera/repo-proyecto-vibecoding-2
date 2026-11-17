/**
 * Memoria de las lecturas de la API (Fase 9e3), para que cambiar de pestaña no espere a la red.
 *
 * - Las lecturas (GET) se guardan por ruta y se devuelven copiadas; las de /auth no se guardan.
 * - Cualquier escritura vacía toda la memoria: nunca se enseña algo anterior a un cambio propio.
 *   Poco después se avisa (alVaciar) para volver a precargar las pantallas principales.
 * - Caduca a los VIGENCIA_MS, y al volver a la app tras un rato en segundo plano.
 */

export const VIGENCIA_MS = 5 * 60_000;
const OLVIDAR_TRAS_SEGUNDO_PLANO_MS = 60_000;
const ESPERA_PRECARGA_MS = 800;

const guardado = new Map<string, { datos: unknown; hora: number }>();
const enCurso = new Map<string, Promise<unknown>>();
/** Sube con cada vaciado: una lectura empezada antes no guarda su respuesta. */
let generacion = 0;
const oyentes = new Set<() => void>();
let aviso: ReturnType<typeof setTimeout> | null = null;

export function sePuedeGuardar(ruta: string, init?: RequestInit): boolean {
  const metodo = (init?.method ?? "GET").toUpperCase();
  return metodo === "GET" && !ruta.startsWith("/auth");
}

/** Lee de la memoria o, si no está (o caducó), con `traer`; varias a la vez comparten petición. */
export async function leerGuardado<T>(ruta: string, traer: () => Promise<T>): Promise<T> {
  const hay = guardado.get(ruta);
  if (hay && Date.now() - hay.hora < VIGENCIA_MS) return structuredClone(hay.datos) as T;

  let promesa = enCurso.get(ruta) as Promise<T> | undefined;
  if (!promesa) {
    const gen = generacion;
    promesa = traer().then(
      (datos) => {
        if (gen === generacion) guardado.set(ruta, { datos, hora: Date.now() });
        enCurso.delete(ruta);
        return datos;
      },
      (e: unknown) => {
        enCurso.delete(ruta);
        throw e;
      },
    );
    enCurso.set(ruta, promesa);
  }
  return structuredClone(await promesa);
}

/** Olvida todo (tras escribir, al entrar o salir de una cuenta). */
export function vaciar(): void {
  generacion++;
  guardado.clear();
  enCurso.clear();
  if (aviso !== null) clearTimeout(aviso);
  aviso = null;
}

/** Tras una escritura: vacía y, poco después (una sola vez aunque haya varias), avisa. */
export function trasEscribir(): void {
  vaciar();
  if (oyentes.size === 0) return;
  aviso = setTimeout(() => {
    aviso = null;
    oyentes.forEach((f) => f());
  }, ESPERA_PRECARGA_MS);
}

/** Registra a quien quiere saber que hay que volver a precargar. Devuelve cómo quitarlo. */
export function alVaciar(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

// Si la app pasa un rato en segundo plano (otro móvil pudo cambiar datos), al volver se olvida todo.
let ocultaDesde: number | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      ocultaDesde = Date.now();
    } else if (ocultaDesde !== null) {
      if (Date.now() - ocultaDesde > OLVIDAR_TRAS_SEGUNDO_PLANO_MS) vaciar();
      ocultaDesde = null;
    }
  });
}
