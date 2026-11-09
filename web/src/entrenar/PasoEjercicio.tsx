import { useEffect, useState, type FormEvent } from "react";
import { obtenerHistorial, type Historial } from "../api/historial";
import { crearSerie } from "../api/series";
import { EjercicioImagen } from "../ejercicios/EjercicioImagen";
import { enlaceHistorial } from "../navegacion";
import { aPeticion, formatearFecha, pesoPorReps, type Serie } from "../series/serie";
import { seriesDeHoy, ultimaSesion, valoresIniciales } from "./progreso";

type Props = {
  ejercicioId: number;
  hoy: string;
  /** Se llama tras guardar cada serie (aquí arrancará el cronómetro de descanso, Fase 7b). */
  onGuardada: (s: Serie) => void;
};

const enLinea = (series: Serie[]) => series.map(pesoPorReps).join(" · ");

/** Un ejercicio de la rutina: referencia de la última vez, lo de hoy y el formulario. */
export function PasoEjercicio({ ejercicioId, hoy, onGuardada }: Props) {
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [peso, setPeso] = useState("");
  const [repeticiones, setRepeticiones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerHistorial(ejercicioId)
      .then((h) => {
        setHistorial(h);
        const v = valoresIniciales(h.series, hoy);
        setPeso(v.peso);
        setRepeticiones(v.repeticiones);
      })
      .catch((e: Error) => setError(e.message));
  }, [ejercicioId, hoy]);

  if (!historial) return error ? <p role="alert">{error}</p> : <p>Cargando…</p>;

  const { ejercicio, series } = historial;
  const anterior = ultimaSesion(series, hoy);
  const deHoy = seriesDeHoy(series, hoy);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const datos = aPeticion({ fecha: hoy, ejercicio, peso, repeticiones });
      const nueva = await crearSerie(datos);
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
      <p aria-label="Series de hoy">
        <strong>Hoy:</strong> {deHoy.length > 0 ? enLinea(deHoy) : "aún ninguna"}
      </p>
      <form onSubmit={guardar} noValidate aria-label="Registrar serie del entrenamiento">
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
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
