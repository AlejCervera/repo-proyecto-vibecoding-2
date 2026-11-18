// Fase 9g al entrenar: superseries, notas por serie y calculadora de discos.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { hoyISO } from "../series/serie";
import { simularFetch } from "../test-setup";
import { EntrenarPage } from "./EntrenarPage";
import { HojaDiscos } from "./HojaDiscos";

const HOY = hoyISO();
const ej = (id: number, nombre: string, con_siguiente = false) => ({
  id,
  nombre,
  series: 2,
  reps_min: 8,
  reps_max: 12,
  con_siguiente,
});
/** Remo (10) + Press (11) en superserie; Curl (12) suelto. */
const RUTINA = { id: 7, nombre: "Torso", predefinida: false, ejercicios: [ej(10, "Remo", true), ej(11, "Press"), ej(12, "Curl")] };
const serie = (id: number, fecha: string, ejercicio_id: number, nota: string | null = null) => ({
  id,
  fecha,
  ejercicio_id,
  ejercicio: "Remo",
  peso_kg: 60,
  repeticiones: 10,
  nota,
});
const historial = (id: number, nombre: string, series: unknown[] = []) => ({
  status: 200,
  body: { ejercicio: { id, nombre, propio: false, imagen: null }, series },
});
const hecha = () => screen.getByRole("button", { name: "Hecha · empezar descanso" });

function pintar(paso: number, ...respuestas: { status: number; body: unknown }[]) {
  const fetch = simularFetch({ status: 200, body: RUTINA }, { status: 200, body: [] }, ...respuestas);
  render(<EntrenarPage rutinaId={7} paso={paso} onSesionCaducada={vi.fn()} />);
  return fetch;
}

afterEach(() => {
  window.location.hash = "";
});

// --- Superseries -------------------------------------------------------------------------------

test("en el 1.º de la superserie, «Hecha» pasa al 2.º sin descanso", async () => {
  pintar(0, historial(10, "Remo"), { status: 201, body: serie(30, HOY, 10) });
  const paso = await screen.findByRole("article", { name: "Remo" });
  expect(within(paso).getByText(/Superserie 1 de 2/).parentElement!.textContent).toBe("Superserie 1 de 2 con Press");
  fireEvent.change(within(paso).getByLabelText("Peso (kg)"), { target: { value: "60" } });
  fireEvent.click(hecha());
  await vi.waitFor(() => expect(window.location.hash).toBe("#/rutinas/7/entrenar/1"));
  expect(screen.queryByRole("timer")).toBeNull();
});

test("en el 2.º de la superserie, «Hecha» empieza el descanso y vuelve al 1.º", async () => {
  pintar(1, historial(11, "Press"), { status: 201, body: serie(31, HOY, 11) });
  const paso = await screen.findByRole("article", { name: "Press" });
  expect(within(paso).getByText(/Superserie 2 de 2/)).toBeTruthy();
  fireEvent.change(within(paso).getByLabelText("Peso (kg)"), { target: { value: "40" } });
  fireEvent.click(hecha());
  expect(await screen.findByRole("timer")).toBeTruthy();
  expect(window.location.hash).toBe("#/rutinas/7/entrenar/0");
});

test("un ejercicio suelto descansa y se queda donde está", async () => {
  pintar(2, historial(12, "Curl"), { status: 201, body: serie(32, HOY, 12) });
  const paso = await screen.findByRole("article", { name: "Curl" });
  expect(within(paso).queryByText(/Superserie/)).toBeNull();
  fireEvent.change(within(paso).getByLabelText("Peso (kg)"), { target: { value: "12" } });
  fireEvent.click(hecha());
  expect(await screen.findByRole("timer")).toBeTruthy();
  expect(window.location.hash).toBe("");
});

// --- Notas -------------------------------------------------------------------------------------

test("tocar una serie hecha permite anotarla; la píldora lo indica", async () => {
  const fetch = pintar(
    2,
    historial(12, "Curl", [serie(40, HOY, 12)]),
    { status: 200, body: serie(40, HOY, 12, "agarre cerrado") },
  );
  const paso = await screen.findByRole("article", { name: "Curl" });
  fireEvent.click(within(paso).getByRole("button", { name: /Serie 1/ }));
  const hoja = screen.getByRole("dialog", { name: "Nota de la serie 1" });
  fireEvent.change(within(hoja).getByLabelText("Nota"), { target: { value: "agarre cerrado" } });
  expect(within(hoja).getByText("14 / 200")).toBeTruthy();
  fireEvent.click(within(hoja).getByRole("button", { name: "Guardar nota" }));

  await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const [url, init] = fetch.mock.calls[3];
  expect([url, init.method, JSON.parse(init.body)]).toEqual(["/api/series/40/nota", "PUT", { nota: "agarre cerrado" }]);
  expect(within(paso).getByRole("button", { name: /con nota/ })).toBeTruthy();
});

test("las notas de la última vez salen al entrenar", async () => {
  pintar(2, historial(12, "Curl", [serie(41, "2020-01-15", 12, "molestia en el codo"), serie(42, "2020-01-15", 12)]));
  const notas = await screen.findByRole("list", { name: "Notas de la última vez" });
  expect(within(notas).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "60 kg × 10: «molestia en el codo»",
  ]);
});

// --- Discos ------------------------------------------------------------------------------------

test("discos: 100 kg con la barra de 20 del perfil → 25 · 15 por lado", async () => {
  simularFetch({ status: 200, body: { altura_cm: null, peso_corporal_kg: null, barra_kg: 20 } });
  render(<HojaDiscos peso={100} onCerrar={vi.fn()} />);
  expect((await screen.findByText(/Por lado/)).parentElement!.textContent).toBe("Por lado: 25 · 15");
  expect(screen.queryByRole("status")).toBeNull(); // exacto
});

test("discos: con barra de 15 y un peso que no cuadra, dice lo más cercano", async () => {
  simularFetch({ status: 200, body: { altura_cm: null, peso_corporal_kg: null, barra_kg: 15 } });
  render(<HojaDiscos peso={61} onCerrar={vi.fn()} />);
  expect((await screen.findByText(/Por lado/)).parentElement!.textContent).toBe("Por lado: 20 · 2,5");
  expect(screen.getByRole("status").textContent).toBe("No se puede cargar exacto: lo más cercano es 60 kg.");
});

test("discos: sin peso escrito, o menos que la barra", async () => {
  simularFetch({ status: 200, body: { altura_cm: null, peso_corporal_kg: null, barra_kg: 20 } });
  const { unmount } = render(<HojaDiscos peso={null} onCerrar={vi.fn()} />);
  expect(screen.getByText("Escribe primero el peso de la serie.")).toBeTruthy();
  unmount();
  render(<HojaDiscos peso={15} onCerrar={vi.fn()} />);
  expect((await screen.findByText(/sin discos/)).parentElement!.textContent).toBe("15 kg con una barra de 20 kg: sin discos.");
});

test("el botón «Discos» abre la hoja con el peso escrito", async () => {
  pintar(2, historial(12, "Curl"), { status: 200, body: { altura_cm: null, peso_corporal_kg: null, barra_kg: 20 } });
  const paso = await screen.findByRole("article", { name: "Curl" });
  fireEvent.change(within(paso).getByLabelText("Peso (kg)"), { target: { value: "60" } });
  fireEvent.click(within(paso).getByRole("button", { name: "Discos" }));
  const hoja = screen.getByRole("dialog", { name: "Discos por lado" });
  expect((await within(hoja).findByText(/Por lado/)).parentElement!.textContent).toBe("Por lado: 20");
});
