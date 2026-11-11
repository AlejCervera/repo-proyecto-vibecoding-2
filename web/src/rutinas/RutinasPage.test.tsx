import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { RutinasPage } from "./RutinasPage";

afterEach(() => {
  window.location.hash = "";
});

const PECHO = {
  id: 1,
  nombre: "Pecho",
  predefinida: true,
  ejercicios: [
    { id: 10, nombre: "Press de banca" },
    { id: 11, nombre: "Aperturas" },
  ],
};
const MIA = { id: 7, nombre: "Mi pierna", predefinida: false, ejercicios: [{ id: 3, nombre: "Sentadilla" }] };

test("separa mis rutinas de las predefinidas, con enlace y número de ejercicios", async () => {
  simularFetch({ status: 200, body: [PECHO, MIA] });
  render(<RutinasPage onSesionCaducada={vi.fn()} />);

  const mias = await screen.findByRole("list", { name: "Mis rutinas" });
  expect(mias.textContent).toBe("Mi pierna1 ejercicio · SentadillaEmpezar");
  const predefinidas = screen.getByRole("list", { name: "Rutinas predefinidas" });
  expect(predefinidas.textContent).toBe("Pecho2 ejercicios · Press de banca y AperturasEmpezar");
  expect(within(predefinidas).getByRole("link", { name: "Pecho" }).getAttribute("href")).toBe("#/rutinas/1");
  // «Empezar» en cada tarjeta lleva directamente a entrenar esa rutina
  expect(within(predefinidas).getByRole("link", { name: "Empezar Pecho" }).getAttribute("href")).toBe(
    "#/rutinas/1/entrenar/0",
  );
});

test("una rutina sin ejercicios no ofrece «Empezar»", async () => {
  simularFetch({ status: 200, body: [{ ...MIA, ejercicios: [] }] });
  render(<RutinasPage onSesionCaducada={vi.fn()} />);
  const mias = await screen.findByRole("list", { name: "Mis rutinas" });
  expect(mias.textContent).toBe("Mi pierna0 ejercicios · Sin ejercicios todavía");
  expect(within(mias).queryByRole("link", { name: /Empezar/ })).toBeNull();
});

test("sin rutinas propias invita a crear o copiar", async () => {
  simularFetch({ status: 200, body: [PECHO] });
  render(<RutinasPage onSesionCaducada={vi.fn()} />);
  expect(await screen.findByText(/Aún no tienes rutinas/)).toBeTruthy();
});

test("crear una rutina lleva a su pantalla", async () => {
  const fetch = simularFetch(
    { status: 200, body: [] },
    { status: 201, body: { id: 9, nombre: "Pecho", predefinida: false, ejercicios: [] } },
  );
  render(<RutinasPage onSesionCaducada={vi.fn()} />);
  await screen.findByText(/Aún no tienes rutinas/);
  // El botón + flotante abre la hoja para crearla
  fireEvent.click(screen.getByRole("button", { name: "Crear rutina" }));
  const hoja = screen.getByRole("dialog", { name: "Nueva rutina" });
  fireEvent.change(within(hoja).getByLabelText("Nombre de la rutina"), { target: { value: "Pecho" } });
  fireEvent.click(within(hoja).getByRole("button", { name: "Crear" }));

  await vi.waitFor(() => expect(window.location.hash).toBe("#/rutinas/9"));
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ nombre: "Pecho" });
});

test("crear con un nombre repetido muestra el aviso", async () => {
  simularFetch(
    { status: 200, body: [MIA] },
    { status: 409, body: { error: "Ya tienes una rutina llamada «Mi pierna»" } },
  );
  render(<RutinasPage onSesionCaducada={vi.fn()} />);
  await screen.findByRole("list", { name: "Mis rutinas" });
  fireEvent.click(screen.getByRole("button", { name: "Crear rutina" }));
  const hoja = screen.getByRole("dialog", { name: "Nueva rutina" });
  fireEvent.change(within(hoja).getByLabelText("Nombre de la rutina"), { target: { value: "mi pierna" } });
  fireEvent.click(within(hoja).getByRole("button", { name: "Crear" }));
  // El aviso sale dentro de la hoja, que sigue abierta para corregir el nombre
  expect((await within(hoja).findByRole("alert")).textContent).toBe("Ya tienes una rutina llamada «Mi pierna»");
});
