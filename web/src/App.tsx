import { useEffect, useState } from "react";
import { listarSeries } from "./api/series";
import type { Serie } from "./series/serie";
import { SeriesForm } from "./series/SeriesForm";
import { SeriesList } from "./series/SeriesList";

export const APP_NAME = "Gym Log";

export function App() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarSeries()
      .then(setSeries)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <SeriesForm onCreada={(s) => setSeries((prev) => [s, ...prev])} />
      {error ? <p role="alert">{error}</p> : <SeriesList series={series} />}
    </main>
  );
}
