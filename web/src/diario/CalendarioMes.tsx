import type { EntradaDiario } from "../api/entrenamientos";
import { fechaLarga } from "../inicio/resumen";
import { cuadriculaMes, estadoDia, queToca, TEXTO_ESTADO, type Plan } from "./calendario";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const CABECERA = ["L", "M", "X", "J", "V", "S", "D"];

type Props = {
  anio: number;
  /** De 0 (enero) a 11. */
  mes: number;
  hoy: string;
  plan: Plan;
  diario: EntradaDiario[];
  onCambiarMes: (delta: -1 | 1) => void;
  onElegirDia: (fecha: string) => void;
};

/** Calendario del mes: lo planeado frente a lo hecho en cada día. Al tocar un día, su detalle. */
export function CalendarioMes({ anio, mes, hoy, plan, diario, onCambiarMes, onElegirDia }: Props) {
  const titulo = `${MESES[mes]} de ${anio}`;
  return (
    <section className="calendario tarjeta" aria-label="Calendario">
      <div className="calendario-cabecera">
        <button type="button" className="boton-redondo discreto" aria-label="Mes anterior" onClick={() => onCambiarMes(-1)}>
          ‹
        </button>
        <h3>{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h3>
        <button type="button" className="boton-redondo discreto" aria-label="Mes siguiente" onClick={() => onCambiarMes(1)}>
          ›
        </button>
      </div>
      <div className="calendario-semana" aria-hidden="true">
        {CABECERA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <ol className="calendario-dias" aria-label={`Días de ${titulo}`}>
        {cuadriculaMes(anio, mes).map((fecha, i) => {
          if (!fecha) return <li key={`hueco-${i}`} className="hueco" aria-hidden="true" />;
          const estado = estadoDia(fecha, hoy, plan, diario);
          const { rutina } = queToca(fecha, plan);
          const etiqueta = `${fechaLarga(fecha)}: ${TEXTO_ESTADO[estado]}${rutina ? ` · ${rutina.nombre}` : ""}`;
          return (
            <li key={fecha}>
              <button
                type="button"
                className={`dia-calendario ${estado}${fecha === hoy ? " hoy" : ""}`}
                aria-label={etiqueta}
                aria-current={fecha === hoy ? "date" : undefined}
                onClick={() => onElegirDia(fecha)}
              >
                <span className="numero">{Number(fecha.slice(8))}</span>
                <span className="marca" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="leyenda" aria-label="Leyenda">
        <li className="hecho">Hecho</li>
        <li className="otra">Otra cosa</li>
        <li className="no-hecho">No hecho</li>
        <li className="futuro">Toca</li>
      </ul>
    </section>
  );
}
