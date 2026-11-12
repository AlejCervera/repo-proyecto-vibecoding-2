import type { EntradaDiario } from "../api/entrenamientos";
import { fechaLarga } from "../inicio/resumen";
import { enlace } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { HojaInferior } from "../ui/HojaInferior";
import { estadoDia, queToca, TEXTO_ESTADO, type Plan } from "./calendario";
import { resumenEntrada } from "./entrada";

type Props = {
  fecha: string;
  hoy: string;
  plan: Plan;
  diario: EntradaDiario[];
  rutinas: Rutina[];
  ocupado: boolean;
  error: string | null;
  /** Cambiar solo este día: id de rutina o null (descanso). */
  onCambiar: (rutinaId: number | null) => void;
  onVolverAlPlan: () => void;
  onCerrar: () => void;
};

const DESCANSO = "descanso";

/** Hoja de un día del calendario: qué tocaba, qué se hizo y, si aún no ha pasado, cambiarlo. */
export function HojaDia({ fecha, hoy, plan, diario, rutinas, ocupado, error, onCambiar, onVolverAlPlan, onCerrar }: Props) {
  const { rutina, cambiado } = queToca(fecha, plan);
  const estado = estadoDia(fecha, hoy, plan, diario);
  const hechos = diario.filter((e) => e.fecha === fecha);
  const editable = fecha >= hoy;
  const titulo = fechaLarga(fecha);

  return (
    <HojaInferior titulo={titulo} onCerrar={onCerrar}>
      <p className="hoja-dia-toca">
        {fecha < hoy ? "Tocaba" : "Toca"}: <strong>{rutina ? rutina.nombre : "descanso"}</strong>
        {cambiado && <small> (cambiado solo este día)</small>}
        <span className={`estado-dia ${estado}`}>{TEXTO_ESTADO[estado]}</span>
      </p>

      {hechos.length > 0 && (
        <ul aria-label="Entrenos de ese día" className="entrenos-dia">
          {hechos.map((e) => (
            <li key={e.id}>
              <a href={enlace({ pantalla: "entrenamiento", entrenamientoId: e.id })}>{e.rutina_nombre}</a>{" "}
              <small>{resumenEntrada(e)}</small>
            </li>
          ))}
        </ul>
      )}

      {fecha === hoy && rutina && estado !== "hecho" && (
        <a className="boton primario grande" href={enlace({ pantalla: "entrenar", rutinaId: rutina.id, paso: 0 })}>
          Empezar {rutina.nombre}
        </a>
      )}

      {editable && (
        <div className="formulario-hoja">
          <label>
            Cambiar solo este día
            <select
              value={rutina ? String(rutina.id) : DESCANSO}
              disabled={ocupado}
              onChange={(e) => onCambiar(e.target.value === DESCANSO ? null : Number(e.target.value))}
            >
              <option value={DESCANSO}>Descanso</option>
              {rutinas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </label>
          {cambiado && (
            <button type="button" disabled={ocupado} onClick={onVolverAlPlan}>
              Volver al plan
            </button>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </HojaInferior>
  );
}
