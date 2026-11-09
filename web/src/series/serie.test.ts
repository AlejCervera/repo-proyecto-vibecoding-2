import { expect, test } from "vitest";
import { aPeticion, formatearSerie, hoyISO } from "./serie";

test("aPeticion envía el id del ejercicio y convierte los vacíos en null", () => {
  const ejercicio = { id: 3, nombre: "Press de banca", propio: false };
  expect(aPeticion({ fecha: "", ejercicio, peso: " ", repeticiones: "8" })).toEqual({
    fecha: null,
    ejercicio_id: 3,
    peso_kg: null,
    repeticiones: "8",
  });
  expect(aPeticion({ fecha: "", ejercicio: null, peso: "", repeticiones: "" }).ejercicio_id).toBe(
    null,
  );
});

test("formatearSerie muestra peso con coma decimal", () => {
  const s = {
    id: 1,
    fecha: "2026-11-09",
    ejercicio_id: 3,
    ejercicio: "Press banca",
    peso_kg: 82.5,
    repeticiones: 8,
  };
  expect(formatearSerie(s)).toBe("Press banca · 82,5 kg × 8");
});

test("hoyISO usa la fecha local", () => {
  expect(hoyISO(new Date(2026, 0, 5))).toBe("2026-01-05");
});
