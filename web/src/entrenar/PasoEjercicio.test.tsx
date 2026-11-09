import { fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { expect, test, vi } from "vitest";
import { PasoEjercicio } from "./PasoEjercicio";

const respuesta = () =>
  Response.json({
    ejercicio: { id: 11, nombre: "Aperturas", propio: false, imagen: null },
    series: [],
  });

test("una respuesta que llega tarde no pisa lo que el usuario ya ha escrito", async () => {
  // En modo estricto el historial se pide dos veces; la segunda respuesta llega más tarde.
  let responderTarde!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(respuesta())
      .mockReturnValueOnce(new Promise<Response>((ok) => (responderTarde = ok))),
  );
  render(
    <StrictMode>
      <PasoEjercicio
        ejercicioId={11}
        hoy="2026-11-09"
        previstas={3}
        repsMin={8}
        repsMax={12}
        onCambiarPrevistas={vi.fn()}
        onGuardada={vi.fn()}
      />
    </StrictMode>,
  );

  const escribir = () =>
    fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "14" } });

  await new Promise((r) => setTimeout(r, 20));
  const yaVisible = screen.queryByLabelText("Peso (kg)") !== null;
  if (yaVisible) escribir(); // el usuario empieza a escribir con la primera respuesta

  responderTarde(respuesta());
  await screen.findByLabelText("Peso (kg)");
  if (!yaVisible) escribir();
  await new Promise((r) => setTimeout(r, 20));

  expect((screen.getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("14");
});
