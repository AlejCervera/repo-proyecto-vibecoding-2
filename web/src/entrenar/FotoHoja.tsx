import { EjercicioImagen } from "../ejercicios/EjercicioImagen";
import type { Ejercicio } from "../ejercicios/ejercicio";
import { enlaceHistorial } from "../navegacion";
import { pesoPorReps, type Serie } from "../series/serie";
import { HojaInferior } from "../ui/HojaInferior";
import { mejorSerie } from "./estadisticas";
import { ultimaSesion } from "./progreso";

type Props = {
  ejercicio: Ejercicio;
  series: Serie[];
  hoy: string;
  onCambio: (e: Ejercicio) => void;
  onCerrar: () => void;
};

/** Al tocar la foto en círculo: la imagen en grande, la mejor serie, la última vez y el historial. */
export function FotoHoja({ ejercicio, series, hoy, onCambio, onCerrar }: Props) {
  const mejor = mejorSerie(series);
  const ultima = ultimaSesion(series, hoy);
  return (
    <HojaInferior titulo={ejercicio.nombre} onCerrar={onCerrar}>
      <EjercicioImagen ejercicio={ejercicio} onCambio={onCambio} />
      <dl className="datos-ejercicio">
        <div>
          <dt>Mejor serie</dt>
          <dd>{mejor ? pesoPorReps(mejor) : "—"}</dd>
        </div>
        <div>
          <dt>La última vez</dt>
          <dd>{ultima ? ultima.series.map(pesoPorReps).join(" · ") : "—"}</dd>
        </div>
      </dl>
      <div className="hoja-acciones">
        <a className="boton" href={enlaceHistorial(ejercicio.id)}>
          Ver historial
        </a>
      </div>
    </HojaInferior>
  );
}
