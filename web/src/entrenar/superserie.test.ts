import { expect, test } from "vitest";
import { pareja, trasGuardar } from "./superserie";

// A (0) + B (1) en superserie; C (2) suelto
const EJS = [{ con_siguiente: true }, { con_siguiente: false }, { con_siguiente: false }];

test("pareja: A ↔ B; C no tiene", () => {
  expect(pareja(EJS, 0)).toBe(1);
  expect(pareja(EJS, 1)).toBe(0);
  expect(pareja(EJS, 2)).toBeNull();
  expect(pareja([{ con_siguiente: true }], 0)).toBeNull(); // el último no se une con nada
});

/** Simula una superserie de 3 + 3: cada «Hecha» descuenta una serie y aplica trasGuardar. */
function recorrido(seriesA: number, seriesB: number) {
  const quedan = [seriesA, seriesB, 0];
  let i = 0;
  const pasos: string[] = [];
  while (quedan[0] + quedan[1] > 0) {
    quedan[i]--;
    const r = trasGuardar(EJS, i, (j) => quedan[j]);
    pasos.push(`${"AB"[i]}${r.descanso ? " · descanso" : ""}`);
    if (r.ir !== null) i = r.ir;
  }
  return pasos;
}

test("A1 → B1 → descanso → A2 → B2 → descanso…", () => {
  expect(recorrido(3, 3)).toEqual(["A", "B · descanso", "A", "B · descanso", "A", "B · descanso"]);
});

test("con más series en A: al acabar B, A sigue sola con descanso", () => {
  expect(recorrido(3, 2)).toEqual(["A", "B · descanso", "A", "B · descanso", "A · descanso"]);
});

test("con más series en B: al acabar A, B sigue sola con descanso", () => {
  expect(recorrido(1, 3)).toEqual(["A", "B · descanso", "B · descanso", "B · descanso"]);
});

test("un ejercicio suelto descansa y se queda", () => {
  expect(trasGuardar(EJS, 2, () => 2)).toEqual({ ir: null, descanso: true });
});
