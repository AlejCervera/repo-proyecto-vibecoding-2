import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import { HistorialPage } from "./HistorialPage";

const BANCA = {
  id: 3,
  nombre: "Press de banca",
  propio: false,
  imagen: { origen: "wger", autor: "Everkinetic", licencia: "CC-BY-SA 3" },
};
const serie = (id: number, fecha: string, peso_kg: number, repeticiones: number) => ({
  id,
  fecha,
  ejercicio_id: 3,
  ejercicio: "Press de banca",
  peso_kg,
  repeticiones,
});

test("muestra el récord y las series agrupadas por día, en el orden en que se hicieron", async () => {
  const fetch = simularFetch({
    status: 200,
    body: {
      ejercicio: BANCA,
      series: [serie(3, "2026-11-09", 85, 6), serie(2, "2026-11-09", 80, 8), serie(1, "2026-11-02", 80, 6)],
    },
  });
  render(<HistorialPage ejercicioId={3} onSesionCaducada={vi.fn()} />);

  expect(await screen.findByRole("heading", { name: "Historial: Press de banca" })).toBeTruthy();
  const resumen = screen.getByLabelText("Resumen del ejercicio").textContent;
  expect(resumen).toContain("Mejor serie85 kg × 6");
  expect(resumen).toContain("Sesiones2");
  expect(resumen).toContain("Series3");

  const dias = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  expect(dias).toEqual(["Lun 09/11/2026", "Lun 02/11/2026"]);
  const delDia = within(screen.getByRole("list", { name: "Series del Lun 09/11/2026" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);
  expect(delDia).toEqual(["80 kg × 8", "85 kg × 6"]);

  expect(screen.getByRole("link", { name: "← Volver" }).getAttribute("href")).toBe("#/diario");
  expect(fetch).toHaveBeenCalledWith("/api/ejercicios/3/series", undefined);
});

test("la foto es un círculo pequeño; al tocarlo se ve grande con su atribución", async () => {
  simularFetch({ status: 200, body: { ejercicio: BANCA, series: [] } });
  render(<HistorialPage ejercicioId={3} onSesionCaducada={vi.fn()} />);
  await screen.findByRole("heading", { name: "Historial: Press de banca" });
  expect(screen.queryByRole("img", { name: "Imagen de Press de banca" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Ver foto de Press de banca" }));
  const hoja = screen.getByRole("dialog", { name: "Press de banca" });
  expect(within(hoja).getByRole("img", { name: "Imagen de Press de banca" })).toBeTruthy();
  expect(within(hoja).getByText(/Everkinetic/)).toBeTruthy();
});

test("sin series lo dice", async () => {
  simularFetch({ status: 200, body: { ejercicio: { ...BANCA, imagen: null }, series: [] } });
  render(<HistorialPage ejercicioId={3} onSesionCaducada={vi.fn()} />);
  expect(await screen.findByText("Aún no has registrado series de este ejercicio.")).toBeTruthy();
});

test("ejercicio que no existe: aviso y enlace para volver", async () => {
  simularFetch({ status: 404, body: { error: "El ejercicio no existe" } });
  render(<HistorialPage ejercicioId={999} onSesionCaducada={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toBe("El ejercicio no existe");
  expect(screen.getByRole("link", { name: "← Volver" })).toBeTruthy();
});

test("si la sesión ha caducado, avisa a la app", async () => {
  simularFetch({ status: 401, body: { error: "Inicia sesión" } });
  const onSesionCaducada = vi.fn();
  render(<HistorialPage ejercicioId={3} onSesionCaducada={onSesionCaducada} />);
  await vi.waitFor(() => expect(onSesionCaducada).toHaveBeenCalled());
});
