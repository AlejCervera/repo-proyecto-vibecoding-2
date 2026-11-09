import { pedir } from "./http";

export function urlImagen(ejercicioId: number, version = 0): string {
  return `/api/ejercicios/${ejercicioId}/imagen${version ? `?v=${version}` : ""}`;
}

export function subirImagen(ejercicioId: number, imagen: Blob): Promise<{ origen: "propia" }> {
  return pedir(`/ejercicios/${ejercicioId}/imagen`, {
    method: "PUT",
    headers: { "Content-Type": imagen.type || "application/octet-stream" },
    body: imagen,
  });
}
