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
        descanso={90_000}
        onAbrirDescanso={vi.fn()}
        onCambiarPrevistas={vi.fn()}
        onGuardada={vi.fn()}
        onBorrada={vi.fn()}
        siguiente={{ href: "#/rutinas/1/entrenar/1", texto: "Siguiente ejercicio" }}
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

test("al guardar una serie igual que la última vez, propone la siguiente de entonces (Fase 9f)", async () => {
  const serie = (id: number, fecha: string, peso_kg: number, repeticiones: number) => ({
    id,
    fecha,
    ejercicio_id: 11,
    ejercicio: "Aperturas",
    peso_kg,
    repeticiones,
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          ejercicio: { id: 11, nombre: "Aperturas", propio: false, imagen: null },
          series: [serie(2, "2026-11-05", 77.5, 6), serie(1, "2026-11-05", 80, 8)],
        }),
      )
      .mockResolvedValueOnce(Response.json(serie(3, "2026-11-09", 80, 8), { status: 201 })),
  );
  render(
    <PasoEjercicio
      ejercicioId={11}
      hoy="2026-11-09"
      previstas={2}
      repsMin={6}
      repsMax={8}
      descanso={90_000}
      onAbrirDescanso={vi.fn()}
      onCambiarPrevistas={vi.fn()}
      onGuardada={vi.fn()}
      onBorrada={vi.fn()}
      siguiente={{ href: "#/rutinas/1/entrenar/1", texto: "Siguiente ejercicio" }}
    />,
  );
  const valor = (etiqueta: string) => (screen.getByLabelText(etiqueta) as HTMLInputElement).value;
  await screen.findByLabelText("Peso (kg)");
  expect([valor("Peso (kg)"), valor("Repeticiones")]).toEqual(["80", "8"]); // serie 1 de entonces

  fireEvent.click(screen.getByRole("button", { name: "Hecha · empezar descanso" }));
  await vi.waitFor(() => expect([valor("Peso (kg)"), valor("Repeticiones")]).toEqual(["77,5", "6"]));
});
