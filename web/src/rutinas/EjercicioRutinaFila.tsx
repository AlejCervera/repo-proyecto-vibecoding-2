import { useState, type FormEvent } from "react";
import type { CambiosPlan } from "../api/rutinas";
import { enlaceHistorial } from "../navegacion";
import { MAX_SERIES, MIN_SERIES, parsearReps, textoPlan, textoReps, type EjercicioRutina } from "./rutina";

type Props = {
  ejercicio: EjercicioRutina;
  editable: boolean;
  primero: boolean;
  ultimo: boolean;
  ocupado: boolean;
  onMover: (direccion: -1 | 1) => void;
  onQuitar: () => void;
  onConfigurar: (cambios: CambiosPlan) => void;
};

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

  return (
    <li>
      <a href={enlaceHistorial(e.id)}>{e.nombre}</a> — <span>{textoPlan(e)}</span>
      {editable && (
        <div>
          <button
            type="button"
            aria-label={`Menos series de ${e.nombre}`}
            disabled={ocupado || e.series <= MIN_SERIES}
            onClick={() => onConfigurar({ series: e.series - 1 })}
          >
            −
          </button>{" "}
          <button
            type="button"
            aria-label={`Más series de ${e.nombre}`}
            disabled={ocupado || e.series >= MAX_SERIES}
            onClick={() => onConfigurar({ series: e.series + 1 })}
          >
            +
          </button>{" "}
          <button
            type="button"
            aria-label={`Repeticiones objetivo de ${e.nombre}`}
            onClick={() => {
              setReps(textoReps(e));
              setError(null);
              setEditandoReps(true);
            }}
          >
            Reps ✎
          </button>{" "}
          <button
            type="button"
            aria-label={`Subir ${e.nombre}`}
            disabled={ocupado || primero}
            onClick={() => onMover(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Bajar ${e.nombre}`}
            disabled={ocupado || ultimo}
            onClick={() => onMover(1)}
          >
            ↓
          </button>{" "}
          <button type="button" aria-label={`Quitar ${e.nombre}`} disabled={ocupado} onClick={onQuitar}>
            Quitar
          </button>
        </div>
      )}
      {editandoReps && (
        <form onSubmit={guardarReps} aria-label={`Objetivo de ${e.nombre}`}>
          <label>
            Repeticiones objetivo
            <input value={reps} onChange={(ev) => setReps(ev.target.value)} placeholder="8-12" />
          </label>{" "}
          <button type="submit" disabled={ocupado}>
            Guardar objetivo
          </button>{" "}
          <button type="button" onClick={() => setEditandoReps(false)}>
            Cancelar
          </button>
          <small> Déjalo vacío para no tener objetivo.</small>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </li>
  );
}
