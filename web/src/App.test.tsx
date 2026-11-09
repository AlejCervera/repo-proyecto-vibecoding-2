import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";
import { simularFetch } from "./test-setup";

const ANA = { id: 1, nombre_usuario: "ana" };

test("sin sesión muestra el nombre de la app y el inicio de sesión", async () => {
  simularFetch({ status: 401, body: { error: "Inicia sesión para continuar" } });
  render(<App />);
  expect(screen.getByRole("heading", { name: "Gym Log" })).toBeTruthy();
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
});

test("con sesión carga y muestra las series del usuario", async () => {
  const fetch = simularFetch(
    { status: 200, body: ANA },
    {
      status: 200,
      body: [{ id: 1, fecha: "2026-11-09", ejercicio: "Press banca", peso_kg: 80, repeticiones: 8 }],
    },
  );
  render(<App />);
  expect(await screen.findByText(/Press banca · 80 kg × 8/)).toBeTruthy();
  expect(screen.getByText("ana")).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith("/api/series", undefined);
});

test("cerrar sesión vuelve a la pantalla de inicio de sesión", async () => {
  const fetch = simularFetch(
    { status: 200, body: ANA },
    { status: 200, body: [] },
    { status: 204, body: null },
  );
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  expect(fetch).toHaveBeenLastCalledWith("/api/auth/logout", { method: "POST" });
});

test("si la sesión caduca al cargar las series, vuelve al inicio de sesión", async () => {
  simularFetch({ status: 200, body: ANA }, { status: 401, body: { error: "Inicia sesión" } });
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
});

test("avisa si no puede conectar con el servidor", async () => {
  simularFetch({ status: 500, body: null });
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toMatch(/servidor/);
});
