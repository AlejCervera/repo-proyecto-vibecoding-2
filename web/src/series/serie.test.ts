import { expect, test } from "vitest";
import {
  aPeticion,
  formatearFecha,
  formatearSerie,
  formularioDesde,
  hoyISO,
  ordenarSeries,
  pesoPorReps,
  reemplazarSerie,
} from "./serie";

test("aPeticion envía el id del ejercicio y convierte los vacíos en null", () => {
  const ejercicio = { id: 3, nombre: "Press de banca", propio: false, imagen: null };
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

test("pesoPorReps y formatearFecha", () => {
  expect(pesoPorReps({ peso_kg: 85, repeticiones: 6 })).toBe("85 kg × 6");
  expect(formatearFecha("2026-11-09")).toBe("09/11/2026");
});

const s = (id: number, fecha: string, peso_kg = 80) => ({
  id,
  fecha,
  ejercicio_id: 3,
  ejercicio: "Press",
  peso_kg,
  repeticiones: 8,
});

test("ordenarSeries: más reciente primero y, a igual fecha, la última registrada", () => {
  const ordenadas = ordenarSeries([s(1, "2026-11-01"), s(2, "2026-11-09"), s(3, "2026-11-09")]);
  expect(ordenadas.map((x) => x.id)).toEqual([3, 2, 1]);
});

test("reemplazarSerie sustituye y reordena si cambia la fecha", () => {
  const lista = [s(2, "2026-11-09"), s(1, "2026-11-01")];
  const res = reemplazarSerie(lista, s(2, "2026-10-01", 85));
  expect(res.map((x) => [x.id, x.peso_kg])).toEqual([
    [1, 80],
    [2, 85],
  ]);
});

test("formularioDesde rellena con coma decimal", () => {
  expect(formularioDesde(s(1, "2026-11-09", 82.5))).toEqual({
    fecha: "2026-11-09",
    ejercicio: { id: 3, nombre: "Press", propio: false, imagen: null },
    peso: "82,5",
    repeticiones: "8",
  });
});

test("hoyISO usa la fecha local", () => {
  expect(hoyISO(new Date(2026, 0, 5))).toBe("2026-01-05");
});
