import { leerGuardado, sePuedeGuardar, trasEscribir } from "./cache";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly datos: unknown = null,
  ) {
    super(message);
  }
}

async function pedirAlServidor<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${ruta}`, init);
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      cuerpo?.error ?? "No se ha podido conectar con el servidor",
      res.status,
      cuerpo,
    );
  }
  return cuerpo as T;
}

/** Lecturas desde la memoria si se puede (api/cache.ts); las escrituras la vacían. */
export async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  if (sePuedeGuardar(ruta, init)) return leerGuardado(ruta, () => pedirAlServidor<T>(ruta, init));
  try {
    return await pedirAlServidor<T>(ruta, init);
  } finally {
    // Aunque falle, el servidor pudo cambiar algo: mejor volver a leer
    if ((init?.method ?? "GET").toUpperCase() !== "GET") trasEscribir();
  }
}

export function enviarJson(datos: unknown, method = "POST"): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  };
}
