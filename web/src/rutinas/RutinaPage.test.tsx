import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { RutinaPage } from "./RutinaPage";

afterEach(() => {
  window.location.hash = "";
});

const ej = (id: number, nombre: string) => ({ id, nombre });
const PREDEFINIDA = {
  id: 1,
  nombre: "Pecho",
  predefinida: true,
  ejercicios: [ej(10, "Press de banca"), ej(11, "Aperturas")],
};
const MIA = { ...PREDEFINIDA, id: 7, nombre: "Mi pecho", predefinida: false };

async function pintar(rutina: object, ...respuestas: { status: number; body: unknown }[]) {
  const fetch = simularFetch({ status: 200, body: rutina }, ...respuestas);
  render(<RutinaPage rutinaId={(rutina as { id: number }).id} onSesionCaducada={vi.fn()} />);
  await screen.findByRole("heading", { level: 2 });
  return fetch;
}

const nombres = () =>
  within(screen.getByRole("list", { name: "Ejercicios de la rutina" }))
    .getAllByRole("link")
    .map((a) => a.textContent);

test("predefinida: muestra sus ejercicios en orden, sin botones de edición", async () => {
  await pintar(PREDEFINIDA);
  expect(nombres()).toEqual(["Press de banca", "Aperturas"]);
  for (const nombre of ["Renombrar", "Borrar rutina", "Añadir ejercicio", /Quitar/, /Subir/]) {
    expect(screen.queryByRole("button", { name: nombre })).toBeNull();
  }
  expect(screen.getByText("Rutina predefinida: no se puede modificar.")).toBeTruthy();
});

test("predefinida: copiar lleva a la copia", async () => {
  const fetch = await pintar(PREDEFINIDA, { status: 201, body: { ...MIA, id: 15 } });
  fireEvent.click(screen.getByRole("button", { name: "Copiar a mis rutinas" }));
  await vi.waitFor(() => expect(window.location.hash).toBe("#/rutinas/15"));
  expect(fetch).toHaveBeenLastCalledWith("/api/rutinas/1/copiar", { method: "POST" });
});

test("propia: bajar un ejercicio envía el nuevo orden", async () => {
  const reordenada = { ...MIA, ejercicios: [ej(11, "Aperturas"), ej(10, "Press de banca")] };
  const fetch = await pintar(MIA, { status: 200, body: reordenada });
  expect((screen.getByRole("button", { name: "Subir Press de banca" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Bajar Press de banca" }));

  await vi.waitFor(() => expect(nombres()).toEqual(["Aperturas", "Press de banca"]));
  const [url, init] = fetch.mock.calls[1];
  expect(url).toBe("/api/rutinas/7/orden");
  expect(init.method).toBe("PUT");
  expect(JSON.parse(init.body)).toEqual({ ejercicios: [11, 10] });
});

test("propia: quitar un ejercicio", async () => {
  const fetch = await pintar(MIA, { status: 200, body: { ...MIA, ejercicios: [ej(10, "Press de banca")] } });
  fireEvent.click(screen.getByRole("button", { name: "Quitar Aperturas" }));
  await vi.waitFor(() => expect(nombres()).toEqual(["Press de banca"]));
  expect(fetch).toHaveBeenLastCalledWith("/api/rutinas/7/ejercicios/11", { method: "DELETE" });
});

test("propia: añadir un ejercicio con el buscador", async () => {
  const sentadilla = { id: 3, nombre: "Sentadilla", propio: false, imagen: null };
  const fetch = await pintar(
    MIA,
    { status: 200, body: [sentadilla] },
    { status: 200, body: { ...MIA, ejercicios: [...MIA.ejercicios, ej(3, "Sentadilla")] } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Añadir ejercicio" }));
  const anadir = screen.getByRole("button", { name: "Añadir a la rutina" }) as HTMLButtonElement;
  expect(anadir.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Ejercicio a añadir"), { target: { value: "senta" } });
  fireEvent.click(await screen.findByRole("button", { name: "Sentadilla" }));
  fireEvent.click(anadir);

  await vi.waitFor(() => expect(nombres()).toEqual(["Press de banca", "Aperturas", "Sentadilla"]));
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ ejercicio_id: 3 });
});

test("propia: añadir uno repetido muestra el aviso", async () => {
  await pintar(
    MIA,
    { status: 200, body: [{ id: 10, nombre: "Press de banca", propio: false, imagen: null }] },
    { status: 409, body: { error: "Ese ejercicio ya está en la rutina" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Añadir ejercicio" }));
  fireEvent.change(screen.getByLabelText("Ejercicio a añadir"), { target: { value: "press" } });
  const sugerencias = await screen.findByRole("list", { name: "Sugerencias" });
  fireEvent.click(within(sugerencias).getByRole("button", { name: "Press de banca" }));
  fireEvent.click(screen.getByRole("button", { name: "Añadir a la rutina" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Ese ejercicio ya está en la rutina");
});

test("propia: renombrar", async () => {
  await pintar(MIA, { status: 200, body: { ...MIA, nombre: "Pecho y tríceps" } });
  fireEvent.click(screen.getByRole("button", { name: "Renombrar" }));
  fireEvent.change(screen.getByLabelText("Nuevo nombre"), { target: { value: "Pecho y tríceps" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));
  expect(await screen.findByRole("heading", { name: "Pecho y tríceps" })).toBeTruthy();
});

test("propia: borrar pide confirmación y vuelve a la lista", async () => {
  const fetch = await pintar(MIA, { status: 204, body: null });
  fireEvent.click(screen.getByRole("button", { name: "Borrar rutina" }));
  expect(screen.getByText(/Tus series no se borran/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }));
  await vi.waitFor(() => expect(window.location.hash).toBe("#/rutinas"));
  expect(fetch).toHaveBeenLastCalledWith("/api/rutinas/7", { method: "DELETE" });
});

test("rutina que no existe: aviso", async () => {
  simularFetch({ status: 404, body: { error: "La rutina no existe" } });
  render(<RutinaPage rutinaId={99} onSesionCaducada={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toBe("La rutina no existe");
});
