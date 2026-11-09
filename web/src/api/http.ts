export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly datos: unknown = null,
  ) {
    super(message);
  }
}

export async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
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

export function enviarJson(datos: unknown, method = "POST"): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  };
}
