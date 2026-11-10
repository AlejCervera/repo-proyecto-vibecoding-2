import { useState } from "react";
import { guardarEntrenamiento } from "../api/entrenamientos";
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
  const [enDiario, setEnDiario] = useState<number | null>(null); // id del entrenamiento guardado
  const [guardandoDiario, setGuardandoDiario] = useState(false);

  async function guardarEnDiario() {
    setGuardandoDiario(true);
    setError(null);
    try {
      const e = await guardarEntrenamiento(rutina.id, hoy);
      setEnDiario(e.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar");
    } finally {
      setGuardandoDiario(false);
    }
  }

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

      {total > 0 && enDiario === null && (
        <button
          type="button"
          className="primario grande"
          onClick={guardarEnDiario}
          disabled={guardandoDiario}
        >
          Guardar en el diario
        </button>
      )}
      {enDiario !== null && (
        <p role="status">
          Guardado en el diario.{" "}
          <a href={enlace({ pantalla: "entrenamiento", entrenamientoId: enDiario })}>
            Ver en el diario
          </a>
        </p>
      )}

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
      <p>
        <small>
          Las series ya están en el historial de cada ejercicio, las guardes o no en el diario.
        </small>
      </p>
      <a href={enlace({ pantalla: "inicio" })}>Ir al inicio</a>
    </article>
  );
}
