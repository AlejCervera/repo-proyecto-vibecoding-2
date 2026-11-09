import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { listarRutinas } from "../api/rutinas";
import { listarSeries } from "../api/series";
import { enlace } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { hoyISO, type Serie } from "../series/serie";
import { DIAS, fechaCorta, leerUltimaRutina, semana, ultimoEntrenamiento } from "./resumen";

type Props = { onSesionCaducada: () => void };

/** Primera pantalla: empezar a entrenar, cómo va la semana y el último entrenamiento. */
export function InicioPage({ onSesionCaducada }: Props) {
  const [series, setSeries] = useState<Serie[] | null>(null);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hoy = useMemo(() => hoyISO(), []);

  useEffect(() => {
    Promise.all([listarSeries(), listarRutinas()])
      .then(([s, r]) => {
        setSeries(s);
        setRutinas(r);
      })
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [onSesionCaducada]);

  if (error) return <p role="alert">{error}</p>;
  if (!series) return <p>Cargando…</p>;

  // Solo se ofrece «continuar» si esa rutina sigue existiendo y tiene ejercicios.
  const guardada = leerUltimaRutina();
  const ultima = rutinas.find((r) => r.id === guardada?.id && r.ejercicios.length > 0);
  const esta = semana(series, hoy);
  const anterior = ultimoEntrenamiento(series);

  return (
    <section className="inicio">
      <article className="tarjeta destacada" aria-label="Entrenar">
        {ultima ? (
          <>
            <a
              className="boton primario grande"
              href={enlace({ pantalla: "entrenar", rutinaId: ultima.id, paso: 0 })}
            >
              ▶ Iniciar entrenamiento
            </a>
            <p>
              Continuar con «{ultima.nombre}» ·{" "}
              <a href={enlace({ pantalla: "rutinas" })}>o elegir otra rutina…</a>
            </p>
          </>
        ) : (
          <>
            <a className="boton primario grande" href={enlace({ pantalla: "rutinas" })}>
              ▶ Iniciar entrenamiento
            </a>
            <p>Elige una rutina (tuya o predefinida) para empezar.</p>
          </>
        )}
      </article>

      <article className="tarjeta" aria-label="Esta semana">
        <h2>Esta semana</h2>
        <p className="cifra">
          {esta.numDias} {esta.numDias === 1 ? "día" : "días"} · {esta.numSeries}{" "}
          {esta.numSeries === 1 ? "serie" : "series"}
        </p>
        <ol className="semana" aria-label="Días entrenados">
          {DIAS.map((d, i) => (
            <li key={d} className={esta.dias[i] ? "hecho" : undefined}>
              <span>{d}</span>
              <span aria-label={esta.dias[i] ? "entrenado" : "sin entrenar"}>
                {esta.dias[i] ? "●" : "○"}
              </span>
            </li>
          ))}
        </ol>
      </article>

      <article className="tarjeta" aria-label="Último entrenamiento">
        <h2>Último entrenamiento</h2>
        {anterior ? (
          <>
            <p className="cifra">
              {fechaCorta(anterior.fecha)} · {anterior.numSeries}{" "}
              {anterior.numSeries === 1 ? "serie" : "series"}
            </p>
            <p>{anterior.ejercicios.join(", ")}</p>
          </>
        ) : (
          <p>Aún no has registrado ninguna serie.</p>
        )}
      </article>

      <p>
        <a className="boton" href={enlace({ pantalla: "diario" })}>
          + Serie suelta → Diario
        </a>
      </p>
    </section>
  );
}
