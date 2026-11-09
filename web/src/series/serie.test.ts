import { expect, test } from "vitest";
import { aPeticion, formatearSerie, hoyISO } from "./serie";

test("aPeticion convierte los vacíos en null", () => {
  expect(aPeticion({ fecha: "", ejercicio: "Press", peso: " ", repeticiones: "8" })).toEqual({
    fecha: null,
    ejercicio: "Press",
    peso_kg: null,
    repeticiones: "8",
  });
});

test("formatearSerie muestra peso con coma decimal", () => {
  const s = { id: 1, fecha: "2026-11-09", ejercicio: "Press banca", peso_kg: 82.5, repeticiones: 8 };
  expect(formatearSerie(s)).toBe("Press banca · 82,5 kg × 8");
});

test("hoyISO usa la fecha local", () => {
  expect(hoyISO(new Date(2026, 0, 5))).toBe("2026-01-05");
});
