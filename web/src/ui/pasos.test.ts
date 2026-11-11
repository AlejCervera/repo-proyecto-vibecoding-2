import { expect, test } from "vitest";
import { ajustar, formatearNumero } from "./pasos";

const KILOS = { paso: 2.5, min: 0, max: 500 };
const REPS = { paso: 1, min: 1, max: 50 };

test("suma y resta un paso", () => {
  expect(ajustar(60, 1, KILOS)).toBe(62.5);
  expect(ajustar(62.5, -1, KILOS)).toBe(60);
  expect(ajustar(8, 1, REPS)).toBe(9);
});

test("sin errores de coma flotante al encadenar pasos", () => {
  let v = 0;
  for (let i = 0; i < 7; i++) v = ajustar(v, 1, { paso: 0.1, min: 0, max: 10 });
  expect(v).toBe(0.7);
});

test("un valor fuera de la rejilla se ajusta al múltiplo en esa dirección", () => {
  expect(ajustar(61, 1, KILOS)).toBe(62.5);
  expect(ajustar(61, -1, KILOS)).toBe(60);
});

test("respeta el mínimo y el máximo", () => {
  expect(ajustar(0, -1, KILOS)).toBe(0);
  expect(ajustar(1, -1, REPS)).toBe(1);
  expect(ajustar(50, 1, REPS)).toBe(50);
  expect(ajustar(499, 1, KILOS)).toBe(500);
});

test("formatea con coma y sin ceros sobrantes", () => {
  expect(formatearNumero(62.5)).toBe("62,5");
  expect(formatearNumero(60)).toBe("60");
  expect(formatearNumero(1250)).toBe("1250");
  expect(formatearNumero(0.25)).toBe("0,25");
});
