import { expect, test } from "vitest";
import { resumenPlan } from "./pasos";

const RUTINAS = [
  { id: 1, nombre: "Pecho" },
  { id: 2, nombre: "Pierna" },
];

test("resumenPlan: un renglón por día con rutina, en orden de la semana", () => {
  expect(resumenPlan([1, null, 2, null, 1, null, null], RUTINAS)).toEqual([
    "Lunes · Pecho",
    "Miércoles · Pierna",
    "Viernes · Pecho",
  ]);
});

test("resumenPlan: toda la semana de descanso (o rutinas que ya no existen), vacío", () => {
  expect(resumenPlan(Array(7).fill(null), RUTINAS)).toEqual([]);
  expect(resumenPlan([9, null, null, null, null, null, null], RUTINAS)).toEqual([]);
});
