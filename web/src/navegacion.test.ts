import { expect, test } from "vitest";
import { enlace, enlaceHistorial, leerRuta } from "./navegacion";

test("leerRuta reconoce el historial de un ejercicio", () => {
  expect(leerRuta("#/ejercicios/12/historial")).toEqual({ pantalla: "historial", ejercicioId: 12 });
});

test("leerRuta reconoce «Mis ejercicios»", () => {
  expect(leerRuta("#/ejercicios")).toEqual({ pantalla: "ejercicios" });
  expect(enlace({ pantalla: "ejercicios" })).toBe("#/ejercicios");
});

test("cualquier otra dirección es el diario", () => {
  for (const hash of ["", "#/", "#/ejercicios/abc/historial", "#/ejercicios/12", "#/otra"]) {
    expect(leerRuta(hash)).toEqual({ pantalla: "diario" });
  }
});

test("enlace y leerRuta son inversos", () => {
  expect(enlaceHistorial(7)).toBe("#/ejercicios/7/historial");
  expect(leerRuta(enlaceHistorial(7))).toEqual({ pantalla: "historial", ejercicioId: 7 });
  expect(enlace({ pantalla: "diario" })).toBe("#/");
});
