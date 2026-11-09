import { expect, test } from "vitest";
import { medidasReducidas, reducirImagen } from "./reducir";

test("reduce el lado mayor a 1200 px manteniendo la proporción", () => {
  expect(medidasReducidas(4000, 3000)).toEqual({ ancho: 1200, alto: 900 });
  expect(medidasReducidas(3000, 4000)).toEqual({ ancho: 900, alto: 1200 });
});

test("no agranda las imágenes pequeñas", () => {
  expect(medidasReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 });
});

test("si el navegador no puede reducirla, devuelve el archivo original", async () => {
  // jsdom no tiene createImageBitmap
  const original = new Blob(["x"], { type: "image/png" });
  expect(await reducirImagen(original)).toBe(original);
});
