import { useState } from "react";
import { guardarEntrenamiento } from "../api/entrenamientos";
import { configurarEjercicio } from "../api/rutinas";
import { enlace } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { pesoPorReps, type Serie } from "../series/serie";
import {
  comparacionVolumen,
  formatearDuracion,
  formatearKilos,
  recordsDeHoy,
  volumen,
} from "./estadisticas";
import { cambiosPendientes } from "./plan";
import { seriesDeHoy } from "./progreso";

type Props = {
  rutina: Rutina;
  /** Todas las series del usuario (las de antes sirven para comparar y ver récords). */
  series: Serie[];
  hoy: string;
  /** Hora (ms) a la que empezó el entreno de hoy. */
  inicio: number;
  ajustes: Record<number, number>;
  onRutinaGuardada: (r: Rutina) => void;
};

/** Resumen del día y, si cambiaste las series en una rutina tuya, la opción de guardarlas. */
export function ResumenEntreno({ rutina, series, hoy, inicio, ajustes, onRutinaGuardada }: Props) {
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
  const ids = rutina.ejercicios.map((e) => e.id);
  const deLaRutina = series.filter((s) => ids.includes(s.ejercicio_id));
  const records = recordsDeHoy(deLaRutina, hoy);
  // Se compara solo lo hecho hoy: si te saltas un ejercicio, no cuenta como «menos»
  const hechosHoy = filas.filter((f) => f.deHoy.length > 0).map((f) => f.id);
  const comparacion = comparacionVolumen(series, hechosHoy, hoy);
  const volumenHoy = volumen(filas.flatMap((f) => f.deHoy));
  // Duración: desde que se abrió el entreno hasta que se ve el resumen
  const [duracion] = useState(() => Date.now() - inicio);

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
    <article aria-label="Resumen del entrenamiento" className="resumen">
      <h3>{total === 0 ? "Resumen de hoy" : "¡Entreno hecho!"}</h3>
      <p>
        {total === 0
          ? "Hoy no has registrado series de esta rutina."
          : `${total} ${total === 1 ? "serie" : "series"} en total.`}
      </p>

      {total > 0 && (
        <dl className="cifras" aria-label="Cifras del entreno">
          <div>
            <dt>Duración</dt>
            <dd>{formatearDuracion(duracion)}</dd>
          </div>
          <div>
            <dt>Volumen</dt>
            <dd>{formatearKilos(volumenHoy)}</dd>
          </div>
          <div>
            <dt>Series</dt>
            <dd>{total}</dd>
          </div>
        </dl>
      )}
      {total > 0 && comparacion && comparacion.anterior > 0 && (
        <p className="comparacion">
          {comparacion.diferencia === 0 ? (
            <>Has movido lo mismo que la vez anterior ({formatearKilos(comparacion.anterior)}).</>
          ) : (
            <>
              Has movido <strong>{formatearKilos(Math.abs(comparacion.diferencia))}</strong>{" "}
              {comparacion.diferencia > 0 ? "más" : "menos"} que la vez anterior (
              {formatearKilos(comparacion.anterior)}).
            </>
          )}
        </p>
      )}
      {records.length > 0 && (
        <section aria-label="Récords nuevos" className="records">
          <h4>Récords nuevos</h4>
          <ul>
            {records.map((r) => (
              <li key={r.ejercicio_id}>
                <strong>{r.ejercicio}</strong>: {pesoPorReps(r)} <small>(antes {formatearKilos(r.anterior)})</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h4>Series de hoy</h4>
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
      <p className="resumen-salidas">
        <a href={enlace({ pantalla: "rutina", rutinaId: rutina.id })}>Volver a la rutina</a>
        <a href={enlace({ pantalla: "inicio" })}>Ir al inicio</a>
      </p>
    </article>
  );
}
