import { expect, test } from "vitest";
import {
  ajustarDuracion,
  enPausa,
  formatear,
  fraccion,
  sumarTiempo,
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

test("+15 s / −15 s sobre el descanso en marcha cambian lo que queda y el total", () => {
  const c = iniciar(90_000, T);
  const mas = sumarTiempo(c, 15_000, T + 30_000); // quedaban 60 s
  expect(restante(mas, T + 30_000)).toBe(75_000);
  expect(mas.duracion).toBe(105_000);
  const menos = sumarTiempo(c, -15_000, T + 30_000);
  expect(restante(menos, T + 30_000)).toBe(45_000);
  expect(menos.duracion).toBe(75_000);
});

test("−15 s nunca deja el descanso por debajo de 0, y funciona en pausa", () => {
  const casiFin = sumarTiempo(iniciar(60_000, T), -15_000, T + 55_000);
  expect(restante(casiFin, T + 55_000)).toBe(0);
  const pausado = pausar(iniciar(60_000, T), T + 10_000); // quedan 50 s
  const mas = sumarTiempo(pausado, 15_000, T + 99_000);
  expect(enPausa(mas)).toBe(true);
  expect(restante(mas, T + 200_000)).toBe(65_000);
});

test("fracción del anillo: de 1 a 0", () => {
  const c = iniciar(120_000, T);
  expect(fraccion(c, T)).toBe(1);
  expect(fraccion(c, T + 30_000)).toBe(0.75);
  expect(fraccion(c, T + 999_000)).toBe(0);
});

test("ajustar la duración: de 15 s en 15 s, entre 15 s y 10 min", () => {
  expect(ajustarDuracion(90_000, 1)).toBe(105_000);
  expect(ajustarDuracion(90_000, -1)).toBe(75_000);
  expect(ajustarDuracion(15_000, -1)).toBe(15_000);
  expect(ajustarDuracion(600_000, 1)).toBe(600_000);
});

test("descanso por ejercicio: el suyo, si no el último elegido y, si no, 1:30", () => {
  localStorage.clear();
  expect(leerDuracion(10)).toBe(90_000);
  guardarDuracion(180_000, 10);
  expect(leerDuracion(10)).toBe(180_000);
  // Otro ejercicio sin descanso propio usa el último elegido
  expect(leerDuracion(11)).toBe(180_000);
  guardarDuracion(60_000, 11);
  expect(leerDuracion(10)).toBe(180_000);
  expect(leerDuracion(11)).toBe(60_000);
  expect(leerDuracion()).toBe(60_000);
  localStorage.clear();
});

test("un descanso guardado fuera de rango o roto no se usa", () => {
  localStorage.clear();
  localStorage.setItem("gymlog-descanso", "7");
  localStorage.setItem("gymlog-descanso-10", "nada");
  expect(leerDuracion(10)).toBe(90_000);
  localStorage.clear();
});

test("recuerda el cronómetro en marcha", () => {
  const c = iniciar(60_000, T);
  guardarCronometro(c);
  expect(leerCronometro()).toEqual(c);
  guardarCronometro(null);
  expect(leerCronometro()).toBeNull();
});
