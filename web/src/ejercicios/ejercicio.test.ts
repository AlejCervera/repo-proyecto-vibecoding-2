import { expect, test } from "vitest";
import { atribucion, normalizar, ofrecerCrear, puedeSubirImagen, type Ejercicio } from "./ejercicio";

const BANCA: Ejercicio = { id: 1, nombre: "Press de banca", propio: false, imagen: null };

test("normalizar quita tildes, mayúsculas y espacios sobrantes", () => {
  expect(normalizar("  Press   BÁNCA ")).toBe("press banca");
  expect(normalizar("Extensión de tríceps")).toBe("extension de triceps");
  expect(normalizar("Año")).toBe("ano");
});

test("ofrecerCrear solo si el texto no coincide con ningún resultado", () => {
  expect(ofrecerCrear("press de BÁNCA", [BANCA])).toBe(false);
  expect(ofrecerCrear("press", [BANCA])).toBe(true);
  expect(ofrecerCrear("   ", [BANCA])).toBe(false);
});

test("puedeSubirImagen salvo si ya tiene imagen de ejemplo", () => {
  expect(puedeSubirImagen(BANCA)).toBe(true);
  expect(puedeSubirImagen({ ...BANCA, imagen: { origen: "propia" } })).toBe(true);
  expect(
    puedeSubirImagen({ ...BANCA, imagen: { origen: "wger", autor: null, licencia: null } }),
  ).toBe(false);
});

test("atribucion solo para imágenes de wger, sin huecos si falta el autor", () => {
  expect(atribucion({ origen: "wger", autor: "Ana", licencia: "CC-BY-SA 4" })).toBe(
    "Imagen de ejemplo: wger.de · Ana · CC-BY-SA 4",
  );
  expect(atribucion({ origen: "wger", autor: null, licencia: "CC0" })).toBe(
    "Imagen de ejemplo: wger.de · CC0",
  );
  expect(atribucion({ origen: "propia" })).toBeNull();
  expect(atribucion(null)).toBeNull();
});
