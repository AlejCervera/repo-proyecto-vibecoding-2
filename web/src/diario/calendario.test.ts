import { expect, test } from "vitest";
import type { EntradaDiario } from "../api/entrenamientos";
import {
  cuadriculaMes,
  cumplimientoSemana,
  diaSemana,
  estadoDia,
  hayPlan,
  limitesMes,
  queToca,
  racha,
  sumarDias,
  type Plan,
} from "./calendario";

const PUSH = { id: 1, nombre: "Push" };
const PIERNA = { id: 2, nombre: "Pierna" };
// L Push · M descanso · X Pierna · J descanso · V Push · S y D descanso
const SEMANA = [PUSH, null, PIERNA, null, PUSH, null, null];
const plan = (cambios: Plan["cambios"] = []): Plan => ({ semana: SEMANA, cambios });
let id = 0;
const entreno = (fecha: string, rutina_id: number | null): EntradaDiario => ({
  id: ++id,
  fecha,
  rutina_id,
  rutina_nombre: "x",
  num_ejercicios: 1,
  num_series: 3,
});

test("día de la semana empezando en lunes", () => {
  expect(diaSemana("2026-11-09")).toBe(0); // lunes
  expect(diaSemana("2026-11-15")).toBe(6); // domingo
});

test("sumar días, también al cambiar de mes y de año", () => {
  expect(sumarDias("2026-11-30", 1)).toBe("2026-12-01");
  expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  expect(sumarDias("2027-03-01", -1)).toBe("2027-02-28");
});

test("cuadrícula del mes: empieza en lunes y completa semanas", () => {
  // Noviembre de 2026 empieza en domingo: 6 huecos antes
  const nov = cuadriculaMes(2026, 10);
  expect(nov.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
  expect(nov.length % 7).toBe(0);
  expect(nov.filter(Boolean)).toHaveLength(30);
  expect(nov.filter(Boolean).at(-1)).toBe("2026-11-30");
  // Febrero de 2027 (28 días) empieza en lunes: 4 semanas justas
  expect(cuadriculaMes(2027, 1)).toHaveLength(28);
  expect(limitesMes(2028, 1)).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" }); // bisiesto
});

test("qué toca: el cambio del día manda sobre el plan semanal", () => {
  expect(queToca("2026-11-09", plan())).toEqual({ rutina: PUSH, cambiado: false }); // lunes
  expect(queToca("2026-11-10", plan())).toEqual({ rutina: null, cambiado: false }); // martes
  const cambios = [
    { fecha: "2026-11-09", rutina: null },
    { fecha: "2026-11-10", rutina: PIERNA },
  ];
  expect(queToca("2026-11-09", plan(cambios))).toEqual({ rutina: null, cambiado: true });
  expect(queToca("2026-11-10", plan(cambios))).toEqual({ rutina: PIERNA, cambiado: true });
});

test("hay plan si algún día tiene rutina", () => {
  expect(hayPlan({ semana: Array(7).fill(null), cambios: [] })).toBe(false);
  expect(hayPlan({ semana: Array(7).fill(null), cambios: [{ fecha: "2026-11-12", rutina: PUSH }] })).toBe(true);
  expect(hayPlan(plan())).toBe(true);
});

test("estado de cada día: planeado frente a hecho", () => {
  const hoy = "2026-11-13"; // viernes
  const diario = [entreno("2026-11-09", 1), entreno("2026-11-10", 2), entreno("2026-11-11", 1)];
  expect(estadoDia("2026-11-09", hoy, plan(), diario)).toBe("hecho"); // lunes Push → Push
  expect(estadoDia("2026-11-10", hoy, plan(), diario)).toBe("otra"); // martes descanso → entrenó
  expect(estadoDia("2026-11-11", hoy, plan(), diario)).toBe("otra"); // miércoles Pierna → Push
  expect(estadoDia("2026-11-12", hoy, plan(), diario)).toBe("descanso");
  expect(estadoDia("2026-11-13", hoy, plan(), diario)).toBe("pendiente"); // hoy toca Push
  expect(estadoDia("2026-11-16", hoy, plan(), diario)).toBe("futuro"); // el lunes que viene
  expect(estadoDia("2026-11-02", hoy, plan(), diario)).toBe("no-hecho"); // lunes pasado sin nada
});

test("cumplimiento de la semana: días planificados en los que se entrenó", () => {
  const hoy = "2026-11-13"; // viernes: lunes, miércoles y viernes tocan
  expect(cumplimientoSemana(hoy, plan(), [])).toEqual({ planificados: 3, hechos: 0 });
  const diario = [entreno("2026-11-09", 1), entreno("2026-11-11", 1)];
  expect(cumplimientoSemana(hoy, plan(), diario)).toEqual({ planificados: 3, hechos: 2 });
});

test("racha: los descansos no la rompen, un entreno saltado sí, hoy pendiente no", () => {
  const hoy = "2026-11-13"; // viernes, hoy aún sin entrenar
  const diario = [
    entreno("2026-11-02", 1), // lunes anterior
    // miércoles 04 tocaba Pierna y no se hizo: corta la racha
    entreno("2026-11-06", 1),
    entreno("2026-11-09", 1),
    entreno("2026-11-11", 2),
  ];
  expect(racha(hoy, plan(), diario)).toBe(3); // 06, 09 y 11
  expect(racha(hoy, plan(), [...diario, entreno(hoy, 1)])).toBe(4);
  expect(racha(hoy, plan(), [])).toBe(0);
});
