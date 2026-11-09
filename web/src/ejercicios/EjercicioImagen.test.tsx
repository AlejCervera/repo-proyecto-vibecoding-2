import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { simularFetch } from "../test-setup";
import type { Ejercicio } from "./ejercicio";
import { EjercicioImagen } from "./EjercicioImagen";

const BASE: Ejercicio = { id: 5, nombre: "Remo", propio: true, imagen: null };

test("imagen de ejemplo de wger: se muestra con atribución y no deja subir otra", () => {
  const ej: Ejercicio = {
    ...BASE,
    imagen: { origen: "wger", autor: "Ana", licencia: "CC-BY-SA 4" },
  };
  render(<EjercicioImagen ejercicio={ej} onCambio={vi.fn()} />);
  expect(screen.getByRole("img", { name: "Imagen de Remo" }).getAttribute("src")).toBe(
    "/api/ejercicios/5/imagen",
  );
  expect(screen.getByText("Imagen de ejemplo: wger.de · Ana · CC-BY-SA 4")).toBeTruthy();
  expect(screen.queryByLabelText(/imagen/i)).toBeNull();
});

test("sin imagen: no muestra ninguna y ofrece subirla", () => {
  render(<EjercicioImagen ejercicio={BASE} onCambio={vi.fn()} />);
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getByLabelText("Subir imagen")).toBeTruthy();
});

test("subir una imagen la envía y avisa del cambio", async () => {
  const fetch = simularFetch({ status: 200, body: { origen: "propia" } });
  const onCambio = vi.fn();
  render(<EjercicioImagen ejercicio={BASE} onCambio={onCambio} />);

  const archivo = new File(["png"], "foto.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Subir imagen"), { target: { files: [archivo] } });

  await vi.waitFor(() =>
    expect(onCambio).toHaveBeenCalledWith({ ...BASE, imagen: { origen: "propia" } }),
  );
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/ejercicios/5/imagen");
  expect(init.method).toBe("PUT");
  expect(init.body).toBe(archivo); // en jsdom no se puede reducir: va el original
});

test("si la API rechaza la imagen, muestra el aviso", async () => {
  simularFetch({ status: 400, body: { error: "La imagen debe ser JPEG, PNG o WebP" } });
  const onCambio = vi.fn();
  render(<EjercicioImagen ejercicio={{ ...BASE, imagen: { origen: "propia" } }} onCambio={onCambio} />);

  const archivo = new File(["x"], "x.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Cambiar imagen"), { target: { files: [archivo] } });

  expect((await screen.findByRole("alert")).textContent).toBe(
    "La imagen debe ser JPEG, PNG o WebP",
  );
  expect(onCambio).not.toHaveBeenCalled();
});
