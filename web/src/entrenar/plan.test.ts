import { expect, test } from "vitest";
import { cambiosPendientes, casillas, guardarAjustes, leerAjustes, puedeQuitar } from "./plan";

test("casillas: siguiente, pendientes y completado", () => {
  expect(casillas(0, 3)).toEqual({ siguiente: 1, pendientes: 2, completado: false });
  expect(casillas(2, 3)).toEqual({ siguiente: 3, pendientes: 0, completado: false });
  expect(casillas(3, 3)).toEqual({ siguiente: null, pendientes: 0, completado: true });
  expect(casillas(5, 3)).toEqual({ siguiente: null, pendientes: 0, completado: true });
});

test("puedeQuitar no baja de 1 ni de las hechas", () => {
  expect(puedeQuitar(0, 3)).toBe(true);
  expect(puedeQuitar(0, 1)).toBe(false);
  expect(puedeQuitar(2, 3)).toBe(true);
  expect(puedeQuitar(3, 3)).toBe(false);
});

test("cambiosPendientes compara lo de hoy con la rutina", () => {
  const e = (id: number, series: number) => ({ id, nombre: `E${id}`, series, reps_min: null, reps_max: null });
  const rutina = { id: 1, nombre: "R", predefinida: false, ejercicios: [e(1, 3), e(2, 3), e(3, 4)] };
  expect(cambiosPendientes(rutina, { 1: 4, 2: 3, 3: 2 })).toEqual([
    { id: 1, nombre: "E1", antes: 3, ahora: 4 },
    { id: 3, nombre: "E3", antes: 4, ahora: 2 },
  ]);
  expect(cambiosPendientes(rutina, {})).toEqual([]);
});

test("los ajustes de hoy se recuerdan por rutina y día", () => {
  guardarAjustes(7, "2026-11-09", { 10: 4 });
  expect(leerAjustes(7, "2026-11-09")).toEqual({ 10: 4 });
  expect(leerAjustes(7, "2026-11-10")).toEqual({});
  expect(leerAjustes(8, "2026-11-09")).toEqual({});
});
