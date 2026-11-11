import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import type { Serie } from "./serie";
import { SerieFila } from "./SerieFila";

const SERIE: Serie = {
  id: 7,
  fecha: "2026-11-09",
  ejercicio_id: 3,
  ejercicio: "Press de banca",
  peso_kg: 80,
  repeticiones: 8,
};

function pintar(props: Partial<Parameters<typeof SerieFila>[0]> = {}) {
  const onCambiada = vi.fn();
  const onBorrada = vi.fn();
  render(
    <ul>
      <SerieFila
        serie={SERIE}
        mostrarEjercicio
        onCambiada={onCambiada}
        onBorrada={onBorrada}
        {...props}
      />
    </ul>,
  );
  return { onCambiada, onBorrada };
}

test("muestra la serie con enlace al historial del ejercicio", () => {
  pintar();
  expect(screen.getByRole("listitem").textContent).toContain("09/11/2026 — Press de banca · 80 kg × 8");
  expect(screen.getByRole("link", { name: "Press de banca" }).getAttribute("href")).toBe(
    "#/ejercicios/3/historial",
  );
});

test("corregir el peso envía la serie completa y avisa del cambio", async () => {
  const editada = { ...SERIE, peso_kg: 82.5 };
  const fetch = simularFetch({ status: 200, body: editada });
  const { onCambiada } = pintar();

  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  const form = screen.getByRole("form", { name: "Editar serie" });
  expect((within(form).getByLabelText("Peso (kg)") as HTMLInputElement).value).toBe("80");
  fireEvent.change(within(form).getByLabelText("Peso (kg)"), { target: { value: "82,5" } });
  fireEvent.click(within(form).getByRole("button", { name: "Guardar cambios" }));

  await vi.waitFor(() => expect(onCambiada).toHaveBeenCalledWith(editada));
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/series/7");
  expect(init.method).toBe("PUT");
  expect(JSON.parse(init.body)).toEqual({
    fecha: "2026-11-09",
    ejercicio_id: 3,
    peso_kg: "82,5",
    repeticiones: "8",
  });
  expect(screen.queryByRole("form")).toBeNull();
});

test("al editar, un error de la API se muestra y el formulario sigue abierto", async () => {
  simularFetch({ status: 400, body: { error: "El peso debe ser mayor que 0" } });
  const { onCambiada } = pintar();
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect((await screen.findByRole("alert")).textContent).toBe("El peso debe ser mayor que 0");
  expect(screen.getByRole("form", { name: "Editar serie" })).toBeTruthy();
  expect(onCambiada).not.toHaveBeenCalled();
});

test("cancelar la edición no envía nada", () => {
  const fetch = simularFetch();
  pintar();
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

test("borrar pide confirmación en la hoja inferior y solo borra al confirmar", async () => {
  const fetch = simularFetch({ status: 204, body: null });
  const { onBorrada } = pintar();

  fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
  const hoja = screen.getByRole("dialog", { name: "Borrar serie" });
  expect(hoja.textContent).toContain("¿Borrar la serie de 80 kg × 8 del 09/11/2026?");
  expect(fetch).not.toHaveBeenCalled();

  fireEvent.click(within(hoja).getByRole("button", { name: "Sí, borrar" }));
  await vi.waitFor(() => expect(onBorrada).toHaveBeenCalledWith(7));
  expect(fetch).toHaveBeenCalledWith("/api/series/7", { method: "DELETE" });
});

test("cancelar el borrado cierra la hoja sin borrar", () => {
  const fetch = simularFetch();
  pintar();
  fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

test("en el historial no repite el nombre del ejercicio", () => {
  pintar({ mostrarEjercicio: false });
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByRole("listitem").textContent).toContain("09/11/2026 · 80 kg × 8");
});
