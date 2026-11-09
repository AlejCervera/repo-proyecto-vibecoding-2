import { useEffect, useState } from "react";
import { obtenerHistorial, type Historial } from "../api/historial";
import { ApiError } from "../api/http";
import { EjercicioImagen } from "../ejercicios/EjercicioImagen";
import { enlace } from "../navegacion";
import { reemplazarSerie } from "../series/serie";
import { SeriesList } from "../series/SeriesList";

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
      <SeriesList
        series={series}
        etiqueta="Historial"
        mostrarEjercicio={false}
        vacio="Aún no has registrado series de este ejercicio."
        onCambiada={(s) =>
          setHistorial({
            ...historial,
            // si se cambia a otro ejercicio, ya no pertenece a este historial
            series:
              s.ejercicio_id === ejercicio.id
                ? reemplazarSerie(series, s)
                : series.filter((x) => x.id !== s.id),
          })
        }
        onBorrada={(id) =>
          setHistorial({ ...historial, series: series.filter((x) => x.id !== id) })
        }
      />
    </section>
  );
}
