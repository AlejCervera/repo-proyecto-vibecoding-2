import { expect, test } from "vitest";
import type { Serie } from "../series/serie";
import { contarHoy, seriesDeHoy, ultimaSesion, valoresIniciales } from "./progreso";

const HOY = "2026-11-09";
let siguienteId = 1;
const s = (fecha: string, peso_kg: number, repeticiones: number, ejercicio_id = 3): Serie => ({
  id: siguienteId++,
  fecha,
  ejercicio_id,
  ejercicio: "Press",
  peso_kg,
  repeticiones,
});

// Como las devuelve la API: más reciente primero
const historial = () => {
  siguienteId = 1;
  const lista = [
    s("2026-11-01", 70, 10),
    s("2026-11-05", 80, 8),
    s("2026-11-05", 80, 8),
    s("2026-11-05", 75, 10),
  ];
  return lista.reverse();
};

test("ultimaSesion: la fecha anterior a hoy más reciente, con sus series en orden", () => {
  const u = ultimaSesion(historial(), HOY)!;
  expect(u.fecha).toBe("2026-11-05");
  expect(u.series.map((x) => [x.peso_kg, x.repeticiones])).toEqual([
    [80, 8],
    [80, 8],
    [75, 10],
  ]);
});

test("ultimaSesion ignora lo de hoy y devuelve null sin historial previo", () => {
  siguienteId = 1;
  expect(ultimaSesion([s(HOY, 80, 8)], HOY)).toBeNull();
  expect(ultimaSesion([], HOY)).toBeNull();
});

test("seriesDeHoy en orden de registro", () => {
  siguienteId = 1;
  const lista = [s(HOY, 80, 8), s("2026-11-05", 1, 1), s(HOY, 85, 6)].reverse();
  expect(seriesDeHoy(lista, HOY).map((x) => x.peso_kg)).toEqual([80, 85]);
});

// --- Repetir el último, serie a serie (Fase 9f) -------------------------------------------

/** La última vez: 80×8 · 80×8 · 77,5×6 (y antes, otra sesión que no cuenta). */
function ultimaVez(): Serie[] {
  siguienteId = 1;
  return [s("2026-11-01", 70, 10), s("2026-11-05", 80, 8), s("2026-11-05", 80, 8), s("2026-11-05", 77.5, 6)];
}
const v = (peso: string, repeticiones: string) => ({ peso, repeticiones });

test("valoresIniciales: sin nada hoy, la primera serie de la última vez (no la última)", () => {
  expect(valoresIniciales(ultimaVez(), HOY)).toEqual(v("80", "8"));
});

test("valoresIniciales: si repites la serie como la última vez, propone la siguiente de entonces", () => {
  const series = ultimaVez();
  series.push(s(HOY, 80, 8));
  expect(valoresIniciales(series, HOY)).toEqual(v("80", "8"));
  series.push(s(HOY, 80, 8));
  expect(valoresIniciales(series, HOY)).toEqual(v("77,5", "6"));
});

test("valoresIniciales: si cambias una serie, la siguiente sigue desde lo que has hecho hoy", () => {
  const series = ultimaVez();
  series.push(s(HOY, 82.5, 8)); // hoy has subido peso
  expect(valoresIniciales(series, HOY)).toEqual(v("82,5", "8"));
});

test("valoresIniciales: con más series que la última vez, se repite la última de hoy", () => {
  const series = ultimaVez();
  series.push(s(HOY, 80, 8), s(HOY, 80, 8), s(HOY, 77.5, 6));
  expect(valoresIniciales(series, HOY)).toEqual(v("77,5", "6"));
});

test("valoresIniciales: la primera vez, vacío; sin sesión anterior, la última de hoy", () => {
  expect(valoresIniciales([], HOY)).toEqual(v("", ""));
  expect(valoresIniciales([s(HOY, 60, 12)], HOY)).toEqual(v("60", "12"));
});

test("contarHoy por ejercicio", () => {
  siguienteId = 1;
  const cuenta = contarHoy([s(HOY, 1, 1, 3), s(HOY, 1, 1, 3), s(HOY, 1, 1, 4), s("2026-11-01", 1, 1, 5)], HOY);
  expect(Object.fromEntries(cuenta)).toEqual({ 3: 2, 4: 1 });
});
