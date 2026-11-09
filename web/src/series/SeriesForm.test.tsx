import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { SeriesForm } from "./SeriesForm";

function rellenar(campos: Record<string, string>) {
  for (const [etiqueta, valor] of Object.entries(campos)) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  }
}

test("envía la serie y avisa al padre", async () => {
  const creada = { id: 7, fecha: "2026-11-09", ejercicio: "Press banca", peso_kg: 80, repeticiones: 8 };
  const fetch = simularFetch({ status: 201, body: creada });
  const onCreada = vi.fn();
  render(<SeriesForm onCreada={onCreada} />);

  rellenar({ Fecha: "2026-11-09", Ejercicio: "Press banca", "Peso (kg)": "80", Repeticiones: "8" });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await vi.waitFor(() => expect(onCreada).toHaveBeenCalledWith(creada));
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/series");
  expect(JSON.parse(init.body)).toEqual({
    fecha: "2026-11-09",
    ejercicio: "Press banca",
    peso_kg: "80",
    repeticiones: "8",
  });
  expect((screen.getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Ejercicio") as HTMLInputElement).value).toBe("Press banca");
});

test("muestra el aviso de la API si la serie no es válida", async () => {
  simularFetch({ status: 400, body: { error: "Falta el peso" } });
  const onCreada = vi.fn();
  render(<SeriesForm onCreada={onCreada} />);

  rellenar({ Ejercicio: "Press banca", Repeticiones: "8" });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Falta el peso");
  expect(onCreada).not.toHaveBeenCalled();
});
