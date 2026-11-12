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

const SIN_PLAN = Array(7).fill(null);

async function pintar(
  series: unknown[],
  rutinas: unknown[] = [PECHO],
  diario: unknown[] = [],
  semanaPlan: unknown[] = SIN_PLAN,
  cambios: unknown[] = [],
) {
  simularFetch(
    { status: 200, body: series },
    { status: 200, body: rutinas },
    { status: 200, body: diario },
    { status: 200, body: { dias: semanaPlan } },
    { status: 200, body: { dias: cambios } },
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
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const hace3 = new Date();
  hace3.setDate(hace3.getDate() - 3);
  const diario = [
    { id: 9, fecha: hoyISO(ayer), rutina_id: 4, rutina_nombre: "Pierna", num_ejercicios: 1, num_series: 3 },
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

// --- Con plan semanal (Fase 9c) ------------------------------------------------------------

/** Plan con «Pecho» o descanso hoy (y Pecho el resto de días, para que haya plan). */
const planHoy = (hoyRutina: unknown) => {
  const dia = (new Date().getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => (i === dia ? hoyRutina : { id: 3, nombre: "Pecho" }));
};

test("con plan: «Hoy toca» la rutina del plan aunque se usara otra", async () => {
  guardarUltimaRutina({ id: 99, nombre: "Otra" });
  const entrenar = await pintar([], [PECHO], [], planHoy({ id: 3, nombre: "Pecho" }));
  expect(within(entrenar).getByRole("heading", { name: "Pecho" })).toBeTruthy();
  expect(within(entrenar).queryByRole("link", { name: "Planificar la semana" })).toBeNull();
});

test("con plan y hoy descanso: «Toca descanso» y «Entrenar igualmente»", async () => {
  const entrenar = await pintar([], [PECHO], [], planHoy(null));
  expect(within(entrenar).getByRole("heading", { name: "Toca descanso" })).toBeTruthy();
  expect(within(entrenar).getByRole("link", { name: "Entrenar igualmente" }).getAttribute("href")).toBe("#/rutinas");
});

test("si ya se entrenó hoy: «¡Hecho!» con enlace al entreno", async () => {
  const diario = [{ id: 8, fecha: HOY, rutina_id: 3, rutina_nombre: "Pecho", num_ejercicios: 1, num_series: 3 }];
  const entrenar = await pintar([], [PECHO], diario, planHoy({ id: 3, nombre: "Pecho" }));
  expect(within(entrenar).getByRole("heading", { name: "¡Hecho! ✓" })).toBeTruthy();
  expect(entrenar.textContent).toContain("Pecho · 1 ejercicio · 3 series");
  expect(within(entrenar).getByRole("link", { name: "Ver el entreno" }).getAttribute("href")).toBe("#/diario/8");
});

test("con plan, «Esta semana» dice cuántos entrenos planificados van hechos y la racha", async () => {
  const diario = [{ id: 8, fecha: HOY, rutina_id: 3, rutina_nombre: "Pecho", num_ejercicios: 1, num_series: 3 }];
  await pintar([], [PECHO], diario, Array(7).fill({ id: 3, nombre: "Pecho" }));
  const semana = screen.getByRole("article", { name: "Esta semana" });
  expect(semana.textContent).toMatch(/1 de 7 entrenos · racha de 1/);
});

test("el cambio de hoy (descanso) manda sobre el plan", async () => {
  const entrenar = await pintar([], [PECHO], [], planHoy({ id: 3, nombre: "Pecho" }), [{ fecha: HOY, rutina: null }]);
  expect(within(entrenar).getByRole("heading", { name: "Toca descanso" })).toBeTruthy();
});

test("sin plan: la última rutina, con enlace para planificar la semana", async () => {
  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  const entrenar = await pintar([]);
  expect(within(entrenar).getByRole("link", { name: "Planificar la semana" }).getAttribute("href")).toBe("#/diario");
});

// --- Atajo del icono del móvil ---------------------------------------------------------------

test("el atajo «empezar» sin plan va a la última rutina o a elegir una", async () => {
  simularFetch({ status: 200, body: { dias: SIN_PLAN } }, { status: 200, body: { dias: [] } });
  const { unmount } = render(<Empezar />);
  await vi.waitFor(() => expect(window.location.hash).toBe("#/rutinas"));
  unmount();

  guardarUltimaRutina({ id: 3, nombre: "Pecho" });
  simularFetch({ status: 200, body: { dias: SIN_PLAN } }, { status: 200, body: { dias: [] } });
  render(<Empezar />);
  await vi.waitFor(() => expect(window.location.hash).toBe("#/rutinas/3/entrenar/0"));
  window.location.hash = "";
});

test("el atajo «empezar» con plan va a la rutina que toca hoy", async () => {
  guardarUltimaRutina({ id: 99, nombre: "Otra" });
  simularFetch({ status: 200, body: { dias: planHoy({ id: 3, nombre: "Pecho" }) } }, { status: 200, body: { dias: [] } });
  render(<Empezar />);
  await vi.waitFor(() => expect(window.location.hash).toBe("#/rutinas/3/entrenar/0"));
  window.location.hash = "";
});
