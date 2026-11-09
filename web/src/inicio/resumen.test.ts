import { expect, test } from "vitest";
import type { Serie } from "../series/serie";
import {
  fechaCorta,
  guardarUltimaRutina,
  leerUltimaRutina,
  lunesDe,
  semana,
  ultimoEntrenamiento,
} from "./resumen";

let id = 0;
const s = (fecha: string, ejercicio = "Press"): Serie => ({
  id: ++id,
  fecha,
  ejercicio_id: 1,
  ejercicio,
  peso_kg: 80,
  repeticiones: 8,
});

test("lunesDe: el lunes de la semana (2026-11-09 es lunes)", () => {
  expect(lunesDe("2026-11-09")).toBe("2026-11-09");
  expect(lunesDe("2026-11-12")).toBe("2026-11-09");
  expect(lunesDe("2026-11-15")).toBe("2026-11-09"); // domingo
  expect(lunesDe("2026-11-16")).toBe("2026-11-16");
});

test("semana: días entrenados y series, sin contar otras semanas", () => {
  const series = [
    s("2026-11-09"),
    s("2026-11-09"),
    s("2026-11-11"),
    s("2026-11-15"),
    s("2026-11-08"), // domingo anterior
    s("2026-11-16"), // lunes siguiente
  ];
  expect(semana(series, "2026-11-12")).toEqual({
    dias: [true, false, true, false, false, false, true],
    numDias: 3,
    numSeries: 4,
  });
  expect(semana([], "2026-11-12").numDias).toBe(0);
});

test("ultimoEntrenamiento: el día más reciente, con sus ejercicios sin repetir y en orden", () => {
  const series = [s("2026-11-05", "Sentadilla"), s("2026-11-09", "Press"), s("2026-11-09", "Aperturas"), s("2026-11-09", "Press")];
  expect(ultimoEntrenamiento([...series].reverse())).toEqual({
    fecha: "2026-11-09",
    numSeries: 3,
    ejercicios: ["Press", "Aperturas"],
  });
  expect(ultimoEntrenamiento([])).toBeNull();
});

test("fechaCorta", () => {
  expect(fechaCorta("2026-11-09")).toBe("Lun 09/11");
  expect(fechaCorta("2026-11-15")).toBe("Dom 15/11");
});

test("recuerda la última rutina usada", () => {
  expect(leerUltimaRutina()).toBeNull();
  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  expect(leerUltimaRutina()).toEqual({ id: 3, nombre: "Pecho" });
});
