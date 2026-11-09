import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { AuthScreen } from "./AuthScreen";

function escribir(etiqueta: string, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

test("inicia sesión con usuario y contraseña", async () => {
  const fetch = simularFetch({ status: 200, body: { id: 1, nombre_usuario: "ana" } });
  const onEntrar = vi.fn();
  render(<AuthScreen onEntrar={onEntrar} />);

  expect(screen.queryByLabelText("Código de invitación")).toBeNull();
  escribir("Usuario", "ana");
  escribir("Contraseña", "secreta123");
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

  await vi.waitFor(() => expect(onEntrar).toHaveBeenCalledWith({ id: 1, nombre_usuario: "ana" }));
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/auth/login");
  expect(JSON.parse(init.body)).toEqual({ nombre_usuario: "ana", password: "secreta123" });
});

test("el registro pide y envía el código de invitación", async () => {
  const fetch = simularFetch({ status: 201, body: { id: 2, nombre_usuario: "bea" } });
  const onEntrar = vi.fn();
  render(<AuthScreen onEntrar={onEntrar} />);

  fireEvent.click(screen.getByRole("button", { name: "Crear una cuenta" }));
  escribir("Usuario", "bea");
  escribir("Contraseña", "secreta123");
  escribir("Código de invitación", "abc");
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

  await vi.waitFor(() => expect(onEntrar).toHaveBeenCalled());
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/auth/registro");
  expect(JSON.parse(init.body)).toEqual({
    nombre_usuario: "bea",
    password: "secreta123",
    codigo_invitacion: "abc",
  });
});

test("muestra el error de la API y no entra", async () => {
  simularFetch({ status: 401, body: { error: "Usuario o contraseña incorrectos" } });
  const onEntrar = vi.fn();
  render(<AuthScreen onEntrar={onEntrar} />);

  escribir("Usuario", "ana");
  escribir("Contraseña", "mala");
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Usuario o contraseña incorrectos");
  expect(onEntrar).not.toHaveBeenCalled();
});
