import { fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { leerNumero } from "./perfil";
import { PerfilPage } from "./PerfilPage";

test("leerNumero", () => {
  expect(leerNumero("")).toBeNull();
  expect(leerNumero(" 80,5 ")).toBe(80.5);
  expect(leerNumero("178")).toBe(178);
  expect(() => leerNumero("abc")).toThrow("Escribe un número");
});

const valor = (etiqueta: string) => (screen.getByLabelText(etiqueta) as HTMLInputElement).value;
const CUENTA = { usuario: { id: 1, nombre_usuario: "ana" }, onSalir: vi.fn() };

test("muestra la cuenta y «Cerrar sesión» llama a onSalir", async () => {
  simularFetch({ status: 200, body: { altura_cm: null, peso_corporal_kg: null } });
  const onSalir = vi.fn();
  render(<PerfilPage usuario={CUENTA.usuario} onSalir={onSalir} onSesionCaducada={vi.fn()} />);
  expect(screen.getByText("ana").tagName).toBe("STRONG");
  expect(screen.getByRole("link", { name: "wger.de" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(onSalir).toHaveBeenCalledOnce();
  await screen.findByLabelText("Altura (cm)");
});

test("muestra el perfil guardado y guarda los cambios", async () => {
  const fetch = simularFetch(
    { status: 200, body: { altura_cm: 178, peso_corporal_kg: 80.5 } },
    { status: 200, body: { altura_cm: 178, peso_corporal_kg: 79 } },
  );
  render(<PerfilPage {...CUENTA} onSesionCaducada={vi.fn()} />);
  await screen.findByLabelText("Altura (cm)");
  expect(valor("Altura (cm)")).toBe("178");
  expect(valor("Peso corporal (kg)")).toBe("80,5");

  fireEvent.change(screen.getByLabelText("Peso corporal (kg)"), { target: { value: "79" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));
  expect((await screen.findByRole("status")).textContent).toBe("Perfil guardado.");
  const [url, init] = fetch.mock.calls[1];
  expect(url).toBe("/api/perfil");
  expect(init.method).toBe("PUT");
  expect(JSON.parse(init.body)).toEqual({ altura_cm: 178, peso_corporal_kg: 79 });
});

test("perfil vacío y error de la API", async () => {
  simularFetch(
    { status: 200, body: { altura_cm: null, peso_corporal_kg: null } },
    { status: 400, body: { error: "La altura debe ser un número entero entre 100 y 250 cm" } },
  );
  render(<PerfilPage {...CUENTA} onSesionCaducada={vi.fn()} />);
  await screen.findByLabelText("Altura (cm)");
  expect(valor("Altura (cm)")).toBe("");
  fireEvent.change(screen.getByLabelText("Altura (cm)"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));
  expect((await screen.findByRole("alert")).textContent).toContain("entre 100 y 250");
});

test("sin sesión avisa a la app", async () => {
  simularFetch({ status: 401, body: { error: "Inicia sesión para continuar" } });
  const caducada = vi.fn();
  render(<PerfilPage {...CUENTA} onSesionCaducada={caducada} />);
  await vi.waitFor(() => expect(caducada).toHaveBeenCalled());
});

test("una carga que llega tarde no borra lo que ya has escrito", async () => {
  // En desarrollo (StrictMode) la carga se lanza dos veces; la primera puede responder la última.
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  let responderPrimera: (r: Response) => void = () => {};
  const fetch = vi
    .fn()
    .mockReturnValueOnce(new Promise<Response>((r) => (responderPrimera = r)))
    .mockResolvedValueOnce(json({ altura_cm: 178, peso_corporal_kg: 80 }));
  vi.stubGlobal("fetch", fetch);
  render(
    <StrictMode>
      <PerfilPage {...CUENTA} onSesionCaducada={vi.fn()} />
    </StrictMode>,
  );
  await vi.waitFor(() => expect(valor("Altura (cm)")).toBe("178"));
  fireEvent.change(screen.getByLabelText("Altura (cm)"), { target: { value: "180" } });

  responderPrimera(json({ altura_cm: null, peso_corporal_kg: null }));
  await new Promise((r) => setTimeout(r, 20));
  expect(valor("Altura (cm)")).toBe("180");
});
