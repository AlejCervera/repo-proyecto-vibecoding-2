import { formatearSerie, type Serie } from "./serie";

export function SeriesList({ series }: { series: Serie[] }) {
  if (series.length === 0) return <p>Aún no hay series.</p>;
  return (
    <ul aria-label="Series">
      {series.map((s) => (
        <li key={s.id}>
          <time dateTime={s.fecha}>{s.fecha}</time> — {formatearSerie(s)}
        </li>
      ))}
    </ul>
  );
}
