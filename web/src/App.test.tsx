import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { App } from "./App";
import { simularFetch } from "./test-setup";

const ANA = { id: 1, nombre_usuario: "ana" };

afterEach(() => {
  window.location.hash = "";
});

test("sin sesión muestra el nombre de la app y el inicio de sesión", async () => {
  simularFetch({ status: 401, body: { error: "Inicia sesión para continuar" } });
  render(<App />);
  expect(screen.getByRole("heading", { name: "Gym Log" })).toBeTruthy();
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
});

test("con sesión, la primera pantalla es el inicio y la navegación lo marca", async () => {
  simularFetch({ status: 200, body: ANA }, { status: 200, body: [] }, { status: 200, body: [] });
  render(<App />);
  expect(await screen.findByRole("link", { name: "▶ Iniciar entrenamiento" })).toBeTruthy();
  const nav = screen.getByRole("navigation", { name: "Secciones" });
  expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual([
    "Inicio",
    "Diario",
    "Rutinas",
    "Mis ejercicios",
  ]);
  expect(within(nav).getByRole("link", { current: "page" }).textContent).toBe("Inicio");
});

test("el diario carga y muestra las series del usuario", async () => {
  window.location.hash = "#/diario";
  const fetch = simularFetch(
    { status: 200, body: ANA },
    {
      status: 200,
      body: [{ id: 1, fecha: "2026-11-09", ejercicio: "Press banca", peso_kg: 80, repeticiones: 8 }],
    },
  );
  render(<App />);
  expect((await screen.findByRole("list", { name: "Series" })).textContent).toContain(
    "Press banca · 80 kg × 8",
  );
  expect(screen.getByText("ana")).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith("/api/series", undefined);
});

test("el enlace del ejercicio abre su historial", async () => {
  window.location.hash = "#/diario";
  simularFetch(
    { status: 200, body: ANA },
    {
      status: 200,
      body: [{ id: 1, fecha: "2026-11-09", ejercicio_id: 3, ejercicio: "Press banca", peso_kg: 80, repeticiones: 8 }],
    },
    {
      status: 200,
      body: { ejercicio: { id: 3, nombre: "Press banca", propio: false, imagen: null }, series: [] },
    },
  );
  render(<App />);
  const enlace = await screen.findByRole("link", { name: "Press banca" });
  expect(enlace.getAttribute("href")).toBe("#/ejercicios/3/historial");

  window.location.hash = "#/ejercicios/3/historial";
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  expect(await screen.findByRole("heading", { name: "Historial: Press banca" })).toBeTruthy();
});

test("cerrar sesión vuelve a la pantalla de inicio de sesión", async () => {
  window.location.hash = "#/diario";
  const fetch = simularFetch(
    { status: 200, body: ANA },
    { status: 200, body: [] },
    { status: 204, body: null },
  );
  render(<App />);
  await screen.findByText("Aún no hay series."); // esperar a que se pidan las series
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  expect(fetch).toHaveBeenLastCalledWith("/api/auth/logout", { method: "POST" });
});

test("si la sesión caduca al cargar las series, vuelve al inicio de sesión", async () => {
  window.location.hash = "#/diario";
  simularFetch({ status: 200, body: ANA }, { status: 401, body: { error: "Inicia sesión" } });
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
});

test("avisa si no puede conectar con el servidor", async () => {
  simularFetch({ status: 500, body: null });
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toMatch(/servidor/);
});
