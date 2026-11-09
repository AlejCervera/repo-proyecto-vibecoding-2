import type { Rutina } from "../rutinas/rutina";
import { enviarJson, pedir } from "./http";

export const listarRutinas = () => pedir<Rutina[]>("/rutinas");

export const obtenerRutina = (id: number) => pedir<Rutina>(`/rutinas/${id}`);

export const crearRutina = (nombre: string) => pedir<Rutina>("/rutinas", enviarJson({ nombre }));

export const renombrarRutina = (id: number, nombre: string) =>
  pedir<Rutina>(`/rutinas/${id}`, enviarJson({ nombre }, "PUT"));

export async function borrarRutina(id: number): Promise<void> {
  await pedir(`/rutinas/${id}`, { method: "DELETE" });
}

export const anadirEjercicio = (id: number, ejercicio_id: number) =>
  pedir<Rutina>(`/rutinas/${id}/ejercicios`, enviarJson({ ejercicio_id }));

export const quitarEjercicio = (id: number, ejercicioId: number) =>
  pedir<Rutina>(`/rutinas/${id}/ejercicios/${ejercicioId}`, { method: "DELETE" });

export const reordenarRutina = (id: number, ejercicios: number[]) =>
  pedir<Rutina>(`/rutinas/${id}/orden`, enviarJson({ ejercicios }, "PUT"));

export const copiarRutina = (id: number) =>
  pedir<Rutina>(`/rutinas/${id}/copiar`, { method: "POST" });
