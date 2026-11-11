import { expect, test } from "vitest";
import { simularFetch } from "../test-setup";
import { aplicarAnadir, aplicarObjetivo, aplicarSustitucion, colocar, textoPeso } from "./recomendaciones";

const ej = (id: number, nombre: string, series = 3, reps_min: number | null = 8, reps_max: number | null = 12) => ({
  id,
  nombre,
  series,
  reps_min,
  reps_max,
});
const rutina = (ejercicios: ReturnType<typeof ej>[]) => ({ id: 7, nombre: "Pecho", predefinida: false, ejercicios });

const cuerpo = (init: RequestInit) => JSON.parse(init.body as string);

test("colocar mueve un id a una posición", () => {
  expect(colocar([1, 2, 3], 3, 0)).toEqual([3, 1, 2]);
  expect(colocar([1, 2, 3], 3, 1)).toEqual([1, 3, 2]);
  expect(colocar([1, 2, 3], 1, 9)).toEqual([2, 3, 1]);
  expect(colocar([1, 2], 5, 0)).toEqual([1, 2]);
});

test("textoPeso", () => {
  expect(textoPeso(82.5)).toBe("82,5 kg");
  expect(textoPeso(null)).toBeNull();
});

test("aplicar añadir envía el ejercicio con sus series y repeticiones", async () => {
  const fetch = simularFetch({ status: 200, body: rutina([]) });
  await aplicarAnadir(7, { ejercicio_id: 3, nombre: "Fondos", series: 4, reps_min: 8, reps_max: 10, motivo: "" });
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/rutinas/7/ejercicios");
  expect(cuerpo(init)).toEqual({ ejercicio_id: 3, series: 4, reps_min: 8, reps_max: 10 });
});

test("aplicar objetivo cambia solo las repeticiones", async () => {
  const fetch = simularFetch({ status: 200, body: rutina([]) });
  await aplicarObjetivo(7, { ejercicio_id: 1, nombre: "Press", peso_kg: 82.5, reps_min: 6, reps_max: 8, motivo: "" });
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/rutinas/7/ejercicios/1");
  expect(init.method).toBe("PUT");
  expect(cuerpo(init)).toEqual({ reps_min: 6, reps_max: 8 });
});

test("aplicar sustitución: añade el nuevo con el plan del viejo, quita el viejo y lo deja en su sitio", async () => {
  const antes = rutina([ej(1, "Press de banca", 4, 6, 8), ej(2, "Aperturas")]);
  const fetch = simularFetch(
    { status: 200, body: rutina([...antes.ejercicios, ej(3, "Fondos", 4, 6, 8)]) },
    { status: 200, body: rutina([ej(2, "Aperturas"), ej(3, "Fondos", 4, 6, 8)]) },
    { status: 200, body: rutina([ej(3, "Fondos", 4, 6, 8), ej(2, "Aperturas")]) },
  );
  const final = await aplicarSustitucion(antes, {
    quitar_id: 1,
    quitar_nombre: "Press de banca",
    poner_id: 3,
    poner_nombre: "Fondos",
    motivo: "",
  });
  expect(final.ejercicios.map((e) => e.nombre)).toEqual(["Fondos", "Aperturas"]);
  const [[u1, i1], [u2, i2], [u3, i3]] = fetch.mock.calls;
  expect([u1, cuerpo(i1)]).toEqual(["/api/rutinas/7/ejercicios", { ejercicio_id: 3, series: 4, reps_min: 6, reps_max: 8 }]);
  expect([u2, i2.method]).toEqual(["/api/rutinas/7/ejercicios/1", "DELETE"]);
  expect([u3, cuerpo(i3)]).toEqual(["/api/rutinas/7/orden", { ejercicios: [3, 2] }]);
});

test("sustituir el último no necesita reordenar", async () => {
  const antes = rutina([ej(1, "A"), ej(2, "B")]);
  const fetch = simularFetch(
    { status: 200, body: rutina([ej(1, "A"), ej(2, "B"), ej(3, "C")]) },
    { status: 200, body: rutina([ej(1, "A"), ej(3, "C")]) },
  );
  const final = await aplicarSustitucion(antes, { quitar_id: 2, quitar_nombre: "B", poner_id: 3, poner_nombre: "C", motivo: "" });
  expect(final.ejercicios.map((e) => e.id)).toEqual([1, 3]);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("sustituir un ejercicio que ya no está da error sin llamar a la API", async () => {
  const fetch = simularFetch();
  await expect(
    aplicarSustitucion(rutina([]), { quitar_id: 9, quitar_nombre: "X", poner_id: 3, poner_nombre: "C", motivo: "" }),
  ).rejects.toThrow("«X» ya no está en la rutina");
  expect(fetch).not.toHaveBeenCalled();
});
