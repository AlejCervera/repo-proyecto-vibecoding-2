import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { Bienvenida } from "./Bienvenida";

const ej = { id: 10, nombre: "Press de banca", series: 3, reps_min: 8, reps_max: 12 };
const PECHO = { id: 3, nombre: "Pecho", predefinida: true, ejercicios: [ej] };
const PIERNA = { id: 4, nombre: "Pierna", predefinida: true, ejercicios: [ej] };
const COPIA = { id: 20, nombre: "Mi pecho", predefinida: false, ejercicios: [ej] };
const SIN_PLAN = { dias: Array(7).fill(null) };

function pintar(...extra: { status: number; body: unknown }[]) {
  const fetch = simularFetch(
    { status: 200, body: [PECHO, PIERNA] },
    { status: 200, body: SIN_PLAN },
    ...extra,
  );
  const onTerminar = vi.fn();
  render(<Bienvenida nombre="bea" onTerminar={onTerminar} />);
  return { fetch, onTerminar };
}

const boton = (nombre: string | RegExp) => screen.getByRole("button", { name: nombre });

test("los tres pasos: copiar una rutina, planificar la semana y listo", async () => {
  const conPlan = { dias: [{ id: 20, nombre: "Mi pecho" }, null, null, null, null, null, null] };
  const { fetch, onTerminar } = pintar({ status: 201, body: COPIA }, { status: 200, body: conPlan });

  // Paso 1: las predefinidas, con «Copiar»
  expect(screen.getByRole("heading", { name: "Hola, bea. Elige con qué empezar" })).toBeTruthy();
  expect(screen.getByText("Paso 1 de 3")).toBeTruthy();
  const lista = await screen.findByRole("list", { name: "Rutinas para empezar" });
  expect(within(lista).getAllByRole("listitem").map((li) => li.querySelector("strong")?.textContent)).toEqual([
    "Pecho",
    "Pierna",
  ]);
  fireEvent.click(boton("Copiar Pecho"));
  await screen.findByRole("button", { name: "Pecho copiada" });
  expect(fetch.mock.calls[2][0]).toBe("/api/rutinas/3/copiar");
  expect(screen.getByText("Ya tienes 1 rutina tuya.")).toBeTruthy();

  // Paso 2: la copia ya se puede elegir para el lunes
  fireEvent.click(boton("Siguiente"));
  expect(screen.getByRole("heading", { name: "Planifica tu semana" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Lunes"), { target: { value: "20" } });
  fireEvent.click(boton("Guardar y seguir"));

  // Paso 3: el resumen de la semana
  expect(await screen.findByRole("heading", { name: "¡Listo!" })).toBeTruthy();
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ dias: [20, null, null, null, null, null, null] });
  expect(within(screen.getByRole("list", { name: "Tu semana" })).getByRole("listitem").textContent).toBe(
    "Lunes · Mi pecho",
  );
  fireEvent.click(boton("Ir al inicio"));
  expect(onTerminar).toHaveBeenCalledTimes(1);
});

test("«Saltar» termina en cualquier paso", async () => {
  const { onTerminar } = pintar();
  await screen.findByRole("list", { name: "Rutinas para empezar" });
  fireEvent.click(boton("Saltar"));
  expect(onTerminar).toHaveBeenCalledTimes(1);
});

test("«Atrás» vuelve al paso anterior y en el primero no aparece", async () => {
  pintar();
  await screen.findByRole("list", { name: "Rutinas para empezar" });
  expect(screen.queryByRole("button", { name: /Atrás/ })).toBeNull();
  fireEvent.click(boton("Siguiente"));
  expect(screen.getByText("Paso 2 de 3")).toBeTruthy();
  fireEvent.click(boton(/Atrás/));
  expect(screen.getByText("Paso 1 de 3")).toBeTruthy();
});

test("«Ahora no» pasa sin guardar el plan y lo dice en el resumen", async () => {
  const { fetch } = pintar();
  await screen.findByRole("list", { name: "Rutinas para empezar" });
  fireEvent.click(boton("Siguiente"));
  fireEvent.click(boton("Ahora no"));
  expect(screen.getByRole("heading", { name: "¡Listo!" })).toBeTruthy();
  expect(screen.getByText(/Sin plan por ahora/)).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(2); // solo las dos lecturas del principio
});

test("si falla copiar, lo dice y deja seguir", async () => {
  pintar({ status: 500, body: { error: "No se ha podido copiar" } });
  await screen.findByRole("list", { name: "Rutinas para empezar" });
  fireEvent.click(boton("Copiar Pierna"));
  expect((await screen.findByRole("alert")).textContent).toBe("No se ha podido copiar");
  expect(boton("Siguiente").hasAttribute("disabled")).toBe(false);
});
