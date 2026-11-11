import { useState, type FormEvent } from "react";
import type { CambiosPlan } from "../api/rutinas";
import { enlaceHistorial } from "../navegacion";
import { FotoCirculo } from "../ui/FotoCirculo";
import { HojaInferior } from "../ui/HojaInferior";
import { IconoAbajo, IconoArriba, IconoCerrar, IconoMas, IconoMenos } from "../ui/iconos";
import { MAX_SERIES, MIN_SERIES, parsearReps, textoPlan, textoReps, type EjercicioRutina } from "./rutina";

type Props = {
  ejercicio: EjercicioRutina;
  editable: boolean;
  primero: boolean;
  ultimo: boolean;
  ocupado: boolean;
  onMover: (direccion: -1 | 1) => void;
  /** Pide quitarlo (la pantalla de la rutina confirma antes). */
  onQuitar: () => void;
  onConfigurar: (cambios: CambiosPlan) => void;
};

/** Un ejercicio de la rutina en tarjeta: nombre, plan, series con − / +, objetivo y orden. */
export function EjercicioRutinaFila({
  ejercicio: e,
  editable,
  primero,
  ultimo,
  ocupado,
  onMover,
  onQuitar,
  onConfigurar,
}: Props) {
  const [editandoReps, setEditandoReps] = useState(false);
  const [reps, setReps] = useState("");
  const [error, setError] = useState<string | null>(null);

  function guardarReps(ev: FormEvent) {
    ev.preventDefault();
    try {
      onConfigurar(parsearReps(reps));
      setEditandoReps(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Valor no válido");
    }
  }

  const objetivo = textoReps(e);

  return (
    <li className="tarjeta-ejercicio">
      <div className="tarjeta-ejercicio-cabecera">
        <FotoCirculo nombre={e.nombre} tamano={32} />
        <div className="tarjeta-ejercicio-nombre">
          <a href={enlaceHistorial(e.id)}>{e.nombre}</a>
          <span className="plan">{textoPlan(e)}</span>
        </div>
        {editable && (
          <button
            type="button"
            className="boton-redondo discreto"
            aria-label={`Quitar ${e.nombre}`}
            disabled={ocupado}
            onClick={onQuitar}
          >
            <IconoCerrar tamano={18} />
          </button>
        )}
      </div>

      {editable && (
        <div className="tarjeta-ejercicio-controles">
          <div className="grupo-series" role="group" aria-label={`Series de ${e.nombre}`}>
            <button
              type="button"
              aria-label={`Menos series de ${e.nombre}`}
              disabled={ocupado || e.series <= MIN_SERIES}
              onClick={() => onConfigurar({ series: e.series - 1 })}
            >
              <IconoMenos tamano={18} />
            </button>
            <span className="valor-series">
              {e.series}
              <span className="oculto"> {e.series === 1 ? "serie" : "series"}</span>
            </span>
            <button
              type="button"
              aria-label={`Más series de ${e.nombre}`}
              disabled={ocupado || e.series >= MAX_SERIES}
              onClick={() => onConfigurar({ series: e.series + 1 })}
            >
              <IconoMas tamano={18} />
            </button>
          </div>
          <button
            type="button"
            className="pildora-reps"
            aria-label={`Repeticiones objetivo de ${e.nombre}`}
            onClick={() => {
              setReps(objetivo);
              setError(null);
              setEditandoReps(true);
            }}
          >
            {objetivo ? `${objetivo} reps` : "Sin objetivo"}
          </button>
          <div className="grupo-orden">
            <button
              type="button"
              aria-label={`Subir ${e.nombre}`}
              disabled={ocupado || primero}
              onClick={() => onMover(-1)}
            >
              <IconoArriba tamano={18} />
            </button>
            <button
              type="button"
              aria-label={`Bajar ${e.nombre}`}
              disabled={ocupado || ultimo}
              onClick={() => onMover(1)}
            >
              <IconoAbajo tamano={18} />
            </button>
          </div>
        </div>
      )}

      {editandoReps && (
        <HojaInferior titulo={`Objetivo de ${e.nombre}`} onCerrar={() => setEditandoReps(false)}>
          <form onSubmit={guardarReps} aria-label={`Objetivo de ${e.nombre}`} className="formulario-hoja">
            <label>
              Repeticiones objetivo
              <input
                value={reps}
                onChange={(ev) => setReps(ev.target.value)}
                placeholder="8-12"
              />
            </label>
            <small>Un número («10») o un rango («8-12»). Déjalo vacío para no tener objetivo.</small>
            {error && <p role="alert">{error}</p>}
            <button type="submit" className="grande" disabled={ocupado}>
              Guardar objetivo
            </button>
          </form>
        </HojaInferior>
      )}
    </li>
  );
}
