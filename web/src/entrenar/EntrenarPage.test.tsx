import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { hoyISO } from "../series/serie";
import { simularFetch } from "../test-setup";
import { EntrenarPage } from "./EntrenarPage";

const HOY = hoyISO();
const ANTES = "2020-01-15";

const ej = (id: number, nombre: string, series = 3, reps_min: number | null = 8, reps_max: number | null = 12) => ({
  id,
  nombre,
  series,
  reps_min,
  reps_max,
});
const RUTINA = {
  id: 7,
  nombre: "Pecho",
  predefinida: false,
  ejercicios: [ej(10, "Press de banca", 2), ej(11, "Aperturas", 3, null, null)],
};
const serie = (id: number, fecha: string, ejercicio_id: number, peso_kg: number, repeticiones: number) => ({
  id,
  fecha,
  ejercicio_id,
  ejercicio: ejercicio_id === 10 ? "Press de banca" : "Aperturas",
  peso_kg,
  repeticiones,
});
const BANCA_ANTES = [serie(2, ANTES, 10, 80, 6), serie(1, ANTES, 10, 80, 8)];
/** Respuesta al guardado automático en el diario al llegar al resumen. */
const GUARDADO = { status: 201, body: { id: 40, fecha: HOY, rutina_id: 7, rutina_nombre: "Pecho", ejercicios: [] } };
const historial = (id: number, nombre: string, series: unknown[]) => ({
  status: 200,
  body: { ejercicio: { id, nombre, propio: false, imagen: null }, series },
});

function pintar(paso: number | "fin", rutina: object, todas: unknown[], ...extra: { status: number; body: unknown }[]) {
  const fetch = simularFetch({ status: 200, body: rutina }, { status: 200, body: todas }, ...extra);
  render(<EntrenarPage rutinaId={7} paso={paso} onSesionCaducada={vi.fn()} />);
  return fetch;
}

const puntos = (paso: HTMLElement) =>
  within(within(paso).getByRole("list", { name: "Series de hoy" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent?.replace(/\s+/g, " ").trim());
const campo = (paso: HTMLElement, etiqueta: string) => within(paso).getByLabelText(etiqueta) as HTMLInputElement;
const hecha = () => screen.getByRole("button", { name: "Hecha · empezar descanso" });

/** Abre la hoja con la lista de ejercicios y la devuelve. */
function abrirLista() {
  fireEvent.click(screen.getByRole("button", { name: "Ejercicios" }));
  return screen.getByRole("list", { name: "Ejercicios del entrenamiento" });
}

test("muestra objetivo, la última vez, las series de hoy y los valores de la última serie", async () => {
  pintar(0, RUTINA, BANCA_ANTES, historial(10, "Press de banca", BANCA_ANTES));
  const paso = await screen.findByRole("article", { name: "Press de banca" });

  expect(paso.textContent).toContain("Objetivo: 2 × 8-12");
  expect(paso.textContent).toContain("La última vez (15/01/2020): 80 kg × 8 · 80 kg × 6");
  expect(puntos(paso)).toEqual(["Ahora: serie 1", "Serie 2"]);
  expect(campo(paso, "Peso (kg)").value).toBe("80");
  expect(campo(paso, "Repeticiones").value).toBe("6");
  expect(paso.textContent).toContain("Si completas todas a 12 repeticiones, la próxima vez 82,5 kg.");
});

test("primera vez: propone el mínimo del objetivo y lo dice", async () => {
  pintar(0, RUTINA, [], historial(10, "Press de banca", []));
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  expect(campo(paso, "Peso (kg)").value).toBe("");
  expect(campo(paso, "Repeticiones").value).toBe("8");
  expect(paso.textContent).toContain("Primera vez con este ejercicio.");
});

test("con − / + se cambia el peso sin teclado y se guarda lo que se ve", async () => {
  const fetch = pintar(0, RUTINA, BANCA_ANTES, historial(10, "Press de banca", BANCA_ANTES), {
    status: 201,
    body: serie(20, HOY, 10, 82.5, 6),
  });
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  fireEvent.click(within(paso).getByRole("button", { name: "Sumar 2,5 kg" }));
  fireEvent.click(within(paso).getByRole("button", { name: "Sumar 1 rep." }));
  expect(campo(paso, "Peso (kg)").value).toBe("82,5");
  expect(campo(paso, "Repeticiones").value).toBe("7");

  fireEvent.click(hecha());
  await vi.waitFor(() => expect(puntos(paso)[0]).toBe("✓ Serie 1 · 82,5 kg × 6"));
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({
    fecha: HOY,
    ejercicio_id: 10,
    peso_kg: "82,5",
    repeticiones: "7",
  });
});

test("completar el ejercicio cambia el botón a «Siguiente ejercicio» y la lista lo marca", async () => {
  pintar(
    0,
    RUTINA,
    [],
    historial(10, "Press de banca", []),
    { status: 201, body: serie(20, HOY, 10, 60, 10) },
    { status: 201, body: serie(21, HOY, 10, 60, 9) },
  );
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  expect(within(abrirLista()).getAllByRole("listitem")[0].textContent).toBe("Press de banca 0/2");
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

  fireEvent.change(campo(paso, "Peso (kg)"), { target: { value: "60" } });
  fireEvent.click(hecha());
  await vi.waitFor(() => expect(puntos(paso)[0]).toBe("✓ Serie 1 · 60 kg × 10"));
  fireEvent.click(hecha());
  await vi.waitFor(() => expect(puntos(paso)).toEqual(["✓ Serie 1 · 60 kg × 10", "✓ Serie 2 · 60 kg × 9"]));

  expect(within(paso).getByText("¡Ejercicio completado!").getAttribute("role")).toBe("status");
  expect(screen.queryByRole("button", { name: "Hecha · empezar descanso" })).toBeNull();
  expect(screen.getByRole("link", { name: "Siguiente ejercicio" }).getAttribute("href")).toBe(
    "#/rutinas/7/entrenar/1",
  );
  expect(within(abrirLista()).getAllByRole("listitem")[0].textContent).toBe("Press de banca 2/2 ✓");
});

test("en el último ejercicio, al completarlo el botón es «Terminar entreno»", async () => {
  const hoy = [serie(30, HOY, 11, 12, 12), serie(31, HOY, 11, 12, 12), serie(32, HOY, 11, 12, 12)];
  pintar(1, RUTINA, hoy, historial(11, "Aperturas", hoy));
  await screen.findByRole("article", { name: "Aperturas" });
  expect(screen.getByRole("link", { name: "Terminar entreno" }).getAttribute("href")).toBe(
    "#/rutinas/7/entrenar/fin",
  );
});

test("guardar una serie arranca el descanso con la última duración elegida", async () => {
  localStorage.setItem("gymlog-descanso", "120000");
  pintar(0, RUTINA, [], historial(10, "Press de banca", []), {
    status: 201,
    body: serie(20, HOY, 10, 60, 10),
  });
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  expect(screen.queryByRole("timer")).toBeNull();

  fireEvent.change(campo(paso, "Peso (kg)"), { target: { value: "60" } });
  fireEvent.click(hecha());

  const reloj = await screen.findByRole("timer");
  expect(reloj.textContent).toMatch(/^(2:00|1:59)$/);
  expect(JSON.parse(sessionStorage.getItem("gymlog-cronometro")!).duracion).toBe(120_000);
});

test("«Deshacer» borra la serie recién guardada y para el descanso", async () => {
  const fetch = pintar(
    0,
    RUTINA,
    [],
    historial(10, "Press de banca", []),
    { status: 201, body: serie(20, HOY, 10, 60, 10) },
    { status: 204, body: null },
  );
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  fireEvent.change(campo(paso, "Peso (kg)"), { target: { value: "60" } });
  fireEvent.click(hecha());

  const aviso = await screen.findByText("Serie guardada: 60 kg × 10");
  expect(screen.getByRole("timer")).toBeTruthy();
  fireEvent.click(within(aviso.closest(".aviso") as HTMLElement).getByRole("button", { name: "Deshacer" }));

  await vi.waitFor(() => expect(puntos(paso)).toEqual(["Ahora: serie 1", "Serie 2"]));
  expect(fetch).toHaveBeenLastCalledWith("/api/series/20", { method: "DELETE" });
  expect(screen.queryByRole("timer")).toBeNull();
});

test("cada ejercicio recuerda su descanso y «Hecha» lo usa", async () => {
  pintar(0, RUTINA, [], historial(10, "Press de banca", []), {
    status: 201,
    body: serie(20, HOY, 10, 60, 10),
  });
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  // Sin descanso propio: 1:30. Al tocarlo se abre la hoja, sin descanso en marcha.
  fireEvent.click(within(paso).getByRole("button", { name: "Descanso 1:30: cambiarlo" }));
  const hoja = screen.getByRole("dialog", { name: "Descanso" });
  expect(screen.queryByRole("timer")).toBeNull();
  fireEvent.click(within(hoja).getByRole("button", { name: "Más descanso" }));
  fireEvent.click(within(hoja).getByRole("button", { name: "Más descanso" }));
  expect(within(hoja).getByLabelText("Descanso de Press de banca").textContent).toBe("2:00");
  expect(localStorage.getItem("gymlog-descanso-10")).toBe("120000");
  fireEvent.click(within(hoja).getByRole("button", { name: "Cerrar" }));

  expect(within(paso).getByRole("button", { name: "Descanso 2:00: cambiarlo" })).toBeTruthy();
  fireEvent.change(campo(paso, "Peso (kg)"), { target: { value: "60" } });
  fireEvent.click(hecha());
  expect((await screen.findByRole("timer")).textContent).toMatch(/^(2:00|1:59)$/);
});

test("el tiempo de arriba no empieza hasta la primera serie", async () => {
  pintar(0, RUTINA, [], historial(10, "Press de banca", []), {
    status: 201,
    body: serie(20, HOY, 10, 60, 10),
  });
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  expect(document.querySelector(".tiempo-entreno")!.textContent).toBe("Sin empezar");
  expect(localStorage.getItem(`gymlog-inicio-7-${HOY}`)).toBeNull();

  fireEvent.change(campo(paso, "Peso (kg)"), { target: { value: "60" } });
  fireEvent.click(hecha());
  await vi.waitFor(() =>
    expect(document.querySelector(".tiempo-entreno")!.textContent).toMatch(/^Llevas 0:0\d$/),
  );
  expect(Number(localStorage.getItem(`gymlog-inicio-7-${HOY}`))).toBeGreaterThan(0);
});

test("añadir y quitar series para hoy; no se puede quitar por debajo de las hechas", async () => {
  pintar(0, RUTINA, [serie(30, HOY, 10, 60, 10)], historial(10, "Press de banca", [serie(30, HOY, 10, 60, 10)]));
  const paso = await screen.findByRole("article", { name: "Press de banca" });
  const quitar = within(paso).getByRole("button", { name: "Quitar serie" }) as HTMLButtonElement;

  fireEvent.click(within(paso).getByRole("button", { name: "Añadir serie" }));
  expect(puntos(paso)).toHaveLength(3);
  expect(paso.textContent).toContain("Objetivo: 3 × 8-12");

  fireEvent.click(quitar);
  fireEvent.click(quitar);
  expect(puntos(paso)).toEqual(["✓ Serie 1 · 60 kg × 10"]);
  expect(quitar.disabled).toBe(true);
});

test("la foto en círculo abre la hoja con la mejor serie, la última vez y el historial", async () => {
  pintar(0, RUTINA, BANCA_ANTES, historial(10, "Press de banca", BANCA_ANTES));
  await screen.findByRole("article", { name: "Press de banca" });
  fireEvent.click(screen.getByRole("button", { name: "Ver foto de Press de banca" }));

  const hoja = screen.getByRole("dialog", { name: "Press de banca" });
  expect(hoja.textContent).toContain("Mejor serie80 kg × 8");
  expect(hoja.textContent).toContain("La última vez80 kg × 8 · 80 kg × 6");
  expect(within(hoja).getByRole("link", { name: "Ver historial" }).getAttribute("href")).toBe(
    "#/ejercicios/10/historial",
  );
});

test("cabecera: salir vuelve a la rutina y la lista lleva a cada ejercicio y a terminar", async () => {
  pintar(1, RUTINA, [], historial(11, "Aperturas", []));
  await screen.findByRole("article", { name: "Aperturas" });
  expect(screen.getByRole("link", { name: "Salir del entreno" }).getAttribute("href")).toBe("#/rutinas/7");

  const lista = abrirLista();
  const enlaces = within(lista).getAllByRole("link");
  expect(enlaces.map((a) => a.getAttribute("href"))).toEqual(["#/rutinas/7/entrenar/0", "#/rutinas/7/entrenar/1"]);
  expect(within(lista).getByRole("link", { current: "step" }).textContent).toBe("Aperturas");
  expect(screen.getByRole("link", { name: "Terminar entreno" }).getAttribute("href")).toBe(
    "#/rutinas/7/entrenar/fin",
  );
  // Elegir un ejercicio cierra la hoja
  fireEvent.click(enlaces[0]);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("navegación entre pasos", async () => {
  pintar(1, RUTINA, [], historial(11, "Aperturas", []));
  await screen.findByRole("article", { name: "Aperturas" });
  const pasos = screen.getByRole("navigation", { name: "Pasos" });
  expect(within(pasos).getByRole("link", { name: "← Anterior" }).getAttribute("href")).toBe("#/rutinas/7/entrenar/0");
  expect(within(pasos).getByRole("link", { name: "Terminar" }).getAttribute("href")).toBe("#/rutinas/7/entrenar/fin");
});

test("resumen: cifras, comparación con la vez anterior y récords", async () => {
  localStorage.setItem(`gymlog-inicio-7-${HOY}`, String(Date.now() - 47 * 60_000));
  const todas = [...BANCA_ANTES, serie(40, HOY, 10, 85, 5), serie(41, HOY, 10, 80, 8)];
  pintar("fin", RUTINA, todas, GUARDADO);
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });

  expect(within(resumen).getByRole("heading", { name: "¡Entreno hecho!" })).toBeTruthy();
  const cifras = resumen.querySelector(".cifras")!.textContent;
  expect(cifras).toContain("Duración47 min");
  expect(cifras).toContain("Volumen1065 kg"); // 85×5 + 80×8
  expect(cifras).toContain("Series2");
  // La vez anterior: 80×8 + 80×6 = 1120 kg
  expect(resumen.textContent).toContain("Has movido 55 kg menos que la vez anterior (1120 kg).");
  const records = within(resumen).getByRole("region", { name: "Récords nuevos" });
  expect(records.textContent).toContain("Press de banca: 85 kg × 5 (antes 80 kg)");
});

test("resumen: si hoy solo hiciste parte de la rutina, compara solo esos ejercicios", async () => {
  const todas = [
    ...BANCA_ANTES, // la vez anterior, press de banca: 1120 kg
    serie(5, ANTES, 11, 20, 10), // y aperturas: 200 kg (hoy no se han hecho)
    serie(40, HOY, 10, 80, 8),
    serie(41, HOY, 10, 80, 8),
  ];
  pintar("fin", RUTINA, todas, GUARDADO);
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(resumen.textContent).toContain("Has movido 160 kg más que la vez anterior (1120 kg).");
});

test("resumen: sin la cabecera del entreno (ni reloj ni lista), con vuelta a la rutina y al inicio", async () => {
  pintar("fin", RUTINA, [serie(3, HOY, 11, 12, 12)], GUARDADO);
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(screen.queryByRole("button", { name: "Ejercicios" })).toBeNull();
  expect(document.querySelector(".tiempo-entreno")).toBeNull();
  expect(within(resumen).getByRole("link", { name: "Volver a la rutina" }).getAttribute("href")).toBe("#/rutinas/7");
  expect(within(resumen).getByRole("link", { name: "Ir al inicio" }).getAttribute("href")).toBe("#/");
});

test("resumen: si cambiaste las series de una rutina tuya, ofrece guardarlas", async () => {
  sessionStorage.setItem(`gymlog-entreno-7-${HOY}`, JSON.stringify({ 10: 4 }));
  const actualizada = { ...RUTINA, ejercicios: [ej(10, "Press de banca", 4), RUTINA.ejercicios[1]] };
  const fetch = pintar("fin", RUTINA, [serie(3, HOY, 11, 12, 12)], GUARDADO, { status: 200, body: actualizada });

  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(resumen.textContent).toContain("1 serie en total.");
  expect(resumen.textContent).toContain("Aperturas: 12 kg × 12");
  // Primera vez con todo: ni comparación ni récords
  expect(resumen.textContent).not.toContain("vez anterior");
  expect(within(resumen).queryByRole("region", { name: "Récords nuevos" })).toBeNull();
  const cambios = within(resumen).getByRole("complementary", { name: "Cambios en la rutina" });
  expect(cambios.textContent).toContain("Press de banca: 2 → 4 series");

  fireEvent.click(within(cambios).getByRole("button", { name: "Guardar en la rutina" }));
  expect((await within(resumen).findByText("Guardado en la rutina «Pecho».")).getAttribute("role")).toBe("status");
  const [url, init] = fetch.mock.calls[3];
  expect(url).toBe("/api/rutinas/7/ejercicios/10");
  expect(JSON.parse(init.body)).toEqual({ series: 4 });
  expect(within(resumen).queryByRole("complementary")).toBeNull();
});

test("resumen: el entreno se guarda solo en el diario al terminar", async () => {
  const fetch = pintar("fin", RUTINA, [serie(3, HOY, 11, 12, 12)], GUARDADO);
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });

  const estado = await within(resumen).findByRole("status");
  expect(estado.textContent).toContain("Guardado en el diario.");
  expect(within(estado).getByRole("link", { name: "Ver en el diario" }).getAttribute("href")).toBe("#/diario/40");
  expect(within(resumen).queryByRole("button", { name: "Guardar en el diario" })).toBeNull();
  const [url, init] = fetch.mock.calls[2];
  expect(url).toBe("/api/entrenamientos");
  expect(JSON.parse(init.body)).toEqual({ rutina_id: 7, fecha: HOY });
  expect(fetch).toHaveBeenCalledTimes(3); // una sola vez
});

test("resumen: si el guardado automático falla, avisa y deja reintentar", async () => {
  const fetch = pintar(
    "fin",
    RUTINA,
    [serie(3, HOY, 11, 12, 12)],
    { status: 500, body: { error: "Error del servidor" } },
    GUARDADO,
  );
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect((await within(resumen).findByRole("alert")).textContent).toBe("Error del servidor");
  fireEvent.click(within(resumen).getByRole("button", { name: "Guardar en el diario" }));
  expect((await within(resumen).findByRole("status")).textContent).toContain("Guardado en el diario.");
  expect(fetch).toHaveBeenCalledTimes(4);
});

test("resumen sin series de hoy: ni cifras ni guardar en el diario", async () => {
  pintar("fin", RUTINA, []);
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(within(resumen).queryByRole("button", { name: "Guardar en el diario" })).toBeNull();
  expect(resumen.querySelector(".cifras")).toBeNull();
});

test("resumen de una predefinida: no ofrece guardar cambios", async () => {
  sessionStorage.setItem(`gymlog-entreno-7-${HOY}`, JSON.stringify({ 10: 4 }));
  pintar("fin", { ...RUTINA, predefinida: true }, []);
  const resumen = await screen.findByRole("article", { name: "Resumen del entrenamiento" });
  expect(within(resumen).queryByRole("complementary")).toBeNull();
});

test("rutina sin ejercicios: aviso", async () => {
  pintar(0, { ...RUTINA, ejercicios: [] }, []);
  expect(await screen.findByText(/no tiene ejercicios/)).toBeTruthy();
});
