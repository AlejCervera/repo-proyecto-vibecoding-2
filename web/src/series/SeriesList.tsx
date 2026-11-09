import type { Serie } from "./serie";
import { SerieFila } from "./SerieFila";

type Props = {
  series: Serie[];
  etiqueta?: string;
  mostrarEjercicio?: boolean;
  vacio?: string;
  onCambiada: (s: Serie) => void;
  onBorrada: (id: number) => void;
};

export function SeriesList({
  series,
  etiqueta = "Series",
  mostrarEjercicio = true,
  vacio = "Aún no hay series.",
  onCambiada,
  onBorrada,
}: Props) {
  if (series.length === 0) return <p>{vacio}</p>;
  return (
    <ul aria-label={etiqueta}>
      {series.map((s) => (
        <SerieFila
          key={s.id}
          serie={s}
          mostrarEjercicio={mostrarEjercicio}
          onCambiada={onCambiada}
          onBorrada={onBorrada}
        />
      ))}
    </ul>
  );
}
