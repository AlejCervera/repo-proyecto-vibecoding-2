import { useEffect, useState } from "react";
import { obtenerHistorial, type Historial } from "../api/historial";
import { ApiError } from "../api/http";
import { EjercicioImagen } from "../ejercicios/EjercicioImagen";
import { enlace } from "../navegacion";
import { formatearFecha, pesoPorReps } from "../series/serie";

type Props = { ejercicioId: number; onSesionCaducada: () => void };

export function HistorialPage({ ejercicioId, onSesionCaducada }: Props) {
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerHistorial(ejercicioId)
      .then(setHistorial)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [ejercicioId, onSesionCaducada]);

  const volver = <a href={enlace({ pantalla: "diario" })}>← Volver</a>;

  if (error) {
    return (
      <section>
        {volver}
        <p role="alert">{error}</p>
      </section>
    );
  }
  if (!historial) return <p>Cargando…</p>;

  const { ejercicio, series } = historial;
  return (
    <section>
      {volver}
      <h2>Historial: {ejercicio.nombre}</h2>
      <EjercicioImagen
        ejercicio={ejercicio}
        onCambio={(e) => setHistorial({ ...historial, ejercicio: e })}
      />
      {series.length === 0 ? (
        <p>Aún no has registrado series de este ejercicio.</p>
      ) : (
        <ul aria-label="Historial">
          {series.map((s) => (
            <li key={s.id}>
              <time dateTime={s.fecha}>{formatearFecha(s.fecha)}</time> · {pesoPorReps(s)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
