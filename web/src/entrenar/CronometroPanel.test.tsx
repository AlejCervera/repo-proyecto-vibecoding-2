import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { iniciar, type Cronometro } from "./cronometro";
import { CronometroPanel } from "./CronometroPanel";

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

function Envoltorio({ inicial }: { inicial: Cronometro | null }) {
  const [c, setC] = useState(inicial);
  return (
    <CronometroPanel
      cronometro={c}
      onCambiar={setC}
      onElegirDuracion={(ms) => setC(iniciar(ms, Date.now()))}
    />
  );
}

const reloj = () => screen.getByRole("timer").textContent;
const pasar = (ms: number) => act(() => vi.advanceTimersByTime(ms));

test("sin descanso en marcha solo muestra los botones rápidos", () => {
  render(<Envoltorio inicial={null} />);
  expect(screen.queryByRole("timer")).toBeNull();
  expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
    "60 s",
    "90 s",
    "2 min",
    "3 min",
  ]);
});

test("cuenta atrás y aviso al llegar a 0 (una sola vez)", () => {
  render(<Envoltorio inicial={iniciar(90_000, Date.now())} />);
  expect(reloj()).toBe("1:30");
  pasar(30_000);
  expect(reloj()).toBe("1:00");
  expect(aviso.pitar).not.toHaveBeenCalled();

  pasar(60_000);
  expect(reloj()).toBe("0:00");
  expect(screen.getByRole("alert").textContent).toBe("¡Descanso terminado!");
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

test("pausar congela la cuenta y reanudar sigue", () => {
  render(<Envoltorio inicial={iniciar(90_000, Date.now())} />);
  pasar(10_000);
  fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
  pasar(30_000);
  expect(reloj()).toBe("1:20");
  fireEvent.click(screen.getByRole("button", { name: "Reanudar" }));
  pasar(20_000);
  expect(reloj()).toBe("1:00");
});

test("reiniciar vuelve al total; parar lo oculta", () => {
  render(<Envoltorio inicial={iniciar(60_000, Date.now())} />);
  pasar(45_000);
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
  expect(reloj()).toBe("1:00");
  fireEvent.click(screen.getByRole("button", { name: "Parar" }));
  expect(screen.queryByRole("timer")).toBeNull();
});

test("elegir 2 min arranca esa duración y la marca", () => {
  render(<Envoltorio inicial={iniciar(90_000, Date.now())} />);
  fireEvent.click(screen.getByRole("button", { name: "2 min" }));
  expect(reloj()).toBe("2:00");
  expect(screen.getByRole("button", { name: "2 min" }).getAttribute("aria-pressed")).toBe("true");
});
