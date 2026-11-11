import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { RecomendacionesPanel } from "./RecomendacionesPanel";

const ej = (id: number, nombre: string) => ({ id, nombre, series: 3, reps_min: 8, reps_max: 12 });
const RUTINA = { id: 7, nombre: "Pecho", predefinida: false, ejercicios: [ej(1, "Press de banca")] };
const RECOS = {
  resumen: "Sube en press de banca.",
  anadir: [{ ejercicio_id: 3, nombre: "Fondos", series: 3, reps_min: 8, reps_max: 10, motivo: "Tríceps." }],
  sustituir: [],
  objetivos: [
    { ejercicio_id: 1, nombre: "Press de banca", peso_kg: 82.5, reps_min: 8, reps_max: 12, motivo: "80 kg × 12 en todas." },
  ],
};

function pintar(...respuestas: { status: number; body: unknown }[]) {
  const fetch = simularFetch(...respuestas);
  const onRutina = vi.fn();
  render(<RecomendacionesPanel rutina={RUTINA} onRutina={onRutina} onSesionCaducada={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Pedir recomendaciones" }));
  return { fetch, onRutina };
}

test("muestra objetivos con el peso y ejercicios para añadir", async () => {
  const { fetch } = pintar({ status: 200, body: RECOS });
  const objetivos = await screen.findByRole("list", { name: "Objetivos recomendados" });
  expect(objetivos.textContent).toContain("Press de banca: 82,5 kg, 8-12 repeticiones");
  expect(objetivos.textContent).toContain("80 kg × 12 en todas.");
  expect(screen.getByText("Sube en press de banca.")).toBeTruthy();
  expect(screen.getByRole("list", { name: "Ejercicios recomendados para añadir" }).textContent).toContain("Fondos: 3 × 8-10");
  expect(fetch).toHaveBeenCalledWith("/api/rutinas/7/recomendaciones", { method: "POST" });
});

test("aplicar añade el ejercicio, actualiza la rutina y lo marca como aplicado", async () => {
  const actualizada = { ...RUTINA, ejercicios: [...RUTINA.ejercicios, ej(3, "Fondos")] };
  const { onRutina } = pintar({ status: 200, body: RECOS }, { status: 200, body: actualizada });
  fireEvent.click(await screen.findByRole("button", { name: "Aplicar: añadir Fondos" }));
  await vi.waitFor(() => expect(onRutina).toHaveBeenCalledWith(actualizada));
  const lista = screen.getByRole("list", { name: "Ejercicios recomendados para añadir" });
  expect(within(lista).getByText("✓ Aplicado")).toBeTruthy();
});

test("error 429: avisa del límite de Gemini", async () => {
  pintar({ status: 429, body: { error: "Gemini ha recibido demasiadas peticiones o se ha agotado la cuota gratuita." } });
  expect((await screen.findByRole("alert")).textContent).toContain("demasiadas peticiones");
});

test("respuesta no válida: avisa", async () => {
  pintar({ status: 502, body: { error: "La IA ha dado una respuesta que no es válida. Prueba de nuevo." } });
  expect((await screen.findByRole("alert")).textContent).toContain("no es válida");
});

test("sin perfil: avisa y enlaza a Mi perfil", async () => {
  pintar({ status: 400, body: { error: "Completa tu altura y tu peso en «Mi perfil» para pedir recomendaciones" } });
  const alerta = await screen.findByRole("alert");
  expect(within(alerta).getByRole("link", { name: "Ir a Mi perfil" }).getAttribute("href")).toBe("#/perfil");
});

test("sin conexión con el servidor", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  render(<RecomendacionesPanel rutina={RUTINA} onRutina={vi.fn()} onSesionCaducada={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Pedir recomendaciones" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Failed to fetch");
});
