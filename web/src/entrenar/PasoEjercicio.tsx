import { useEffect, useState, type FormEvent } from "react";
import { obtenerHistorial, type Historial } from "../api/historial";
import { crearSerie } from "../api/series";
import { EjercicioImagen } from "../ejercicios/EjercicioImagen";
import { enlaceHistorial } from "../navegacion";
import { MAX_SERIES, textoPlan } from "../rutinas/rutina";
import { aPeticion, formatearFecha, pesoPorReps, type Serie } from "../series/serie";
import { casillas, puedeQuitar } from "./plan";
import { seriesDeHoy, ultimaSesion, valoresIniciales } from "./progreso";

type Props = {
  ejercicioId: number;
  hoy: string;
  /** Series previstas para hoy y repeticiones objetivo. */
  previstas: number;
  repsMin: number | null;
  repsMax: number | null;
  onCambiarPrevistas: (n: number) => void;
  /** Se llama tras guardar cada serie (aquí arrancará el cronómetro de descanso, Fase 7b). */
  onGuardada: (s: Serie) => void;
};

const enLinea = (series: Serie[]) => series.map(pesoPorReps).join(" · ");

/** Un ejercicio de la rutina: la última vez, las casillas de hoy y el formulario de la siguiente. */
export function PasoEjercicio(props: Props) {
  const { ejercicioId, hoy, previstas, repsMin, repsMax, onCambiarPrevistas, onGuardada } = props;
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [peso, setPeso] = useState("");
  const [repeticiones, setRepeticiones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Si la carga se repite o se cancela, su respuesta tardía no debe pisar lo ya escrito.
    let vigente = true;
    obtenerHistorial(ejercicioId)
      .then((h) => {
        if (!vigente) return;
        setHistorial(h);
        const v = valoresIniciales(h.series, hoy);
        setPeso(v.peso);
        setRepeticiones(v.repeticiones || (repsMin ? String(repsMin) : ""));
      })
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
    // repsMin solo sirve para el valor inicial: no se recarga el historial si cambia
  }, [ejercicioId, hoy]);

  if (!historial) return error ? <p role="alert">{error}</p> : <p>Cargando…</p>;

  const { ejercicio, series } = historial;
  const anterior = ultimaSesion(series, hoy);
  const hechas = seriesDeHoy(series, hoy);
  const estado = casillas(hechas.length, previstas);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const nueva = await crearSerie(aPeticion({ fecha: hoy, ejercicio, peso, repeticiones }));
      setHistorial((h) => h && { ...h, series: [nueva, ...h.series] });
      onGuardada(nueva);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <article aria-label={ejercicio.nombre}>
      <h3>{ejercicio.nombre}</h3>
      <EjercicioImagen
        ejercicio={ejercicio}
        onCambio={(e) => setHistorial((h) => h && { ...h, ejercicio: e })}
      />
      <p>
        <strong>Objetivo:</strong> {textoPlan({ series: previstas, reps_min: repsMin, reps_max: repsMax })}
      </p>
      <p>
        {anterior ? (
          <>
            <strong>La última vez ({formatearFecha(anterior.fecha)}):</strong>{" "}
            {enLinea(anterior.series)}
          </>
        ) : (
          "Primera vez con este ejercicio."
        )}{" "}
        <a href={enlaceHistorial(ejercicio.id)}>Ver historial</a>
      </p>

      <ol aria-label="Series de hoy">
        {hechas.map((s, i) => (
          <li key={s.id}>
            ✓ Serie {i + 1} · {pesoPorReps(s)}
          </li>
        ))}
        {estado.siguiente !== null && (
          <li aria-current="step">
            <form onSubmit={guardar} noValidate aria-label={`Serie ${estado.siguiente}`}>
              ▶ Serie {estado.siguiente}{" "}
              <label>
                Peso (kg)
                <input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
              </label>{" "}
              <label>
                Repeticiones
                <input
                  inputMode="numeric"
                  value={repeticiones}
                  onChange={(e) => setRepeticiones(e.target.value)}
                />
              </label>{" "}
              <button type="submit" disabled={guardando}>
                Guardar serie
              </button>
            </form>
          </li>
        )}
        {Array.from({ length: estado.pendientes }, (_, i) => (
          <li key={`pendiente-${i}`}>Serie {(estado.siguiente ?? 0) + i + 1}</li>
        ))}
      </ol>
      {estado.completado && <p role="status">¡Ejercicio completado!</p>}
      <p>
        <button
          type="button"
          disabled={previstas >= MAX_SERIES}
          onClick={() => onCambiarPrevistas(previstas + 1)}
        >
          + Añadir serie
        </button>{" "}
        <button
          type="button"
          disabled={!puedeQuitar(hechas.length, previstas)}
          onClick={() => onCambiarPrevistas(previstas - 1)}
        >
          − Quitar serie
        </button>
      </p>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
