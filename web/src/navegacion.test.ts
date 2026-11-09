import { expect, test } from "vitest";
import { enlace, enlaceHistorial, enlaceRutina, leerRuta } from "./navegacion";

test("leerRuta reconoce el historial de un ejercicio", () => {
  expect(leerRuta("#/ejercicios/12/historial")).toEqual({ pantalla: "historial", ejercicioId: 12 });
});

test("leerRuta reconoce «Mis ejercicios»", () => {
  expect(leerRuta("#/ejercicios")).toEqual({ pantalla: "ejercicios" });
  expect(enlace({ pantalla: "ejercicios" })).toBe("#/ejercicios");
});

test("rutinas y detalle de una rutina", () => {
  expect(leerRuta("#/rutinas")).toEqual({ pantalla: "rutinas" });
  expect(leerRuta("#/rutinas/4")).toEqual({ pantalla: "rutina", rutinaId: 4 });
  expect(enlaceRutina(4)).toBe("#/rutinas/4");
  expect(enlace({ pantalla: "rutinas" })).toBe("#/rutinas");
});

test("entrenar: paso inicial, un paso concreto y el resumen", () => {
  expect(leerRuta("#/rutinas/4/entrenar")).toEqual({ pantalla: "entrenar", rutinaId: 4, paso: 0 });
  expect(leerRuta("#/rutinas/4/entrenar/2")).toEqual({ pantalla: "entrenar", rutinaId: 4, paso: 2 });
  expect(leerRuta("#/rutinas/4/entrenar/fin")).toEqual({
    pantalla: "entrenar",
    rutinaId: 4,
    paso: "fin",
  });
  expect(enlace({ pantalla: "entrenar", rutinaId: 4, paso: 2 })).toBe("#/rutinas/4/entrenar/2");
  expect(leerRuta("#/rutinas/4/entrenar/x")).toEqual({ pantalla: "diario" });
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
