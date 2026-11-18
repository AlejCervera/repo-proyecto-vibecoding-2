import { expect, test } from "vitest";
import { discosPorLado } from "./discos";

test("100 kg con barra de 20: 25 + 15 por lado", () => {
  expect(discosPorLado(100, 20)).toEqual({ tipo: "discos", porLado: [25, 15], total: 100, exacto: true });
});

test("con decimales: 62,5 kg → 20 + 1,25 por lado", () => {
  expect(discosPorLado(62.5, 20)).toEqual({ tipo: "discos", porLado: [20, 1.25], total: 62.5, exacto: true });
});

test("muchos discos: 180 kg → 25 · 25 · 25 · 5 por lado", () => {
  expect(discosPorLado(180, 20)).toMatchObject({ porLado: [25, 25, 25, 5], exacto: true });
});

test("un peso que no se puede cargar exacto da el más cercano por debajo", () => {
  expect(discosPorLado(61, 20)).toEqual({ tipo: "discos", porLado: [20], total: 60, exacto: false });
});

test("con otra barra: 60 kg con barra de 15 → 20 + 2,5 por lado", () => {
  expect(discosPorLado(60, 15)).toEqual({ tipo: "discos", porLado: [20, 2.5], total: 60, exacto: true });
});

test("menos (o igual) que la barra: sin discos", () => {
  expect(discosPorLado(20, 20)).toEqual({ tipo: "sin-discos", barra: 20 });
  expect(discosPorLado(12, 20)).toEqual({ tipo: "sin-discos", barra: 20 });
});
