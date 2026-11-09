import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { listarSeries } from "../api/series";
import { ordenarSeries, reemplazarSerie, type Serie } from "./serie";
import { SeriesForm } from "./SeriesForm";
import { SeriesList } from "./SeriesList";

type Props = { onSesionCaducada: () => void };

export function SeriesPage({ onSesionCaducada }: Props) {
  const [series, setSeries] = useState<Serie[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarSeries()
      .then(setSeries)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [onSesionCaducada]);

  return (
    <>
      <SeriesForm onCreada={(s) => setSeries((prev) => ordenarSeries([s, ...prev]))} />
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <SeriesList
          series={series}
          onCambiada={(s) => setSeries((prev) => reemplazarSerie(prev, s))}
          onBorrada={(id) => setSeries((prev) => prev.filter((s) => s.id !== id))}
        />
      )}
    </>
  );
}
