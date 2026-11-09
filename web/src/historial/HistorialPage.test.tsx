import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { HistorialPage } from "./HistorialPage";

const BANCA = {
  id: 3,
  nombre: "Press de banca",
  propio: false,
  imagen: { origen: "wger", autor: "Everkinetic", licencia: "CC-BY-SA 3" },
};
const serie = (id: number, fecha: string, peso_kg: number, repeticiones: number) => ({
  id,
  fecha,
  ejercicio_id: 3,
  ejercicio: "Press de banca",
  peso_kg,
  repeticiones,
});

test("muestra el ejercicio, su imagen y cada serie en una fila, en el orden de la API", async () => {
  const fetch = simularFetch({
    status: 200,
    body: { ejercicio: BANCA, series: [serie(2, "2026-11-09", 85, 6), serie(1, "2026-11-09", 80, 8)] },
  });
  render(<HistorialPage ejercicioId={3} onSesionCaducada={vi.fn()} />);

  expect(await screen.findByRole("heading", { name: "Historial: Press de banca" })).toBeTruthy();
  const filas = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(filas).toEqual(["09/11/2026 · 85 kg × 6", "09/11/2026 · 80 kg × 8"]);
  expect(screen.getByRole("img", { name: "Imagen de Press de banca" })).toBeTruthy();
  expect(screen.getByText(/Everkinetic/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "← Volver" }).getAttribute("href")).toBe("#/");
  expect(fetch).toHaveBeenCalledWith("/api/ejercicios/3/series", undefined);
});

test("sin series lo dice", async () => {
  simularFetch({ status: 200, body: { ejercicio: { ...BANCA, imagen: null }, series: [] } });
  render(<HistorialPage ejercicioId={3} onSesionCaducada={vi.fn()} />);
  expect(await screen.findByText("Aún no has registrado series de este ejercicio.")).toBeTruthy();
});

test("ejercicio que no existe: aviso y enlace para volver", async () => {
  simularFetch({ status: 404, body: { error: "El ejercicio no existe" } });
  render(<HistorialPage ejercicioId={999} onSesionCaducada={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toBe("El ejercicio no existe");
  expect(screen.getByRole("link", { name: "← Volver" })).toBeTruthy();
});

test("si la sesión ha caducado, avisa a la app", async () => {
  simularFetch({ status: 401, body: { error: "Inicia sesión" } });
  const onSesionCaducada = vi.fn();
  render(<HistorialPage ejercicioId={3} onSesionCaducada={onSesionCaducada} />);
  await vi.waitFor(() => expect(onSesionCaducada).toHaveBeenCalled());
});
