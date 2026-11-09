import { ApiError, enviarJson, pedir } from "./http";

export type Usuario = { id: number; nombre_usuario: string };

/** Usuario con sesión iniciada, o null si no hay sesión. */
export async function usuarioActual(): Promise<Usuario | null> {
  try {
    return await pedir<Usuario>("/auth/yo");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function iniciarSesion(nombre_usuario: string, password: string): Promise<Usuario> {
  return pedir<Usuario>("/auth/login", enviarJson({ nombre_usuario, password }));
}

export function registrarse(
  nombre_usuario: string,
  password: string,
  codigo_invitacion: string,
): Promise<Usuario> {
  return pedir<Usuario>(
    "/auth/registro",
    enviarJson({ nombre_usuario, password, codigo_invitacion }),
  );
}

export async function cerrarSesion(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
