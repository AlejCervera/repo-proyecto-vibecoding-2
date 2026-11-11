import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { Aviso } from "./Aviso";
import { BarraPestanas } from "./BarraPestanas";
import { BotonFijo } from "./BotonFijo";
import { ContadorBotones } from "./ContadorBotones";
import { FotoCirculo } from "./FotoCirculo";
import { HojaInferior } from "./HojaInferior";

afterEach(() => {
  vi.useRealTimers();
});

// --- Foto en círculo ---------------------------------------------------------------------

test("sin imagen muestra las iniciales", () => {
  render(<FotoCirculo nombre="Press de banca" />);
  expect(screen.getByTestId("foto-circulo").textContent).toBe("PB");
});

test("con imagen la muestra como decorativa (el nombre ya está al lado)", () => {
  const { container } = render(<FotoCirculo nombre="Press banca" src="/api/foto.png" />);
  const img = container.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("/api/foto.png");
  expect(img.getAttribute("alt")).toBe("");
});

test("si la imagen no carga, vuelve a las iniciales", () => {
  const { container } = render(<FotoCirculo nombre="Press banca" src="/rota.png" />);
  fireEvent.error(container.querySelector("img")!);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByTestId("foto-circulo").textContent).toBe("PB");
});

test("con onAbrir es un botón «Ver foto de …»", () => {
  const abrir = vi.fn();
  render(<FotoCirculo nombre="Sentadilla" onAbrir={abrir} />);
  fireEvent.click(screen.getByRole("button", { name: "Ver foto de Sentadilla" }));
  expect(abrir).toHaveBeenCalledOnce();
});

// --- Hoja inferior -----------------------------------------------------------------------

function hoja(onCerrar = vi.fn()) {
  render(
    <HojaInferior titulo="Borrar serie" onCerrar={onCerrar}>
      <p>¿Seguro?</p>
    </HojaInferior>,
  );
  return { onCerrar, dialogo: screen.getByRole("dialog", { name: "Borrar serie" }) };
}

test("la hoja es un diálogo con título y recibe el foco", () => {
  const { dialogo } = hoja();
  expect(dialogo.getAttribute("aria-modal")).toBe("true");
  expect(within(dialogo).getByText("¿Seguro?")).toBeTruthy();
  expect(document.activeElement).toBe(dialogo);
});

test("se cierra con la ✕, con Esc y tocando fuera, pero no tocando dentro", () => {
  const { onCerrar, dialogo } = hoja();
  fireEvent.click(within(dialogo).getByText("¿Seguro?"));
  expect(onCerrar).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  fireEvent.keyDown(dialogo, { key: "Escape" });
  fireEvent.click(dialogo.parentElement!);
  expect(onCerrar).toHaveBeenCalledTimes(3);
});

test("al cerrarse devuelve el foco a donde estaba", () => {
  function Prueba() {
    const [abierta, setAbierta] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setAbierta(true)}>
          Abrir
        </button>
        {abierta && (
          <HojaInferior titulo="Hoja" onCerrar={() => setAbierta(false)}>
            <p>Dentro</p>
          </HojaInferior>
        )}
      </>
    );
  }
  render(<Prueba />);
  const abrir = screen.getByRole("button", { name: "Abrir" });
  abrir.focus();
  fireEvent.click(abrir);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(abrir);
});

// --- Contador − / + ----------------------------------------------------------------------

function Kilos({ inicial }: { inicial: number }) {
  const [v, setV] = useState(inicial);
  return <ContadorBotones etiqueta="Kilos" unidad="kg" paso={2.5} min={0} max={500} valor={v} onCambio={setV} />;
}

test("el contador suma y resta su paso y lo muestra con coma", () => {
  render(<Kilos inicial={60} />);
  const grupo = screen.getByRole("group", { name: "Kilos" });
  fireEvent.click(screen.getByRole("button", { name: "Sumar 2,5 kg" }));
  expect(grupo.querySelector("output")!.textContent).toBe("62,5");
  fireEvent.click(screen.getByRole("button", { name: "Restar 2,5 kg" }));
  fireEvent.click(screen.getByRole("button", { name: "Restar 2,5 kg" }));
  expect(grupo.querySelector("output")!.textContent).toBe("57,5");
});

test("en el mínimo, «Restar» está desactivado", () => {
  render(<Kilos inicial={0} />);
  expect(screen.getByRole("button", { name: "Restar 2,5 kg" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "Sumar 2,5 kg" }).hasAttribute("disabled")).toBe(false);
});

// --- Aviso breve --------------------------------------------------------------------------

test("el aviso desaparece solo pasado su tiempo", () => {
  vi.useFakeTimers();
  const cerrar = vi.fn();
  render(<Aviso mensaje="Serie guardada" onCerrar={cerrar} duracionMs={3000} />);
  expect(screen.getByRole("status").textContent).toBe("Serie guardada");
  expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
  act(() => vi.advanceTimersByTime(2999));
  expect(cerrar).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(cerrar).toHaveBeenCalledOnce();
});

test("«Deshacer» deshace y cierra el aviso", () => {
  const cerrar = vi.fn();
  const deshacer = vi.fn();
  render(<Aviso mensaje="Serie guardada" onCerrar={cerrar} onDeshacer={deshacer} />);
  fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
  expect(deshacer).toHaveBeenCalledOnce();
  expect(cerrar).toHaveBeenCalledOnce();
});

// --- Botón fijo y barra de pestañas ------------------------------------------------------

test("el botón fijo envuelve la acción principal", () => {
  render(
    <BotonFijo>
      <button type="button">Empezar</button>
    </BotonFijo>,
  );
  expect(screen.getByRole("button", { name: "Empezar" }).parentElement!.className).toBe("boton-fijo");
});

test("la barra tiene las cinco pestañas y marca la de la pantalla actual", () => {
  render(<BarraPestanas actual="rutina" />);
  const nav = screen.getByRole("navigation", { name: "Secciones" });
  const enlaces = within(nav).getAllByRole("link");
  expect(enlaces.map((a) => a.textContent)).toEqual(["Inicio", "Entrenar", "Diario", "Ejercicios", "Perfil"]);
  expect(enlaces.map((a) => a.getAttribute("href"))).toEqual([
    "#/",
    "#/rutinas",
    "#/diario",
    "#/ejercicios",
    "#/perfil",
  ]);
  expect(within(nav).getByRole("link", { current: "page" }).textContent).toBe("Entrenar");
});

test("el historial de un ejercicio cuenta como Diario", () => {
  render(<BarraPestanas actual="historial" />);
  expect(screen.getByRole("link", { current: "page" }).textContent).toBe("Diario");
});
