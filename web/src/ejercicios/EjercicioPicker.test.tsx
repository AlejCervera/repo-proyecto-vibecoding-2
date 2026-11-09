import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test } from "vitest";
import { simularFetch } from "../test-setup";
import type { Ejercicio } from "./ejercicio";
import { EjercicioPicker } from "./EjercicioPicker";

const BANCA = { id: 1, nombre: "Press de banca", propio: false };
const MILITAR = { id: 2, nombre: "Press militar", propio: false };

function Envoltorio() {
  const [valor, setValor] = useState<Ejercicio | null>(null);
  return <EjercicioPicker value={valor} onChange={setValor} />;
}

function escribir(texto: string) {
  fireEvent.change(screen.getByLabelText("Ejercicio"), { target: { value: texto } });
}

test("busca y elige un ejercicio del catálogo", async () => {
  const fetch = simularFetch({ status: 200, body: [BANCA, MILITAR] });
  render(<Envoltorio />);

  escribir("press");
  fireEvent.click(await screen.findByRole("button", { name: "Press militar" }));

  expect(screen.getByText("Press militar").tagName).toBe("STRONG");
  expect(fetch).toHaveBeenCalledWith("/api/ejercicios?q=press", undefined);

  fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
  expect(screen.getByLabelText("Ejercicio")).toBeTruthy();
});

test("no ofrece crear si el texto coincide con uno existente", async () => {
  simularFetch({ status: 200, body: [BANCA] });
  render(<Envoltorio />);
  escribir("press de BÁNCA");
  await screen.findByRole("button", { name: "Press de banca" });
  expect(screen.queryByRole("button", { name: /como ejercicio propio/ })).toBeNull();
});

test("crea un ejercicio propio si no existe", async () => {
  const nuevo = { id: 9, nombre: "Remo en máquina", propio: true };
  const fetch = simularFetch({ status: 200, body: [] }, { status: 201, body: nuevo });
  render(<Envoltorio />);

  escribir("Remo en máquina");
  fireEvent.click(
    await screen.findByRole("button", { name: "Crear «Remo en máquina» como ejercicio propio" }),
  );

  expect((await screen.findByText("Remo en máquina")).tagName).toBe("STRONG");
  const [url, init] = fetch.mock.calls[1];
  expect(url).toBe("/api/ejercicios");
  expect(JSON.parse(init.body)).toEqual({ nombre: "Remo en máquina" });
});

test("si ya existe, avisa y ofrece usar el existente", async () => {
  simularFetch(
    { status: 200, body: [] },
    { status: 409, body: { error: "Ya existe «Press de banca»", ejercicio: BANCA } },
  );
  render(<Envoltorio />);

  escribir("pres de banca");
  fireEvent.click(await screen.findByRole("button", { name: /como ejercicio propio/ }));

  expect((await screen.findByRole("alert")).textContent).toContain("Ya existe «Press de banca»");
  fireEvent.click(screen.getByRole("button", { name: "Usar «Press de banca»" }));
  expect(screen.getByText("Press de banca").tagName).toBe("STRONG");
});
