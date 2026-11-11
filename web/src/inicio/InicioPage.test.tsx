import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { hoyISO } from "../series/serie";
import { simularFetch } from "../test-setup";
import { Empezar } from "./Empezar";
import { InicioPage } from "./InicioPage";
import { fechaLarga, guardarUltimaRutina } from "./resumen";

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

test("sin rutina usada: «Elegir rutina» lleva a la lista", async () => {
  const entrenar = await pintar([]);
  expect(within(entrenar).getByRole("heading", { name: "¿Qué entrenas hoy?" })).toBeTruthy();
  expect(within(entrenar).getByRole("link", { name: "Elegir rutina" }).getAttribute("href")).toBe("#/rutinas");
  expect(screen.getByRole("article", { name: "Último entrenamiento" }).textContent).toContain(
    "Aún no hay entrenamientos en el diario.",
  );
  expect(screen.getByRole("article", { name: "Esta semana" }).textContent).toContain("0 días · 0 series");
  expect(screen.getByText(fechaLarga(HOY))).toBeTruthy();
});

test("con rutina usada: «Hoy toca» con «Empezar» y elegir otra", async () => {
  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  const entrenar = await pintar([]);
  expect(within(entrenar).getByRole("heading", { name: "Pecho" })).toBeTruthy();
  expect(entrenar.textContent).toContain("Hoy toca");
  expect(entrenar.textContent).toContain("1 ejercicio · aún sin entrenar");
  expect(within(entrenar).getByRole("link", { name: "Empezar" }).getAttribute("href")).toBe(
    "#/rutinas/3/entrenar/0",
  );
  expect(within(entrenar).getByRole("link", { name: "Elegir otra rutina" }).getAttribute("href")).toBe(
    "#/rutinas",
  );
});

test("«la última vez» sale del diario de esa rutina", async () => {
  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  const hace3 = new Date();
  hace3.setDate(hace3.getDate() - 3);
  const diario = [
    { id: 9, fecha: HOY, rutina_id: 4, rutina_nombre: "Pierna", num_ejercicios: 1, num_series: 3 },
    { id: 8, fecha: hoyISO(hace3), rutina_id: 3, rutina_nombre: "Pecho", num_ejercicios: 2, num_series: 6 },
  ];
  const entrenar = await pintar([], [PECHO], diario);
  expect(entrenar.textContent).toContain("1 ejercicio · la última vez hace 3 días");
});

test("la semana marca el día de hoy", async () => {
  await pintar([]);
  const hoy = within(screen.getByRole("list", { name: "Días entrenados" })).getAllByRole("listitem")
    .filter((li) => li.getAttribute("aria-current") === "date");
  expect(hoy).toHaveLength(1);
  expect(hoy[0].className).toContain("hoy");
});

test("el último entrenamiento muestra los récords de ese día", async () => {
  const s = (id: number, fecha: string, peso_kg: number) => ({
    id,
    fecha,
    ejercicio_id: 10,
    ejercicio: "Press de banca",
    peso_kg,
    repeticiones: 5,
  });
  const diario = [{ id: 8, fecha: "2026-11-09", rutina_id: 3, rutina_nombre: "Pecho", num_ejercicios: 1, num_series: 1 }];
  await pintar([s(1, "2026-11-02", 80), s(2, "2026-11-09", 85)], [PECHO], diario);
  const records = screen.getByRole("list", { name: "Récords de ese día" });
  expect(records.textContent).toBe("Récord en Press de banca: 85 kg × 5");
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
