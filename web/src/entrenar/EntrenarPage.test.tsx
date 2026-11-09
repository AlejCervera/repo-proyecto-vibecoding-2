import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { hoyISO } from "../series/serie";
import { simularFetch } from "../test-setup";
import { EntrenarPage } from "./EntrenarPage";

const HOY = hoyISO();
const ANTES = "2020-01-15";

const RUTINA = {
  id: 7,
  nombre: "Pecho",
  predefinida: true,
  ejercicios: [
    { id: 10, nombre: "Press de banca" },
    { id: 11, nombre: "Aperturas" },
  ],
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

function pintar(paso: number | "fin", ...extra: { status: number; body: unknown }[]) {
  const fetch = simularFetch(
    { status: 200, body: RUTINA },
    { status: 200, body: [...BANCA_ANTES, serie(3, HOY, 11, 12, 12)] },
    ...extra,
  );
  render(<EntrenarPage rutinaId={7} paso={paso} onSesionCaducada={vi.fn()} />);
  return fetch;
}

test("muestra la última vez, lo de hoy y el formulario relleno con la última serie", async () => {
  pintar(0, historial(10, "Press de banca", BANCA_ANTES));
  const paso = await screen.findByRole("article", { name: "Press de banca" });

  expect(paso.textContent).toContain("La última vez (15/01/2020): 80 kg × 8 · 80 kg × 6");
  expect(within(paso).getByLabelText("Series de hoy").textContent).toBe("Hoy: aún ninguna");
  expect((within(paso).getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("80");
  expect((within(paso).getByLabelText("Repeticiones") as HTMLInputElement).value).toBe("6");
});

test("el índice marca el ejercicio actual y cuenta las series de hoy", async () => {
  pintar(0, historial(10, "Press de banca", BANCA_ANTES));
  await screen.findByRole("article", { name: "Press de banca" });
  const indice = screen.getByRole("list", { name: "Ejercicios del entrenamiento" });
  const items = within(indice).getAllByRole("listitem").map((li) => li.textContent);
  expect(items).toEqual(["Press de banca", "Aperturas ✓1"]);
  expect(within(indice).getByRole("link", { current: "step" }).textContent).toBe("Press de banca");
});

test("guardar registra la serie de hoy con el ejercicio correcto y la suma al índice", async () => {
  const nueva = serie(20, HOY, 10, 82.5, 6);
  const fetch = pintar(0, historial(10, "Press de banca", BANCA_ANTES), { status: 201, body: nueva });
  const paso = await screen.findByRole("article", { name: "Press de banca" });

  fireEvent.change(within(paso).getByLabelText("Peso (kg)"), { target: { value: "82,5" } });
  fireEvent.click(within(paso).getByRole("button", { name: "Guardar serie" }));

  await vi.waitFor(() =>
    expect(within(paso).getByLabelText("Series de hoy").textContent).toBe("Hoy: 82,5 kg × 6"),
  );
  const [url, init] = fetch.mock.calls[3];
  expect(url).toBe("/api/series");
  expect(JSON.parse(init.body)).toEqual({
    fecha: HOY,
    ejercicio_id: 10,
    peso_kg: "82,5",
    repeticiones: "6",
  });
  const indice = screen.getByRole("list", { name: "Ejercicios del entrenamiento" });
  expect(within(indice).getAllByRole("listitem")[0].textContent).toBe("Press de banca ✓1");
});

test("primera vez con un ejercicio: formulario vacío; último paso ofrece «Terminar»", async () => {
  pintar(1, historial(11, "Aperturas", []));
  const paso = await screen.findByRole("article", { name: "Aperturas" });
  expect(paso.textContent).toContain("Primera vez con este ejercicio.");
  expect((within(paso).getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("");
  const pasos = screen.getByRole("navigation", { name: "Pasos" });
  expect(within(pasos).getByRole("link", { name: "← Anterior" }).getAttribute("href")).toBe(
    "#/rutinas/7/entrenar/0",
  );
  expect(within(pasos).getByRole("link", { name: "Terminar" }).getAttribute("href")).toBe(
    "#/rutinas/7/entrenar/fin",
  );
});

test("el primer paso ofrece «Siguiente» y no «Anterior»", async () => {
  pintar(0, historial(10, "Press de banca", []));
  await screen.findByRole("article", { name: "Press de banca" });
  const pasos = screen.getByRole("navigation", { name: "Pasos" });
  expect(within(pasos).queryByRole("link", { name: "← Anterior" })).toBeNull();
  expect(within(pasos).getByRole("link", { name: "Siguiente →" }).getAttribute("href")).toBe(
    "#/rutinas/7/entrenar/1",
  );
});

test("resumen: series de hoy por ejercicio", async () => {
  pintar("fin");
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(resumen.textContent).toContain("1 serie en total.");
  expect(resumen.textContent).toContain("Press de banca: sin series");
  expect(resumen.textContent).toContain("Aperturas: 12 kg × 12");
});

test("rutina sin ejercicios: aviso", async () => {
  simularFetch({ status: 200, body: { ...RUTINA, ejercicios: [] } }, { status: 200, body: [] });
  render(<EntrenarPage rutinaId={7} paso={0} onSesionCaducada={vi.fn()} />);
  expect(await screen.findByText(/no tiene ejercicios/)).toBeTruthy();
});
