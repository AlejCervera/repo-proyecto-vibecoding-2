import { expect, test } from "vitest";
import type { EntradaDiario } from "../api/entrenamientos";
import type { Serie } from "../series/serie";
import {
  compacto,
  ejeY,
  entrenosPorSemana,
  media,
  progresoEjercicio,
  recordsRecientes,
  semanas,
  unoRM,
  volumenPorSemana,
} from "./graficas";

let id = 0;
const s = (fecha: string, ejercicio_id: number, peso_kg: number, repeticiones: number): Serie => ({
  id: ++id,
  fecha,
  ejercicio_id,
  ejercicio: ejercicio_id === 1 ? "Press banca" : "Sentadilla",
  peso_kg,
  repeticiones,
});
const e = (fecha: string): EntradaDiario => ({
  id: ++id,
  fecha,
  rutina_id: 1,
  rutina_nombre: "Push",
  num_ejercicios: 1,
  num_series: 3,
});

test("las últimas 12 semanas, de lunes, terminando en la actual (también al cambiar de año)", () => {
  const lunes = semanas("2027-01-06", 12); // miércoles
  expect(lunes).toHaveLength(12);
  expect(lunes.at(-1)).toBe("2027-01-04");
  expect(lunes.at(-2)).toBe("2026-12-28");
  expect(lunes[0]).toBe("2026-10-19");
});

test("entrenos por semana, con las semanas vacías a 0", () => {
  const hoy = "2026-11-13"; // viernes; semana del lunes 9
  const puntos = entrenosPorSemana([e("2026-11-09"), e("2026-11-12"), e("2026-11-03"), e("2026-08-01")], hoy, 4);
  expect(puntos).toEqual([
    { lunes: "2026-10-19", valor: 0 },
    { lunes: "2026-10-26", valor: 0 },
    { lunes: "2026-11-02", valor: 1 },
    { lunes: "2026-11-09", valor: 2 },
  ]);
});

test("volumen por semana: kilos × repeticiones", () => {
  const puntos = volumenPorSemana([s("2026-11-09", 1, 60, 10), s("2026-11-15", 1, 62.5, 8), s("2026-11-08", 1, 50, 10)], "2026-11-13", 2);
  expect(puntos).toEqual([
    { lunes: "2026-11-02", valor: 500 },
    { lunes: "2026-11-09", valor: 1100 },
  ]);
});

test("media", () => {
  expect(media([1, 2, 3, 4])).toBe(2.5);
  expect(media([])).toBe(0);
});

test("1RM estimado (Epley); con 1 repetición es el propio peso", () => {
  expect(unoRM(100, 1)).toBe(100);
  expect(unoRM(100, 10)).toBe(133.3);
  expect(unoRM(60, 8)).toBe(76);
});

test("récords recientes: cuándo se superó el mejor peso y por cuánto", () => {
  const series = [
    s("2026-11-01", 1, 60, 8), // primera vez: no es récord
    s("2026-11-04", 1, 62.5, 6), // récord +2,5
    s("2026-11-04", 2, 100, 5), // primera vez
    s("2026-11-08", 1, 62.5, 8), // igual peso: no es récord
    s("2026-11-11", 2, 105, 3), // récord +5
    s("2026-11-11", 2, 102.5, 5),
  ];
  expect(recordsRecientes(series)).toEqual([
    { fecha: "2026-11-11", ejercicio_id: 2, ejercicio: "Sentadilla", peso_kg: 105, repeticiones: 3, mejora: 5 },
    { fecha: "2026-11-04", ejercicio_id: 1, ejercicio: "Press banca", peso_kg: 62.5, repeticiones: 6, mejora: 2.5 },
  ]);
  expect(recordsRecientes(series, 1)).toHaveLength(1);
  expect(recordsRecientes([s("2026-11-01", 1, 60, 8)])).toEqual([]);
});

test("progreso de un ejercicio por sesión: peso máximo y mejor 1RM; solo las últimas", () => {
  const series = [s("2026-11-04", 1, 60, 10), s("2026-11-04", 1, 62.5, 5), s("2026-11-01", 1, 60, 8)];
  expect(progresoEjercicio(series)).toEqual([
    { fecha: "2026-11-01", pesoMax: 60, unoRM: 76 },
    { fecha: "2026-11-04", pesoMax: 62.5, unoRM: 80 }, // 60×10 da más 1RM que 62,5×5
  ]);
  expect(progresoEjercicio(series, 1).map((x) => x.fecha)).toEqual(["2026-11-04"]);
  expect(progresoEjercicio([])).toEqual([]);
});

test("eje Y con valores redondos", () => {
  expect(ejeY(3)).toEqual([0, 2, 4]);
  expect(ejeY(1100)).toEqual([0, 1000, 2000]);
  expect(ejeY(4)).toEqual([0, 2, 4]);
  expect(ejeY(0)).toEqual([0, 1, 2]);
});

test("cifras compactas", () => {
  expect(compacto(950)).toBe("950");
  expect(compacto(1250.4)).toBe("1250");
  expect(compacto(12500)).toBe("12,5 mil");
});
