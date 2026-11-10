import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { hoyISO } from "../series/serie";
import { simularFetch } from "../test-setup";
import { Empezar } from "./Empezar";
import { InicioPage } from "./InicioPage";
import { guardarUltimaRutina } from "./resumen";

const HOY = hoyISO();
const PECHO = {
  id: 3,
  nombre: "Pecho",
  predefinida: true,
  ejercicios: [{ id: 10, nombre: "Press de banca", series: 3, reps_min: 8, reps_max: 12 }],
};
const serie = (id: number, fecha: string, ejercicio: string) => ({
  id,
  fecha,
  ejercicio_id: id,
  ejercicio,
  peso_kg: 80,
  repeticiones: 8,
});

async function pintar(series: unknown[], rutinas: unknown[] = [PECHO], diario: unknown[] = []) {
  simularFetch(
    { status: 200, body: series },
    { status: 200, body: rutinas },
    { status: 200, body: diario },
  );
  render(<InicioPage onSesionCaducada={vi.fn()} />);
  return screen.findByRole("article", { name: "Entrenar" });
}

test("sin rutina usada: «Iniciar entrenamiento» lleva a elegir rutina", async () => {
  const entrenar = await pintar([]);
  expect(within(entrenar).getByRole("link", { name: "▶ Iniciar entrenamiento" }).getAttribute("href")).toBe(
    "#/rutinas",
  );
  expect(screen.getByRole("article", { name: "Último entrenamiento" }).textContent).toContain(
    "Aún no hay entrenamientos en el diario.",
  );
  expect(screen.getByRole("article", { name: "Esta semana" }).textContent).toContain("0 días · 0 series");
});

test("con rutina usada: continuar con ella", async () => {
  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  const entrenar = await pintar([]);
  expect(within(entrenar).getByRole("link", { name: "▶ Iniciar entrenamiento" }).getAttribute("href")).toBe(
    "#/rutinas/3/entrenar/0",
  );
  expect(entrenar.textContent).toContain("Continuar con «Pecho»");
});

test("si la rutina usada ya no existe, no la ofrece", async () => {
  guardarUltimaRutina({ id: 99, nombre: "Borrada" });
  const entrenar = await pintar([]);
  expect(entrenar.textContent).not.toContain("Borrada");
});

test("esta semana y último entrenamiento del diario", async () => {
  const diario = [
    { id: 8, fecha: "2026-11-09", rutina_id: 3, rutina_nombre: "Pecho", num_ejercicios: 2, num_series: 6 },
    { id: 5, fecha: "2026-11-05", rutina_id: 4, rutina_nombre: "Pierna", num_ejercicios: 3, num_series: 9 },
  ];
  await pintar([serie(2, HOY, "Aperturas"), serie(1, HOY, "Press de banca")], [PECHO], diario);
  const semana = screen.getByRole("article", { name: "Esta semana" });
  expect(semana.textContent).toContain("1 día · 2 series");
  expect(within(semana).getAllByLabelText("entrenado")).toHaveLength(1);
  const ultimo = screen.getByRole("article", { name: "Último entrenamiento" });
  expect(ultimo.textContent).toContain("Lun 09/11 · Pecho");
  expect(ultimo.textContent).toContain("2 ejercicios · 6 series");
  expect(within(ultimo).getByRole("link").getAttribute("href")).toBe("#/diario/8");
});

test("el atajo «empezar» va a la última rutina o a elegir una", () => {
  render(<Empezar />);
  expect(window.location.hash).toBe("#/rutinas");
  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  render(<Empezar />);
  expect(window.location.hash).toBe("#/rutinas/3/entrenar/0");
  window.location.hash = "";
});
