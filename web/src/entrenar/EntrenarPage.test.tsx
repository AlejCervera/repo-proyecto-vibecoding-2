import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { hoyISO } from "../series/serie";
import { simularFetch } from "../test-setup";
import { EntrenarPage } from "./EntrenarPage";

const HOY = hoyISO();
const ANTES = "2020-01-15";

const ej = (id: number, nombre: string, series = 3, reps_min: number | null = 8, reps_max: number | null = 12) => ({
  id,
  nombre,
  series,
  reps_min,
  reps_max,
});
const RUTINA = {
  id: 7,
  nombre: "Pecho",
  predefinida: false,
  ejercicios: [ej(10, "Press de banca", 2), ej(11, "Aperturas", 3, null, null)],
};
const serie = (id: number, fecha: string, ejercicio_id: number, peso_kg: number, repeticiones: number) => ({
  id,
  fecha,
  ejercicio_id,
  ejercicio: ejercicio_id === 10 ? "Press de banca" : "Aperturas",
  peso_kg,
  repeticiones,
});
const BANCA_ANTES = [serie(2, ANTES, 10, 80, 6), serie(1, ANTES, 10, 80, 8)];
const historial = (id: number, nombre: string, series: unknown[]) => ({
  status: 200,
  body: { ejercicio: { id, nombre, propio: false, imagen: null }, series },
});

function pintar(paso: number | "fin", rutina: object, todas: unknown[], ...extra: { status: number; body: unknown }[]) {
  const fetch = simularFetch({ status: 200, body: rutina }, { status: 200, body: todas }, ...extra);
  render(<EntrenarPage rutinaId={7} paso={paso} onSesionCaducada={vi.fn()} />);
  return fetch;
}

const casillas = (paso: HTMLElement) =>
  within(within(paso).getByRole("list", { name: "Series de hoy" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent?.replace(/\s+/g, " ").trim());

test("muestra objetivo, la última vez y las casillas con la siguiente rellena", async () => {
  pintar(0, RUTINA, BANCA_ANTES, historial(10, "Press de banca", BANCA_ANTES));
  const paso = await screen.findByRole("article", { name: "Press de banca" });

  expect(paso.textContent).toContain("Objetivo: 2 × 8-12");
  expect(paso.textContent).toContain("La última vez (15/01/2020): 80 kg × 8 · 80 kg × 6");
  expect(casillas(paso)).toEqual([expect.stringContaining("▶ Serie 1"), "Serie 2"]);
  expect((within(paso).getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("80");
  expect((within(paso).getByLabelText("Repeticiones") as HTMLInputElement).value).toBe("6");
});

test("primera vez: el formulario propone el mínimo del objetivo", async () => {
  pintar(0, RUTINA, [], historial(10, "Press de banca", []));
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  expect((within(paso).getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("");
  expect((within(paso).getByLabelText("Repeticiones") as HTMLInputElement).value).toBe("8");
});

test("guardar todas las series marca el ejercicio como completado", async () => {
  const fetch = pintar(
    0,
    RUTINA,
    [],
    historial(10, "Press de banca", []),
    { status: 201, body: serie(20, HOY, 10, 60, 10) },
    { status: 201, body: serie(21, HOY, 10, 60, 9) },
  );
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  const indice = screen.getByRole("list", { name: "Ejercicios del entrenamiento" });
  expect(within(indice).getAllByRole("listitem")[0].textContent).toBe("Press de banca 0/2");

  fireEvent.change(within(paso).getByLabelText("Peso (kg)"), { target: { value: "60" } });
  fireEvent.change(within(paso).getByLabelText("Repeticiones"), { target: { value: "10" } });
  fireEvent.click(within(paso).getByRole("button", { name: "Guardar serie" }));
  await vi.waitFor(() => expect(casillas(paso)[0]).toBe("✓ Serie 1 · 60 kg × 10"));
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toMatchObject({ fecha: HOY, ejercicio_id: 10 });

  fireEvent.change(within(paso).getByLabelText("Repeticiones"), { target: { value: "9" } });
  fireEvent.click(within(paso).getByRole("button", { name: "Guardar serie" }));
  await vi.waitFor(() =>
    expect(casillas(paso)).toEqual(["✓ Serie 1 · 60 kg × 10", "✓ Serie 2 · 60 kg × 9"]),
  );
  expect(within(paso).getByRole("status").textContent).toBe("¡Ejercicio completado!");
  expect(within(paso).queryByRole("button", { name: "Guardar serie" })).toBeNull();
  expect(within(indice).getAllByRole("listitem")[0].textContent).toBe("Press de banca 2/2 ✓");
});

test("añadir y quitar series para hoy; no se puede quitar por debajo de las hechas", async () => {
  pintar(0, RUTINA, [serie(30, HOY, 10, 60, 10)], historial(10, "Press de banca", [serie(30, HOY, 10, 60, 10)]));
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  const quitar = within(paso).getByRole("button", { name: "− Quitar serie" }) as HTMLButtonElement;

  fireEvent.click(within(paso).getByRole("button", { name: "+ Añadir serie" }));
  expect(casillas(paso)).toHaveLength(3);
  expect(paso.textContent).toContain("Objetivo: 3 × 8-12");

  fireEvent.click(quitar);
  fireEvent.click(quitar);
  expect(casillas(paso)).toEqual(["✓ Serie 1 · 60 kg × 10"]);
  expect(quitar.disabled).toBe(true);
});

test("resumen: si cambiaste las series de una rutina tuya, ofrece guardarlas", async () => {
  sessionStorage.setItem(`gymlog-entreno-7-${HOY}`, JSON.stringify({ 10: 4 }));
  const actualizada = { ...RUTINA, ejercicios: [ej(10, "Press de banca", 4), RUTINA.ejercicios[1]] };
  const fetch = pintar("fin", RUTINA, [serie(3, HOY, 11, 12, 12)], { status: 200, body: actualizada });

  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(resumen.textContent).toContain("1 serie en total.");
  expect(resumen.textContent).toContain("Aperturas: 12 kg × 12");
  const cambios = within(resumen).getByRole("complementary", { name: "Cambios en la rutina" });
  expect(cambios.textContent).toContain("Press de banca: 2 → 4 series");

  fireEvent.click(within(cambios).getByRole("button", { name: "Guardar en la rutina" }));
  expect((await within(resumen).findByRole("status")).textContent).toBe("Guardado en la rutina «Pecho».");
  const [url, init] = fetch.mock.calls[2];
  expect(url).toBe("/api/rutinas/7/ejercicios/10");
  expect(JSON.parse(init.body)).toEqual({ series: 4 });
  expect(within(resumen).queryByRole("complementary")).toBeNull();
});

test("resumen de una predefinida: no ofrece guardar cambios", async () => {
  sessionStorage.setItem(`gymlog-entreno-7-${HOY}`, JSON.stringify({ 10: 4 }));
  pintar("fin", { ...RUTINA, predefinida: true }, []);
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(within(resumen).queryByRole("complementary")).toBeNull();
});

test("navegación entre pasos", async () => {
  pintar(1, RUTINA, [], historial(11, "Aperturas", []));
  await screen.findByRole("article", { name: "Aperturas" });
  const pasos = screen.getByRole("navigation", { name: "Pasos" });
  expect(within(pasos).getByRole("link", { name: "← Anterior" }).getAttribute("href")).toBe("#/rutinas/7/entrenar/0");
  expect(within(pasos).getByRole("link", { name: "Terminar" }).getAttribute("href")).toBe("#/rutinas/7/entrenar/fin");
});

test("rutina sin ejercicios: aviso", async () => {
  pintar(0, { ...RUTINA, ejercicios: [] }, []);
  expect(await screen.findByText(/no tiene ejercicios/)).toBeTruthy();
});
