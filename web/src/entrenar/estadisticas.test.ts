import { expect, test } from "vitest";
import type { Serie } from "../series/serie";
import {
  comparacionVolumen,
  formatearDuracion,
  formatearKilos,
  marcarInicio,
  mejorSerie,
  pistaProgresion,
  recordsDeHoy,
  volumen,
} from "./estadisticas";

const HOY = "2026-11-11";
let id = 0;
const s = (fecha: string, ejercicio_id: number, peso_kg: number, repeticiones: number): Serie => ({
  id: ++id,
  fecha,
  ejercicio_id,
  ejercicio: ejercicio_id === 1 ? "Press banca" : "Remo",
  peso_kg,
  repeticiones,
});

test("volumen: kilos × repeticiones", () => {
  expect(volumen([s(HOY, 1, 60, 10), s(HOY, 1, 62.5, 8)])).toBe(1100);
  expect(volumen([])).toBe(0);
});

test("mejor serie: más peso y, a igual peso, más repeticiones", () => {
  expect(mejorSerie([s(HOY, 1, 60, 10), s(HOY, 1, 65, 5), s(HOY, 1, 65, 6)])).toMatchObject({
    peso_kg: 65,
    repeticiones: 6,
  });
  expect(mejorSerie([])).toBeNull();
});

test("récords: más peso que cualquier día anterior", () => {
  const series = [
    s("2026-11-01", 1, 60, 8),
    s("2026-11-04", 1, 62.5, 6),
    s(HOY, 1, 65, 5),
    s("2026-11-04", 2, 50, 10),
    s(HOY, 2, 50, 12), // mismo peso: no es récord
  ];
  expect(recordsDeHoy(series, HOY)).toEqual([
    { ejercicio_id: 1, ejercicio: "Press banca", peso_kg: 65, repeticiones: 5, anterior: 62.5 },
  ]);
});

test("récords: la primera vez con un ejercicio no cuenta", () => {
  expect(recordsDeHoy([s(HOY, 1, 100, 1)], HOY)).toEqual([]);
});

test("comparación: hoy frente a la última sesión de cada ejercicio", () => {
  const series = [
    s("2026-10-20", 1, 50, 10), // sesión más antigua: no cuenta
    s("2026-11-04", 1, 60, 10),
    s("2026-11-06", 2, 40, 10),
    s(HOY, 1, 62.5, 10),
    s(HOY, 2, 40, 12),
    s(HOY, 3, 100, 10), // no es de la rutina
  ];
  expect(comparacionVolumen(series, [1, 2], HOY)).toEqual({ hoy: 1105, anterior: 1000, diferencia: 105 });
});

test("comparación: sin vez anterior no hay comparación", () => {
  expect(comparacionVolumen([s(HOY, 1, 60, 10)], [1], HOY)).toBeNull();
});

test("duración legible", () => {
  expect(formatearDuracion(10_000)).toBe("1 min");
  expect(formatearDuracion(47 * 60_000)).toBe("47 min");
  expect(formatearDuracion(65 * 60_000)).toBe("1 h 05 min");
});

test("kilos con y sin signo", () => {
  expect(formatearKilos(1102.5)).toBe("1102,5 kg");
  expect(formatearKilos(120, true)).toBe("+120 kg");
  expect(formatearKilos(-40, true)).toBe("−40 kg");
  expect(formatearKilos(0, true)).toBe("0 kg");
});

test("pista de progresión: subir 2,5 kg al llegar al máximo del objetivo", () => {
  expect(pistaProgresion(62.5, 10)).toBe("Si completas todas a 10 repeticiones, la próxima vez 65 kg.");
  expect(pistaProgresion(62.5, null)).toBeNull();
  expect(pistaProgresion(null, 10)).toBeNull();
  expect(pistaProgresion(0, 10)).toBeNull();
});

test("la hora de inicio se guarda la primera vez y se reutiliza después", () => {
  expect(marcarInicio(7, HOY, 1000)).toBe(1000);
  expect(marcarInicio(7, HOY, 5000)).toBe(1000);
  expect(marcarInicio(8, HOY, 5000)).toBe(5000);
});
