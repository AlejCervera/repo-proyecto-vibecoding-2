import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { App } from "./App";
import { simularFetch } from "./test-setup";

const ANA = { id: 1, nombre_usuario: "ana" };
const ENTRADA = {
  id: 4,
  fecha: "2026-11-09",
  rutina_id: 3,
  rutina_nombre: "Pecho",
  num_ejercicios: 2,
  num_series: 5,
};

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
  simularFetch(
    { status: 200, body: ANA },
    { status: 200, body: [] },
    { status: 200, body: [] },
    { status: 200, body: [] },
  );
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

test("el diario lista los entrenamientos y abre su detalle", async () => {
  window.location.hash = "#/diario";
  const fetch = simularFetch(
    { status: 200, body: ANA },
    { status: 200, body: [ENTRADA] },
    {
      status: 200,
      body: {
        ...ENTRADA,
        ejercicios: [
          {
            id: 10,
            nombre: "Press de banca",
            series: [{ id: 1, fecha: "2026-11-09", ejercicio_id: 10, ejercicio: "Press de banca", peso_kg: 80, repeticiones: 8 }],
          },
        ],
      },
    },
  );
  render(<App />);
  const lista = await screen.findByRole("list", { name: "Entrenamientos" });
  expect(lista.textContent).toContain("Lun 09/11 · Pecho");
  expect(lista.textContent).toContain("2 ejercicios · 5 series");
  expect(fetch).toHaveBeenCalledWith("/api/entrenamientos", undefined);

  window.location.hash = within(lista).getByRole("link").getAttribute("href")!;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  expect(await screen.findByRole("heading", { name: "Lun 09/11 · Pecho" })).toBeTruthy();
  expect(screen.getByRole("list", { name: "Series de Press de banca" }).textContent).toContain("80 kg × 8");
  const nav = screen.getByRole("navigation", { name: "Secciones" });
  expect(within(nav).getByRole("link", { current: "page" }).textContent).toBe("Diario");
});

test("cerrar sesión vuelve a la pantalla de inicio de sesión", async () => {
  window.location.hash = "#/diario";
  const fetch = simularFetch(
    { status: 200, body: ANA },
    { status: 200, body: [] },
    { status: 204, body: null },
  );
  render(<App />);
  await screen.findByText(/Aún no hay entrenamientos en el diario/);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  expect(fetch).toHaveBeenLastCalledWith("/api/auth/logout", { method: "POST" });
});

test("si la sesión caduca al cargar el diario, vuelve al inicio de sesión", async () => {
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
