import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { MisEjerciciosPage } from "./MisEjerciciosPage";

const REMO = { id: 5, nombre: "Remo maquina", num_series: 2 };
const CURL = { id: 6, nombre: "Curl martillo", num_series: 0 };

function fila(nombre: string) {
  return screen.getByRole("link", { name: nombre }).closest("li")!;
}

async function pintar(...respuestas: { status: number; body: unknown }[]) {
  const fetch = simularFetch({ status: 200, body: [CURL, REMO] }, ...respuestas);
  render(<MisEjerciciosPage onSesionCaducada={vi.fn()} />);
  await screen.findByRole("list", { name: "Mis ejercicios" });
  return fetch;
}

test("lista mis ejercicios con su número de series", async () => {
  await pintar();
  expect(fila("Remo maquina").textContent).toContain("(2 series)");
  expect(fila("Curl martillo").textContent).toContain("(0 series)");
});

test("crear un ejercicio nuevo recarga la lista", async () => {
  const fetch = await pintar(
    { status: 201, body: { id: 9, nombre: "Remo con goma", propio: true, imagen: null } },
    { status: 200, body: [CURL, REMO, { id: 9, nombre: "Remo con goma", num_series: 0 }] },
  );
  fireEvent.change(screen.getByLabelText("Nuevo ejercicio"), { target: { value: "Remo con goma" } });
  fireEvent.click(screen.getByRole("button", { name: "Crear" }));
  expect(await screen.findByRole("link", { name: "Remo con goma" })).toBeTruthy();
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ nombre: "Remo con goma" });
  expect((screen.getByLabelText("Nuevo ejercicio") as HTMLInputElement).value).toBe("");
});

test("crear uno que ya existe avisa y no lo crea", async () => {
  await pintar({
    status: 409,
    body: { error: "Ya existe «Press de banca»", ejercicio: { id: 1, nombre: "Press de banca" } },
  });
  fireEvent.change(screen.getByLabelText("Nuevo ejercicio"), { target: { value: "press de banca" } });
  fireEvent.click(screen.getByRole("button", { name: "Crear" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Ya existe «Press de banca»");
});

test("renombrar", async () => {
  const fetch = await pintar({
    status: 200,
    body: { id: 5, nombre: "Remo en máquina", propio: true, imagen: null },
  });
  fireEvent.click(within(fila("Remo maquina")).getByRole("button", { name: "Renombrar" }));
  fireEvent.change(screen.getByLabelText("Nuevo nombre"), { target: { value: "Remo en máquina" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));

  expect(await screen.findByRole("link", { name: "Remo en máquina" })).toBeTruthy();
  const [url, init] = fetch.mock.calls[1];
  expect(url).toBe("/api/ejercicios/5");
  expect(JSON.parse(init.body)).toEqual({ nombre: "Remo en máquina" });
});

test("renombrar a un nombre que ya existe muestra el aviso", async () => {
  await pintar({
    status: 409,
    body: { error: "Ya existe «Curl martillo»", ejercicio: { id: 6, nombre: "Curl martillo" } },
  });
  fireEvent.click(within(fila("Remo maquina")).getByRole("button", { name: "Renombrar" }));
  fireEvent.change(screen.getByLabelText("Nuevo nombre"), { target: { value: "curl martillo" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Ya existe «Curl martillo»");
});

test("borrar uno sin series pide una confirmación simple", async () => {
  const fetch = await pintar({ status: 204, body: null }, { status: 200, body: [REMO] });
  fireEvent.click(within(fila("Curl martillo")).getByRole("button", { name: "Borrar" }));
  expect(screen.getByText("¿Borrar «Curl martillo»?", { exact: false })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }));
  await vi.waitFor(() => expect(screen.queryByRole("link", { name: "Curl martillo" })).toBeNull());
  expect(fetch).toHaveBeenNthCalledWith(2, "/api/ejercicios/6", { method: "DELETE" });
});

test("borrar uno con series: borrarlas también", async () => {
  const fetch = await pintar({ status: 204, body: null }, { status: 200, body: [CURL] });
  fireEvent.click(within(fila("Remo maquina")).getByRole("button", { name: "Borrar" }));
  expect(screen.getByText(/tiene 2 series\. ¿Qué hacemos con ellas\?/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Borrarlas también" }));
  await vi.waitFor(() => expect(screen.queryByRole("link", { name: "Remo maquina" })).toBeNull());
  expect(fetch).toHaveBeenNthCalledWith(2, "/api/ejercicios/5?series=borrar", {
    method: "DELETE",
  });
});

test("borrar uno con series: pasarlas a otro ejercicio y ver el contador actualizado", async () => {
  const destino = { id: 6, nombre: "Curl martillo", propio: true, imagen: null };
  const fetch = await pintar(
    { status: 200, body: [destino] },
    { status: 204, body: null },
    { status: 200, body: [{ ...CURL, num_series: 2 }] }, // la lista se vuelve a pedir
  );
  fireEvent.click(within(fila("Remo maquina")).getByRole("button", { name: "Borrar" }));
  fireEvent.click(screen.getByRole("button", { name: "Pasarlas a otro ejercicio…" }));
  fireEvent.change(screen.getByLabelText("Pasar a"), { target: { value: "curl" } });
  fireEvent.click(await screen.findByRole("button", { name: "Curl martillo" }));
  fireEvent.click(screen.getByRole("button", { name: "Pasar las series y borrar «Remo maquina»" }));

  await vi.waitFor(() => expect(fila("Curl martillo").textContent).toContain("(2 series)"));
  expect(screen.queryByRole("link", { name: "Remo maquina" })).toBeNull();
  expect(fetch).toHaveBeenNthCalledWith(3, "/api/ejercicios/5?mover_a=6", { method: "DELETE" });
});

test("borrar uno con series: pasarlas a otro ejercicio", async () => {
  const destino = { id: 9, nombre: "Remo en máquina", propio: false, imagen: null };
  const fetch = await pintar(
    { status: 200, body: [destino] },
    { status: 204, body: null },
    { status: 200, body: [CURL] },
  );
  fireEvent.click(within(fila("Remo maquina")).getByRole("button", { name: "Borrar" }));
  fireEvent.click(screen.getByRole("button", { name: "Pasarlas a otro ejercicio…" }));

  const pasar = screen.getByRole("button", { name: "Pasar las series y borrar «Remo maquina»" });
  expect((pasar as HTMLButtonElement).disabled).toBe(true); // hasta elegir destino

  fireEvent.change(screen.getByLabelText("Pasar a"), { target: { value: "remo en" } });
  fireEvent.click(await screen.findByRole("button", { name: "Remo en máquina" }));
  fireEvent.click(pasar);

  await vi.waitFor(() => expect(screen.queryByRole("link", { name: "Remo maquina" })).toBeNull());
  expect(fetch).toHaveBeenNthCalledWith(3, "/api/ejercicios/5?mover_a=9", { method: "DELETE" });
});

test("cancelar el borrado no envía nada", async () => {
  const fetch = await pintar();
  fireEvent.click(within(fila("Remo maquina")).getByRole("button", { name: "Borrar" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(within(fila("Remo maquina")).getByRole("button", { name: "Borrar" })).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
});
