import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { EntrenamientoPage } from "./EntrenamientoPage";

afterEach(() => {
  window.location.hash = "";
});

const serie = (id: number, ejercicio_id: number, ejercicio: string, peso_kg: number) => ({
  id,
  fecha: "2026-11-09",
  ejercicio_id,
  ejercicio,
  peso_kg,
  repeticiones: 8,
});
const DETALLE = {
  id: 4,
  fecha: "2026-11-09",
  rutina_id: 3,
  rutina_nombre: "Pecho",
  ejercicios: [
    { id: 10, nombre: "Press de banca", series: [serie(1, 10, "Press de banca", 80), serie(2, 10, "Press de banca", 85)] },
    { id: 11, nombre: "Aperturas", series: [serie(3, 11, "Aperturas", 14)] },
  ],
};

async function pintar(...extra: { status: number; body: unknown }[]) {
  const fetch = simularFetch({ status: 200, body: DETALLE }, ...extra);
  render(<EntrenamientoPage entrenamientoId={4} onSesionCaducada={vi.fn()} />);
  await screen.findByRole("heading", { name: "Lun 09/11 · Pecho" });
  return fetch;
}

test("muestra cada ejercicio con sus series y enlace a su historial", async () => {
  await pintar();
  const banca = screen.getByRole("article", { name: "Press de banca" });
  const filas = within(banca).getAllByRole("listitem").map((li) => li.textContent);
  expect(filas[0]).toContain("80 kg × 8");
  expect(filas[1]).toContain("85 kg × 8");
  expect(within(banca).getByRole("link", { name: "Press de banca" }).getAttribute("href")).toBe(
    "#/ejercicios/10/historial",
  );
  expect(screen.getByRole("article", { name: "Aperturas" }).textContent).toContain("14 kg × 8");
});

test("borrar una serie recarga el entrenamiento", async () => {
  const fetch = await pintar(
    { status: 204, body: null },
    { status: 200, body: { ...DETALLE, ejercicios: [DETALLE.ejercicios[0]] } },
  );
  const aperturas = screen.getByRole("article", { name: "Aperturas" });
  fireEvent.click(within(aperturas).getByRole("button", { name: "Borrar" }));
  fireEvent.click(within(aperturas).getByRole("button", { name: "Sí, borrar" }));
  await vi.waitFor(() => expect(screen.queryByRole("article", { name: "Aperturas" })).toBeNull());
  expect(fetch).toHaveBeenNthCalledWith(2, "/api/series/3", { method: "DELETE" });
});

test("quitar del diario pide confirmación, avisa de que las series se quedan y vuelve al diario", async () => {
  const fetch = await pintar({ status: 204, body: null });
  fireEvent.click(screen.getByRole("button", { name: "Quitar del diario" }));
  expect(screen.getByText(/Sus series se quedan en el historial de cada ejercicio/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sí, quitar" }));
  await vi.waitFor(() => expect(window.location.hash).toBe("#/diario"));
  expect(fetch).toHaveBeenLastCalledWith("/api/entrenamientos/4", { method: "DELETE" });
});

test("entrenamiento que no existe: aviso", async () => {
  simularFetch({ status: 404, body: { error: "El entrenamiento no existe" } });
  render(<EntrenamientoPage entrenamientoId={99} onSesionCaducada={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toBe("El entrenamiento no existe");
});
