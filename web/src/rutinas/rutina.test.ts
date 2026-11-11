import { expect, test } from "vitest";
import { mover, nombresEjercicios, parsearReps, resumen, separar, textoPlan, textoReps, type Rutina } from "./rutina";

test("mover sube y baja un ejercicio", () => {
  expect(mover([1, 2, 3], 2, -1)).toEqual([1, 3, 2]);
  expect(mover([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
});

test("mover no hace nada en los extremos", () => {
  expect(mover([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  expect(mover([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
});

const r = (id: number, predefinida: boolean, n: number): Rutina => ({
  id,
  nombre: `R${id}`,
  predefinida,
  ejercicios: Array.from({ length: n }, (_, i) => ({
    id: i,
    nombre: `E${i}`,
    series: 3,
    reps_min: null,
    reps_max: null,
  })),
});

test("textoPlan y textoReps", () => {
  expect(textoPlan({ series: 3, reps_min: 8, reps_max: 12 })).toBe("3 × 8-12");
  expect(textoPlan({ series: 4, reps_min: 10, reps_max: 10 })).toBe("4 × 10");
  expect(textoPlan({ series: 3, reps_min: null, reps_max: null })).toBe("3 series");
  expect(textoPlan({ series: 1, reps_min: null, reps_max: null })).toBe("1 serie");
  expect(textoReps({ reps_min: null, reps_max: null })).toBe("");
});

test("parsearReps acepta rango, número o vacío", () => {
  expect(parsearReps("8-12")).toEqual({ reps_min: 8, reps_max: 12 });
  expect(parsearReps(" 8 a 10 ")).toEqual({ reps_min: 8, reps_max: 10 });
  expect(parsearReps("10")).toEqual({ reps_min: 10, reps_max: 10 });
  expect(parsearReps("")).toEqual({ reps_min: null, reps_max: null });
});

test("parsearReps rechaza lo que no entiende", () => {
  expect(() => parsearReps("muchas")).toThrow("«8-12» o «10»");
  expect(() => parsearReps("12-8")).toThrow("mayor que el máximo");
  expect(() => parsearReps("0")).toThrow("entre 1 y 100");
  expect(() => parsearReps("8-101")).toThrow("entre 1 y 100");
});

test("separar predefinidas y mías", () => {
  const { predefinidas, mias } = separar([r(1, true, 1), r(2, false, 0), r(3, true, 2)]);
  expect(predefinidas.map((x) => x.id)).toEqual([1, 3]);
  expect(mias.map((x) => x.id)).toEqual([2]);
});

test("resumen con singular y plural", () => {
  expect(resumen(r(1, false, 1))).toBe("1 ejercicio");
  expect(resumen(r(1, false, 0))).toBe("0 ejercicios");
  expect(resumen(r(1, false, 5))).toBe("5 ejercicios");
});

test("nombres de los ejercicios de una rutina, en texto", () => {
  const r = (...nombres: string[]) => ({ ejercicios: nombres.map((nombre) => ({ nombre })) }) as Rutina;
  expect(nombresEjercicios(r())).toBe("Sin ejercicios todavía");
  expect(nombresEjercicios(r("Sentadilla"))).toBe("Sentadilla");
  expect(nombresEjercicios(r("Press de banca", "Aperturas"))).toBe("Press de banca y Aperturas");
  expect(nombresEjercicios(r("Press de banca", "Aperturas", "Fondos", "Cruces"))).toBe(
    "Press de banca, Aperturas y 2 más",
  );
});
