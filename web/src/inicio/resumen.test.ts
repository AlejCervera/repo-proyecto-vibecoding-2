import { expect, test } from "vitest";
import type { Serie } from "../series/serie";
import {
  diasEntre,
  fechaCorta,
  fechaLarga,
  haceDias,
  guardarUltimaRutina,
  leerUltimaRutina,
  lunesDe,
  semana,
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

test("fechaCorta", () => {
  expect(fechaCorta("2026-11-09")).toBe("Lun 09/11");
  expect(fechaCorta("2026-11-15")).toBe("Dom 15/11");
});

test("recuerda la última rutina usada", () => {
  expect(leerUltimaRutina()).toBeNull();
  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  expect(leerUltimaRutina()).toEqual({ id: 3, nombre: "Pecho" });
});

test("fecha larga en español", () => {
  expect(fechaLarga("2026-11-11")).toBe("Miércoles, 11 de noviembre");
  expect(fechaLarga("2027-01-03")).toBe("Domingo, 3 de enero");
});

test("días entre dos fechas, también al cambiar de mes, de año y de hora", () => {
  expect(diasEntre("2026-11-08", "2026-11-11")).toBe(3);
  expect(diasEntre("2026-12-30", "2027-01-02")).toBe(3);
  expect(diasEntre("2026-10-24", "2026-10-26")).toBe(2); // cambio de hora en España el 25/10
});

test("«hoy», «ayer» y «hace N días»", () => {
  expect(haceDias("2026-11-11", "2026-11-11")).toBe("hoy");
  expect(haceDias("2026-11-10", "2026-11-11")).toBe("ayer");
  expect(haceDias("2026-11-04", "2026-11-11")).toBe("hace 7 días");
});
