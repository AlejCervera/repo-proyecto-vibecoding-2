import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { fechaLarga } from "../inicio/resumen";
import { hoyISO } from "../series/serie";
import { simularFetch } from "../test-setup";
import { sumarDias } from "./calendario";
import { DiarioPage } from "./DiarioPage";

const HOY = hoyISO();
const AYER = sumarDias(HOY, -1);
const PUSH = { id: 1, nombre: "Push", predefinida: false, ejercicios: [] };
const PIERNA = { id: 2, nombre: "Pierna", predefinida: false, ejercicios: [] };
const TODOS_PUSH = Array(7).fill({ id: 1, nombre: "Push" });

function pintar(opciones: { diario?: unknown[]; semana?: unknown[]; cambios?: unknown[] }, ...extra: { status: number; body: unknown }[]) {
  const fetch = simularFetch(
    { status: 200, body: opciones.diario ?? [] },
    { status: 200, body: [PUSH, PIERNA] },
    { status: 200, body: { dias: opciones.semana ?? Array(7).fill(null) } },
    { status: 200, body: { dias: opciones.cambios ?? [] } },
    ...extra,
  );
  render(<DiarioPage onSesionCaducada={vi.fn()} />);
  return fetch;
}

/** El botón de un día del calendario (su nombre empieza por la fecha larga). */
const dia = (fecha: string) => screen.getByRole("button", { name: new RegExp(`^${fechaLarga(fecha)}:`) });

test("el calendario del mes muestra lo planeado frente a lo hecho", async () => {
  const fetch = pintar({
    semana: TODOS_PUSH,
    diario: [{ id: 5, fecha: AYER, rutina_id: 1, rutina_nombre: "Push", num_ejercicios: 1, num_series: 3 }],
  });
  await screen.findByText(/Push/, { selector: "a" });
  expect(dia(HOY).getAttribute("aria-label")).toBe(`${fechaLarga(HOY)}: pendiente · Push`);
  expect(dia(HOY).getAttribute("aria-current")).toBe("date");
  // Ayer puede caer en el mes anterior; solo se comprueba si está en este
  if (AYER.slice(0, 7) === HOY.slice(0, 7)) {
    expect(dia(AYER).getAttribute("aria-label")).toBe(`${fechaLarga(AYER)}: hecho · Push`);
  }
  // Los cambios se piden para el mes que se ve
  const desde = `${HOY.slice(0, 7)}-01`;
  expect(fetch.mock.calls[3][0]).toMatch(new RegExp(`^/api/plan/dias\\?desde=${desde}&hasta=`));
});

test("cambiar de mes pide los cambios de ese mes", async () => {
  const fetch = pintar({}, { status: 200, body: { dias: [] } });
  await screen.findByRole("button", { name: "Mes siguiente" });
  const antes = screen.getByRole("heading", { level: 3, name: /de \d{4}$/ }).textContent;
  fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
  expect(screen.getByRole("heading", { level: 3, name: /de \d{4}$/ }).textContent).not.toBe(antes);
});

test("tocar hoy abre su hoja; «Cambiar solo este día» guarda el cambio", async () => {
  const fetch = pintar(
    { semana: TODOS_PUSH },
    { status: 200, body: { fecha: HOY, rutina: { id: 2, nombre: "Pierna" } } },
  );
  await screen.findByRole("button", { name: "Mes anterior" });
  await vi.waitFor(() => expect(dia(HOY).getAttribute("aria-label")).toContain("Push"));
  fireEvent.click(dia(HOY));
  const hoja = screen.getByRole("dialog", { name: fechaLarga(HOY) });
  expect(hoja.textContent).toContain("Toca: Push");
  expect(within(hoja).getByRole("link", { name: "Empezar Push" }).getAttribute("href")).toBe("#/rutinas/1/entrenar/0");

  fireEvent.change(within(hoja).getByLabelText("Cambiar solo este día"), { target: { value: "2" } });
  await vi.waitFor(() => expect(hoja.textContent).toContain("Toca: Pierna (cambiado solo este día)"));
  const [url, init] = fetch.mock.calls[4];
  expect(url).toBe(`/api/plan/dias/${HOY}`);
  expect(JSON.parse(init.body)).toEqual({ rutina_id: 2 });
  expect(dia(HOY).getAttribute("aria-label")).toContain("Pierna");
});

test("un día cambiado se puede devolver al plan", async () => {
  const fetch = pintar(
    { semana: TODOS_PUSH, cambios: [{ fecha: HOY, rutina: null }] },
    { status: 204, body: null },
  );
  await vi.waitFor(() => expect(dia(HOY).getAttribute("aria-label")).toContain("descanso"));
  fireEvent.click(dia(HOY));
  const hoja = screen.getByRole("dialog");
  fireEvent.click(await within(hoja).findByRole("button", { name: "Volver al plan" }));
  await vi.waitFor(() => expect(hoja.textContent).toContain("Toca: Push"));
  expect(fetch).toHaveBeenLastCalledWith(`/api/plan/dias/${HOY}`, { method: "DELETE" });
});

test("un día pasado no se puede cambiar", async () => {
  pintar({ semana: TODOS_PUSH });
  await screen.findByRole("button", { name: "Mes anterior" });
  fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
  const pasado = screen.getAllByRole("button", { name: /no hecho/ })[0];
  fireEvent.click(pasado);
  const hoja = screen.getByRole("dialog");
  expect(hoja.textContent).toContain("Tocaba: Push");
  expect(within(hoja).queryByLabelText("Cambiar solo este día")).toBeNull();
});

test("editar el plan semanal", async () => {
  const fetch = pintar(
    {},
    { status: 200, body: { dias: [{ id: 1, nombre: "Push" }, null, { id: 2, nombre: "Pierna" }, null, null, null, null] } },
  );
  fireEvent.click(await screen.findByRole("button", { name: "Editar plan semanal" }));
  const hoja = screen.getByRole("dialog", { name: "Plan semanal" });
  expect((within(hoja).getByLabelText("Lunes") as HTMLSelectElement).value).toBe("descanso");
  fireEvent.change(within(hoja).getByLabelText("Lunes"), { target: { value: "1" } });
  fireEvent.change(within(hoja).getByLabelText("Miércoles"), { target: { value: "2" } });
  fireEvent.click(within(hoja).getByRole("button", { name: "Guardar plan" }));

  await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const [url, init] = fetch.mock.calls[4];
  expect(url).toBe("/api/plan/semana");
  expect(init.method).toBe("PUT");
  expect(JSON.parse(init.body)).toEqual({ dias: [1, null, 2, null, null, null, null] });
});

test("sin entrenos lo dice: al terminar un entreno se guarda solo", async () => {
  pintar({});
  expect(await screen.findByText(/al terminar un entreno se guarda aquí solo/)).toBeTruthy();
});
