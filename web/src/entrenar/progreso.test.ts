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

test("valoresIniciales: la última serie de hoy si hay; si no, la última de la sesión anterior", () => {
  expect(valoresIniciales(historial(), HOY)).toEqual({ peso: "75", repeticiones: "10" });
  const conHoy = [s(HOY, 82.5, 6), ...historial()];
  expect(valoresIniciales(conHoy, HOY)).toEqual({ peso: "82,5", repeticiones: "6" });
  expect(valoresIniciales([], HOY)).toEqual({ peso: "", repeticiones: "" });
});

test("contarHoy por ejercicio", () => {
  siguienteId = 1;
  const cuenta = contarHoy([s(HOY, 1, 1, 3), s(HOY, 1, 1, 3), s(HOY, 1, 1, 4), s("2026-11-01", 1, 1, 5)], HOY);
  expect(Object.fromEntries(cuenta)).toEqual({ 3: 2, 4: 1 });
});
