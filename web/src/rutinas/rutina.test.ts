import { expect, test } from "vitest";
import { mover, resumen, separar, type Rutina } from "./rutina";

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
  ejercicios: Array.from({ length: n }, (_, i) => ({ id: i, nombre: `E${i}` })),
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
