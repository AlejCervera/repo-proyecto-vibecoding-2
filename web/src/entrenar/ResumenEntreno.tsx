import { useState } from "react";
import { configurarEjercicio } from "../api/rutinas";
import { enlace } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { pesoPorReps, type Serie } from "../series/serie";
import { cambiosPendientes } from "./plan";
import { seriesDeHoy } from "./progreso";

type Props = {
  rutina: Rutina;
  series: Serie[];
  hoy: string;
  ajustes: Record<number, number>;
  onRutinaGuardada: (r: Rutina) => void;
};

/** Resumen del día y, si cambiaste las series en una rutina tuya, la opción de guardarlas. */
export function ResumenEntreno({ rutina, series, hoy, ajustes, onRutinaGuardada }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filas = rutina.ejercicios.map((e) => ({
    ...e,
    deHoy: seriesDeHoy(
      series.filter((s) => s.ejercicio_id === e.id),
      hoy,
    ),
  }));
  const total = filas.reduce((n, f) => n + f.deHoy.length, 0);
  const cambios = rutina.predefinida ? [] : cambiosPendientes(rutina, ajustes);

  async function guardarEnRutina() {
    setGuardando(true);
    setError(null);
    try {
      let actualizada = rutina;
      for (const c of cambios) {
        actualizada = await configurarEjercicio(rutina.id, c.id, { series: c.ahora });
      }
      setGuardado(true);
      onRutinaGuardada(actualizada);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <article aria-label="Resumen del entrenamiento">
      <h3>Resumen de hoy</h3>
      <p>
        {total === 0
          ? "Hoy no has registrado series de esta rutina."
          : `${total} ${total === 1 ? "serie" : "series"} en total.`}
      </p>
      <ul>
        {filas.map((f) => (
          <li key={f.id}>
            {f.nombre}:{" "}
            {f.deHoy.length > 0 ? f.deHoy.map(pesoPorReps).join(" · ") : "sin series"}
          </li>
        ))}
      </ul>

      {cambios.length > 0 && (
        <aside aria-label="Cambios en la rutina">
          <p>Hoy cambiaste las series previstas:</p>
          <ul>
            {cambios.map((c) => (
              <li key={c.id}>
                {c.nombre}: {c.antes} → {c.ahora} series
              </li>
            ))}
          </ul>
          <button type="button" onClick={guardarEnRutina} disabled={guardando}>
            Guardar en la rutina
          </button>{" "}
          <small>Si no, la rutina se queda como estaba.</small>
        </aside>
      )}
      {guardado && <p role="status">Guardado en la rutina «{rutina.nombre}».</p>}
      {error && <p role="alert">{error}</p>}
      <a href={enlace({ pantalla: "diario" })}>Ir al diario</a>
    </article>
  );
}
