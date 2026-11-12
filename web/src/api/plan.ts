import { enviarJson, pedir } from "./http";

/** La rutina de un día del plan (o null: descanso). */
export type RutinaPlan = { id: number; nombre: string } | null;
export type CambioDia = { fecha: string; rutina: RutinaPlan };

/** Los 7 días de lunes a domingo. */
export const leerSemana = () => pedir<{ dias: RutinaPlan[] }>("/plan/semana").then((r) => r.dias);

export const guardarSemana = (dias: (number | null)[]) =>
  pedir<{ dias: RutinaPlan[] }>("/plan/semana", enviarJson({ dias }, "PUT")).then((r) => r.dias);

/** Cambios de días concretos entre dos fechas (AAAA-MM-DD, ambas incluidas). */
export const leerCambios = (desde: string, hasta: string) =>
  pedir<{ dias: CambioDia[] }>(`/plan/dias?desde=${desde}&hasta=${hasta}`).then((r) => r.dias);

/** Cambiar solo ese día: otra rutina o null (descanso). */
export const cambiarDia = (fecha: string, rutinaId: number | null) =>
  pedir<CambioDia>(`/plan/dias/${fecha}`, enviarJson({ rutina_id: rutinaId }, "PUT"));

/** Quitar el cambio de ese día: vuelve a lo que diga el plan semanal. */
export const volverAlPlan = (fecha: string) => pedir<void>(`/plan/dias/${fecha}`, { method: "DELETE" });
