import { useEffect, useState } from "react";
import { listarEntrenamientos, type EntradaDiario } from "../api/entrenamientos";
import { ApiError } from "../api/http";
import { fechaCorta } from "../inicio/resumen";
import { enlace } from "../navegacion";

type Props = { onSesionCaducada: () => void };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function resumenEntrada(e: EntradaDiario): string {
  return `${plural(e.num_ejercicios, "ejercicio", "ejercicios")} · ${plural(e.num_series, "serie", "series")}`;
}

/** Lista de entrenamientos guardados, del más reciente al más antiguo. */
export function DiarioPage({ onSesionCaducada }: Props) {
  const [entradas, setEntradas] = useState<EntradaDiario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarEntrenamientos()
      .then(setEntradas)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [onSesionCaducada]);

  return (
    <section>
      <h2>Diario</h2>
      {error && <p role="alert">{error}</p>}
      {entradas === null && !error && <p>Cargando…</p>}
      {entradas?.length === 0 && (
        <p>
          Aún no hay entrenamientos en el diario. Entrena con una rutina y, al terminar, pulsa
          «Guardar en el diario». <a href={enlace({ pantalla: "rutinas" })}>Ir a rutinas</a>
        </p>
      )}
      {entradas && entradas.length > 0 && (
        <ul aria-label="Entrenamientos">
          {entradas.map((e) => (
            <li key={e.id}>
              <a href={enlace({ pantalla: "entrenamiento", entrenamientoId: e.id })}>
                <strong>{fechaCorta(e.fecha)}</strong> · {e.rutina_nombre}
              </a>
              <br />
              <small>{resumenEntrada(e)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
