import { expect, test } from "vitest";
import { iniciales } from "./iniciales";

test("dos palabras: la primera letra de cada una", () => {
  expect(iniciales("Remo con barra")).toBe("RB");
  expect(iniciales("press banca")).toBe("PB");
});

test("ignora palabras vacías como «de» o «con»", () => {
  expect(iniciales("Press de banca")).toBe("PB");
  expect(iniciales("Curl con mancuernas")).toBe("CM");
});

test("una sola palabra: sus dos primeras letras", () => {
  expect(iniciales("Sentadilla")).toBe("Se");
  expect(iniciales("Ñ")).toBe("Ñ");
});

test("tildes, guiones y paréntesis", () => {
  expect(iniciales("Élevación lateral")).toBe("ÉL");
  expect(iniciales("Jalón (agarre ancho)")).toBe("JA");
  expect(iniciales("Push-up")).toBe("PU");
});

test("sin letras: un signo de interrogación", () => {
  expect(iniciales("")).toBe("?");
  expect(iniciales("  123 ")).toBe("?");
});
