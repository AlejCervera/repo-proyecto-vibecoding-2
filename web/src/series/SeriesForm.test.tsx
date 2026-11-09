import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { SeriesForm } from "./SeriesForm";

const BANCA = { id: 1, nombre: "Press de banca", propio: false };

function rellenar(campos: Record<string, string>) {
  for (const [etiqueta, valor] of Object.entries(campos)) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  }
}

test("envía la serie con el ejercicio elegido y lo mantiene para la siguiente", async () => {
  const creada = {
    id: 7,
    fecha: "2026-11-09",
    ejercicio_id: 1,
    ejercicio: "Press de banca",
    peso_kg: 80,
    repeticiones: 8,
  };
  const fetch = simularFetch({ status: 200, body: [BANCA] }, { status: 201, body: creada });
  const onCreada = vi.fn();
  render(<SeriesForm onCreada={onCreada} />);

  rellenar({ Fecha: "2026-11-09", Ejercicio: "press" });
  fireEvent.click(await screen.findByRole("button", { name: "Press de banca" }));
  rellenar({ "Peso (kg)": "80", Repeticiones: "8" });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await vi.waitFor(() => expect(onCreada).toHaveBeenCalledWith(creada));
  const [url, init] = fetch.mock.calls[1];
  expect(url).toBe("/api/series");
  expect(JSON.parse(init.body)).toEqual({
    fecha: "2026-11-09",
    ejercicio_id: 1,
    peso_kg: "80",
    repeticiones: "8",
  });
  expect((screen.getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("");
  expect(screen.getByText("Press de banca").tagName).toBe("STRONG");
});

test("si cambias de ejercicio mientras se guarda, la respuesta no vuelve a poner el anterior", async () => {
  let responder!: (r: Response) => void;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json([BANCA]))
    .mockReturnValueOnce(new Promise<Response>((ok) => (responder = ok)));
  vi.stubGlobal("fetch", fetch);
  render(<SeriesForm onCreada={vi.fn()} />);

  rellenar({ Ejercicio: "press" });
  fireEvent.click(await screen.findByRole("button", { name: "Press de banca" }));
  rellenar({ "Peso (kg)": "80", Repeticiones: "8" });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  // Antes de que llegue la respuesta, el usuario pulsa «Cambiar»
  fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
  expect(screen.getByLabelText("Ejercicio")).toBeTruthy();

  responder(
    Response.json(
      { id: 1, fecha: "2026-11-09", ejercicio_id: 1, ejercicio: "Press de banca", peso_kg: 80, repeticiones: 8 },
      { status: 201 },
    ),
  );
  await vi.waitFor(() =>
    expect((screen.getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe(""),
  );
  expect(screen.getByLabelText("Ejercicio")).toBeTruthy(); // sigue buscando, no vuelve «Press de banca»
});

test("muestra el aviso de la API si la serie no es válida", async () => {
  simularFetch({ status: 400, body: { error: "Falta el ejercicio" } });
  const onCreada = vi.fn();
  render(<SeriesForm onCreada={onCreada} />);

  rellenar({ "Peso (kg)": "80", Repeticiones: "8" });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Falta el ejercicio");
  expect(onCreada).not.toHaveBeenCalled();
});
