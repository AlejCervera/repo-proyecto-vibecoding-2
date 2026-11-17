import { expect, test } from "vitest";
import type { EntradaDiario } from "../api/entrenamientos";
import type { Plan } from "../diario/calendario";
import type { Rutina } from "../rutinas/rutina";
import { queHacerHoy, ultimoParaRepetir } from "./hoy";

const HOY = "2026-11-13"; // viernes (índice 4)
const rutina = (id: number, nombre: string): Rutina => ({
  id,
  nombre,
  predefinida: false,
  ejercicios: [{ id: 1, nombre: "Press de banca", series: 3, reps_min: 8, reps_max: 12 }],
});
const PUSH = rutina(1, "Push");
const PIERNA = rutina(2, "Pierna");
const SIN_PLAN: Plan = { semana: Array(7).fill(null), cambios: [] };
const conViernes = (r: { id: number; nombre: string } | null): Plan => ({
  semana: [PIERNA, null, null, null, r, null, null],
  cambios: [],
});
const entrada = (fecha: string, rutina_id: number): EntradaDiario => ({
  id: 9,
  fecha,
  rutina_id,
  rutina_nombre: "Push",
  num_ejercicios: 1,
  num_series: 3,
});

test("con plan: hoy toca la rutina del plan", () => {
  expect(queHacerHoy(HOY, conViernes(PUSH), [PUSH, PIERNA], [], 2)).toEqual({
    tipo: "toca",
    rutina: PUSH,
    segunPlan: true,
  });
});

test("con plan y hoy descanso: descanso (aunque haya una rutina usada)", () => {
  expect(queHacerHoy(HOY, conViernes(null), [PUSH, PIERNA], [], 1)).toEqual({ tipo: "descanso" });
});

test("el cambio de hoy manda sobre el plan", () => {
  const plan = { ...conViernes(PUSH), cambios: [{ fecha: HOY, rutina: PIERNA }] };
  expect(queHacerHoy(HOY, plan, [PUSH, PIERNA], [], null)).toMatchObject({ rutina: PIERNA });
});

test("si ya se entrenó hoy: hecho", () => {
  expect(queHacerHoy(HOY, conViernes(PUSH), [PUSH], [entrada(HOY, 1)], null)).toMatchObject({
    tipo: "hecho",
  });
});

test("sin plan: la última rutina usada; si no hay, elegir", () => {
  expect(queHacerHoy(HOY, SIN_PLAN, [PUSH, PIERNA], [], 2)).toEqual({
    tipo: "toca",
    rutina: PIERNA,
    segunPlan: false,
  });
  expect(queHacerHoy(HOY, SIN_PLAN, [PUSH], [], 99)).toEqual({ tipo: "elegir" });
  expect(queHacerHoy(HOY, SIN_PLAN, [PUSH], [entrada("2026-11-12", 1)], null)).toEqual({ tipo: "elegir" });
});

// --- Repetir el último (Fase 9f) ---------------------------------------------------------

test("repetir el último: el entreno anterior a hoy más reciente, si su rutina sigue existiendo", () => {
  // el diario va del más reciente al más antiguo
  const diario = [entrada("2026-11-11", 2), entrada("2026-11-09", 1)];
  expect(ultimoParaRepetir(HOY, diario, [PUSH, PIERNA])).toEqual({ rutina: PIERNA, fecha: "2026-11-11" });
});

test("repetir el último: no cuenta el de hoy, ni rutinas borradas o vacías", () => {
  const vacia: Rutina = { ...rutina(3, "Vacía"), ejercicios: [] };
  const diario = [entrada(HOY, 1), entrada("2026-11-12", 9), entrada("2026-11-11", 3), entrada("2026-11-10", 1)];
  expect(ultimoParaRepetir(HOY, diario, [PUSH, vacia])).toEqual({ rutina: PUSH, fecha: "2026-11-10" });
  expect(ultimoParaRepetir(HOY, [], [PUSH])).toBeNull();
});
