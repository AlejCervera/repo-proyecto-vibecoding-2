import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { listarSeries } from "../api/series";
import type { Serie } from "./serie";
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
      <SeriesForm onCreada={(s) => setSeries((prev) => [s, ...prev])} />
      {error ? <p role="alert">{error}</p> : <SeriesList series={series} />}
    </>
  );
}
