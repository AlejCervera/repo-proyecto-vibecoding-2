import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { iniciar, type Cronometro } from "./cronometro";
import { CronometroPanel } from "./CronometroPanel";
import { RelojDescanso } from "./RelojDescanso";

vi.mock("./aviso", () => ({ pitar: vi.fn(), vibrar: vi.fn() }));
const aviso = await import("./aviso");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** El reloj de la cabecera y, al tocarlo, la hoja; como en la pantalla de entreno. */
function Envoltorio({ inicial, duracionInicial = 90_000 }: { inicial: Cronometro | null; duracionInicial?: number }) {
  const [c, setC] = useState(inicial);
  const [abierta, setAbierta] = useState(false);
  const [duracion, setDuracion] = useState(duracionInicial);
  return (
    <>
      <RelojDescanso cronometro={c} onAbrir={() => setAbierta(true)} />
      {abierta && (
        <CronometroPanel
          cronometro={c}
          onCambiar={setC}
          ejercicio="Press de banca"
          duracion={duracion}
          onCambiarDuracion={setDuracion}
          onCerrar={() => setAbierta(false)}
        />
      )}
    </>
  );
}

const reloj = () => screen.getByRole("timer", { name: "Tiempo de descanso" }).textContent;
const pasar = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const abrir = () => fireEvent.click(screen.getByRole("button", { name: "Abrir el descanso" }));
const grande = () => document.querySelector(".descanso-tiempo")!.textContent;

test("sin descanso en marcha no se ve el reloj", () => {
  render(<Envoltorio inicial={null} />);
  expect(screen.queryByRole("timer")).toBeNull();
  expect(screen.queryByRole("button", { name: "Abrir el descanso" })).toBeNull();
});

test("el reloj circular cuenta atrás y avisa al llegar a 0 (una sola vez)", () => {
  render(<Envoltorio inicial={iniciar(90_000, Date.now())} />);
  expect(reloj()).toBe("1:30");
  pasar(30_000);
  expect(reloj()).toBe("1:00");
  expect(aviso.pitar).not.toHaveBeenCalled();

  pasar(60_000);
  expect(reloj()).toBe("0:00");
  expect(screen.getByRole("alert").textContent).toBe("¡Descanso terminado!");
  expect(document.querySelector(".anillo.terminado")).not.toBeNull();
  expect(aviso.pitar).toHaveBeenCalledTimes(1);
  expect(aviso.vibrar).toHaveBeenCalledTimes(1);

  pasar(10_000);
  expect(aviso.pitar).toHaveBeenCalledTimes(1);
});

test("un descanso que ya había terminado (al recargar) no vuelve a pitar", () => {
  render(<Envoltorio inicial={iniciar(60_000, Date.now() - 120_000)} />);
  expect(screen.getByRole("alert")).toBeTruthy();
  pasar(1000);
  expect(aviso.pitar).not.toHaveBeenCalled();
});

test("al tocar el reloj se abre la hoja con el reloj grande y el total", () => {
  render(<Envoltorio inicial={iniciar(120_000, Date.now())} />);
  pasar(36_000);
  abrir();
  expect(screen.getByRole("dialog", { name: "Descanso" })).toBeTruthy();
  expect(grande()).toBe("1:24");
  expect(document.querySelector(".descanso-total")!.textContent).toBe("de 2:00");
});

test("pausar congela la cuenta y reanudar sigue", () => {
  render(<Envoltorio inicial={iniciar(90_000, Date.now())} />);
  abrir();
  pasar(10_000);
  fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
  pasar(30_000);
  expect(reloj()).toBe("1:20");
  fireEvent.click(screen.getByRole("button", { name: "Reanudar" }));
  pasar(20_000);
  expect(reloj()).toBe("1:00");
});

test("−15 s y +15 s cambian el descanso que está corriendo", () => {
  render(<Envoltorio inicial={iniciar(90_000, Date.now())} />);
  abrir();
  fireEvent.click(screen.getByRole("button", { name: "Sumar 15 s" }));
  expect(reloj()).toBe("1:45");
  expect(document.querySelector(".descanso-total")!.textContent).toBe("de 1:45");
  fireEvent.click(screen.getByRole("button", { name: "Restar 15 s" }));
  fireEvent.click(screen.getByRole("button", { name: "Restar 15 s" }));
  expect(reloj()).toBe("1:15");
});

test("«Saltar descanso» lo quita y cierra la hoja", () => {
  render(<Envoltorio inicial={iniciar(90_000, Date.now())} />);
  abrir();
  fireEvent.click(screen.getByRole("button", { name: "Saltar descanso" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("timer")).toBeNull();
});

test("el descanso del ejercicio se ajusta de 15 s en 15 s, sin bajar de 15 s", () => {
  render(<Envoltorio inicial={iniciar(30_000, Date.now())} duracionInicial={30_000} />);
  abrir();
  const valor = () => screen.getByLabelText("Descanso de Press de banca").textContent;
  expect(valor()).toBe("0:30");
  fireEvent.click(screen.getByRole("button", { name: "Más descanso" }));
  expect(valor()).toBe("0:45");
  fireEvent.click(screen.getByRole("button", { name: "Menos descanso" }));
  fireEvent.click(screen.getByRole("button", { name: "Menos descanso" }));
  expect(valor()).toBe("0:15");
  expect((screen.getByRole("button", { name: "Menos descanso" }) as HTMLButtonElement).disabled).toBe(true);
});
