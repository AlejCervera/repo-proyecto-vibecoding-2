import { expect, test } from "vitest";
import {
  enPausa,
  etiquetaDuracion,
  formatear,
  guardarCronometro,
  guardarDuracion,
  iniciar,
  leerCronometro,
  leerDuracion,
  pausar,
  reanudar,
  reiniciar,
  restante,
} from "./cronometro";

const T = 1_000_000;

test("el tiempo restante se calcula con la hora de fin y no baja de 0", () => {
  const c = iniciar(90_000, T);
  expect(restante(c, T)).toBe(90_000);
  expect(restante(c, T + 30_000)).toBe(60_000);
  expect(restante(c, T + 200_000)).toBe(0);
});

test("pausar congela el tiempo y reanudar continúa desde ahí", () => {
  const pausado = pausar(iniciar(90_000, T), T + 30_000);
  expect(enPausa(pausado)).toBe(true);
  expect(restante(pausado, T + 500_000)).toBe(60_000);
  const reanudado = reanudar(pausado, T + 500_000);
  expect(enPausa(reanudado)).toBe(false);
  expect(restante(reanudado, T + 510_000)).toBe(50_000);
});

test("pausar dos veces o reanudar sin pausa no cambia nada", () => {
  const c = iniciar(60_000, T);
  const p = pausar(c, T + 1000);
  expect(pausar(p, T + 9000)).toBe(p);
  expect(reanudar(c, T + 9000)).toBe(c);
});

test("reiniciar vuelve a la duración completa", () => {
  const c = reiniciar(iniciar(60_000, T), T + 50_000);
  expect(restante(c, T + 50_000)).toBe(60_000);
});

test("formatear redondea hacia arriba", () => {
  expect(formatear(90_000)).toBe("1:30");
  expect(formatear(180_000)).toBe("3:00");
  expect(formatear(4_200)).toBe("0:05");
  expect(formatear(200)).toBe("0:01");
  expect(formatear(0)).toBe("0:00");
});

test("etiquetas de los botones rápidos", () => {
  expect([60_000, 90_000, 120_000, 180_000].map(etiquetaDuracion)).toEqual([
    "60 s",
    "90 s",
    "2 min",
    "3 min",
  ]);
});

test("recuerda la duración elegida (90 s si no hay o no es válida)", () => {
  localStorage.clear();
  expect(leerDuracion()).toBe(90_000);
  guardarDuracion(120_000);
  expect(leerDuracion()).toBe(120_000);
  localStorage.setItem("gymlog-descanso", "7");
  expect(leerDuracion()).toBe(90_000);
  localStorage.clear();
});

test("recuerda el cronómetro en marcha", () => {
  const c = iniciar(60_000, T);
  guardarCronometro(c);
  expect(leerCronometro()).toEqual(c);
  guardarCronometro(null);
  expect(leerCronometro()).toBeNull();
});
