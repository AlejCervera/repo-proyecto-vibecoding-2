import { expect, test } from "vitest";
import { normalizar, ofrecerCrear } from "./ejercicio";

test("normalizar quita tildes, mayúsculas y espacios sobrantes", () => {
  expect(normalizar("  Press   BÁNCA ")).toBe("press banca");
  expect(normalizar("Extensión de tríceps")).toBe("extension de triceps");
  expect(normalizar("Año")).toBe("ano");
});

test("ofrecerCrear solo si el texto no coincide con ningún resultado", () => {
  const resultados = [{ id: 1, nombre: "Press de banca", propio: false }];
  expect(ofrecerCrear("press de BÁNCA", resultados)).toBe(false);
  expect(ofrecerCrear("press", resultados)).toBe(true);
  expect(ofrecerCrear("   ", resultados)).toBe(false);
});
