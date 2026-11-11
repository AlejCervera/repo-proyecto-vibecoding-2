import { expect, test } from "vitest";
import type { Serie } from "../series/serie";
import { agruparPorDia } from "./agrupar";

const s = (id: number, fecha: string): Serie => ({
  id,
  fecha,
  ejercicio_id: 1,
  ejercicio: "Press de banca",
  peso_kg: 80,
  repeticiones: 8,
});

test("días del más reciente al más antiguo; dentro del día, en el orden en que se hicieron", () => {
  // Como llegan de la API: fecha más reciente primero y, a igual fecha, la última registrada primero
  const dias = agruparPorDia([s(5, "2026-11-09"), s(4, "2026-11-09"), s(2, "2026-11-02"), s(3, "2026-11-09")]);
  expect(dias.map((d) => d.fecha)).toEqual(["2026-11-09", "2026-11-02"]);
  expect(dias[0].series.map((x) => x.id)).toEqual([3, 4, 5]);
  expect(dias[1].series.map((x) => x.id)).toEqual([2]);
});

test("sin series, sin días", () => {
  expect(agruparPorDia([])).toEqual([]);
});
