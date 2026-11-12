import { useEffect } from "react";
import { leerCambios, leerSemana } from "../api/plan";
import { hayPlan, queToca } from "../diario/calendario";
import { ir } from "../navegacion";
import { hoyISO } from "../series/serie";
import { leerUltimaRutina } from "./resumen";

/**
 * Atajo «Iniciar entrenamiento» del icono del móvil: la rutina que toca hoy según el plan;
 * sin plan (o si falla la carga), la última usada; si tampoco, elegir una.
 */
export function Empezar() {
  useEffect(() => {
    const hoy = hoyISO();
    const sinPlan = () => {
      const ultima = leerUltimaRutina();
      if (ultima) ir({ pantalla: "entrenar", rutinaId: ultima.id, paso: 0 });
      else ir({ pantalla: "rutinas" });
    };
    Promise.all([leerSemana(), leerCambios(hoy, hoy)])
      .then(([semana, cambios]) => {
        const plan = { semana, cambios };
        if (!hayPlan(plan)) return sinPlan();
        const { rutina } = queToca(hoy, plan);
        // Hoy toca descanso: a elegir rutina, por si se quiere entrenar igualmente
        if (rutina) ir({ pantalla: "entrenar", rutinaId: rutina.id, paso: 0 });
        else ir({ pantalla: "rutinas" });
      })
      .catch(sinPlan);
  }, []);
  return <p>Abriendo el entrenamiento…</p>;
}
