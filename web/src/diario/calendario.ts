/** Lógica del plan semanal y del calendario del diario (Fase 9c). Funciones puras. */
import type { EntradaDiario } from "../api/entrenamientos";
import type { CambioDia, RutinaPlan } from "../api/plan";
import { hoyISO } from "../series/serie";

const aFecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};

/** Día de la semana empezando en lunes: 0 = lunes … 6 = domingo. */
export const diaSemana = (iso: string) => (aFecha(iso).getDay() + 6) % 7;

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(iso: string, n: number): string {
  const f = aFecha(iso);
  f.setDate(f.getDate() + n);
  return hoyISO(f);
}

/** Primer y último día del mes (mes de 0 a 11). */
export function limitesMes(anio: number, mes: number): { desde: string; hasta: string } {
  return { desde: hoyISO(new Date(anio, mes, 1)), hasta: hoyISO(new Date(anio, mes + 1, 0)) };
}

/** Cuadrícula del mes en semanas de lunes a domingo; null en los huecos de antes y después. */
export function cuadriculaMes(anio: number, mes: number): (string | null)[] {
  const { desde, hasta } = limitesMes(anio, mes);
  const dias: (string | null)[] = Array(diaSemana(desde)).fill(null);
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push(f);
  while (dias.length % 7 !== 0) dias.push(null);
  return dias;
}

export type Plan = { semana: RutinaPlan[]; cambios: CambioDia[] };

/** Qué toca un día: el cambio de ese día si lo hay; si no, el plan semanal (null = descanso). */
export function queToca(fecha: string, plan: Plan): { rutina: RutinaPlan; cambiado: boolean } {
  const cambio = plan.cambios.find((c) => c.fecha === fecha);
  if (cambio) return { rutina: cambio.rutina, cambiado: true };
  return { rutina: plan.semana[diaSemana(fecha)] ?? null, cambiado: false };
}

/** ¿Hay algo planificado algún día (plan semanal o cambios)? */
export const hayPlan = (plan: Plan) =>
  plan.semana.some((d) => d !== null) || plan.cambios.some((c) => c.rutina !== null);

export type Estado =
  | "hecho" // se hizo la rutina que tocaba
  | "otra" // se entrenó otra cosa (o se entrenó un día de descanso)
  | "no-hecho" // tocaba entrenar, ya pasó y no hay nada en el diario
  | "pendiente" // hoy toca y aún no está hecho
  | "descanso"
  | "futuro"; // un día que aún no ha llegado, con rutina

/** Estado de un día comparando lo planeado con lo que hay en el diario. */
export function estadoDia(fecha: string, hoy: string, plan: Plan, diario: EntradaDiario[]): Estado {
  const { rutina } = queToca(fecha, plan);
  const delDia = diario.filter((e) => e.fecha === fecha);
  if (delDia.length > 0) {
    return rutina && delDia.some((e) => e.rutina_id === rutina.id) ? "hecho" : "otra";
  }
  if (rutina === null) return "descanso";
  if (fecha < hoy) return "no-hecho";
  return fecha === hoy ? "pendiente" : "futuro";
}

export const TEXTO_ESTADO: Record<Estado, string> = {
  hecho: "hecho",
  otra: "entrenaste otra cosa",
  "no-hecho": "no hecho",
  pendiente: "pendiente",
  descanso: "descanso",
  futuro: "planificado",
};

/** De lunes a domingo de la semana de «hoy»: cuántos días tocaba entrenar y en cuántos se entrenó. */
export function cumplimientoSemana(hoy: string, plan: Plan, diario: EntradaDiario[]) {
  const lunes = sumarDias(hoy, -diaSemana(hoy));
  let planificados = 0;
  let hechos = 0;
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(lunes, i);
    if (queToca(fecha, plan).rutina === null) continue;
    planificados++;
    const estado = estadoDia(fecha, hoy, plan, diario);
    if (estado === "hecho" || estado === "otra") hechos++;
  }
  return { planificados, hechos };
}

/**
 * Racha: días entrenados seguidos sin saltarse un entreno planificado. Los descansos no la
 * rompen, y hoy tampoco mientras esté pendiente. Se mira como mucho «maxDias» hacia atrás.
 */
export function racha(hoy: string, plan: Plan, diario: EntradaDiario[], maxDias = 56): number {
  let n = 0;
  for (let i = 0; i < maxDias; i++) {
    const estado = estadoDia(sumarDias(hoy, -i), hoy, plan, diario);
    if (estado === "no-hecho") break;
    if (estado === "hecho" || estado === "otra") n++;
  }
  return n;
}
