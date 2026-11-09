import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";
import { simularFetch } from "./test-setup";

test("muestra el nombre de la app", async () => {
  simularFetch({ status: 200, body: [] });
  render(<App />);
  expect(screen.getByRole("heading", { name: "Gym Log" })).toBeTruthy();
  expect(await screen.findByText("Aún no hay series.")).toBeTruthy();
});

test("carga y muestra las series guardadas", async () => {
  const fetch = simularFetch({
    status: 200,
    body: [{ id: 1, fecha: "2026-11-09", ejercicio: "Press banca", peso_kg: 80, repeticiones: 8 }],
  });
  render(<App />);
  expect(await screen.findByText(/Press banca · 80 kg × 8/)).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith("/api/series", undefined);
});

test("avisa si no puede cargar las series", async () => {
  simularFetch({ status: 500, body: null });
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toMatch(/servidor/);
});
