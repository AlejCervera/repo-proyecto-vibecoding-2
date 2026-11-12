import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { listarEntrenamientos, type EntradaDiario } from "../api/entrenamientos";
import { leerCambios, leerSemana } from "../api/plan";
import { listarRutinas } from "../api/rutinas";
import { cumplimientoSemana, hayPlan, racha, sumarDias, type Plan } from "../diario/calendario";
import { resumenEntrada } from "../diario/entrada";
import { listarSeries } from "../api/series";
import { recordsDeHoy } from "../entrenar/estadisticas";
import { enlace } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { hoyISO, pesoPorReps, type Serie } from "../series/serie";
import { queHacerHoy } from "./hoy";
import { DIAS, diasEntre, fechaCorta, fechaLarga, leerUltimaRutina, lunesDe, semana } from "./resumen";
import { TarjetaHoy } from "./TarjetaHoy";

type Props = { onSesionCaducada: () => void };

/** Primera pantalla: qué toca hoy, cómo va la semana y el último entrenamiento. */
export function InicioPage({ onSesionCaducada }: Props) {
  const [series, setSeries] = useState<Serie[] | null>(null);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [diario, setDiario] = useState<EntradaDiario[]>([]);
  const [plan, setPlan] = useState<Plan>({ semana: Array(7).fill(null), cambios: [] });
  const [error, setError] = useState<string | null>(null);
  const hoy = useMemo(() => hoyISO(), []);

  useEffect(() => {
    // Cambios de días concretos: los de las últimas 8 semanas (para la racha) y esta semana
    Promise.all([
      listarSeries(),
      listarRutinas(),
      listarEntrenamientos(),
      leerSemana(),
      leerCambios(sumarDias(hoy, -55), sumarDias(hoy, 6)),
    ])
      .then(([s, r, d, semanaPlan, cambios]) => {
        setSeries(s);
        setRutinas(r);
        setDiario(d);
        setPlan({ semana: semanaPlan, cambios });
      })
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [onSesionCaducada, hoy]);

  if (error) return <p role="alert">{error}</p>;
  if (!series) return <p>Cargando…</p>;

  const que = queHacerHoy(hoy, plan, rutinas, diario, leerUltimaRutina()?.id ?? null);
  const conPlan = hayPlan(plan);
  const cumplido = cumplimientoSemana(hoy, plan, diario);
  const enRacha = racha(hoy, plan, diario);
  const esta = semana(series, hoy);
  const indiceHoy = diasEntre(lunesDe(hoy), hoy);
  const anterior = diario[0];
  const records = anterior ? recordsDeHoy(series, anterior.fecha) : [];

  return (
    <section className="inicio">
      <p className="fecha-hoy">{fechaLarga(hoy)}</p>

      <TarjetaHoy hoy={hoy} que={que} diario={diario} />

      <article className="tarjeta" aria-label="Esta semana">
        <h2>Esta semana</h2>
        {conPlan ? (
          <p className="cifra">
            {cumplido.hechos} de {cumplido.planificados} entrenos
            {enRacha > 0 && <span className="racha"> · racha de {enRacha}</span>}
          </p>
        ) : (
          <p className="cifra">
            {esta.numDias} {esta.numDias === 1 ? "día" : "días"} · {esta.numSeries}{" "}
            {esta.numSeries === 1 ? "serie" : "series"}
          </p>
        )}
        <ol className="semana" aria-label="Días entrenados">
          {DIAS.map((d, i) => {
            const clases = [esta.dias[i] ? "hecho" : "", i === indiceHoy ? "hoy" : ""].join(" ").trim();
            return (
              <li key={d} className={clases || undefined} aria-current={i === indiceHoy ? "date" : undefined}>
                <span>{d}</span>
                <span className="punto" aria-label={esta.dias[i] ? "entrenado" : "sin entrenar"} />
              </li>
            );
          })}
        </ol>
      </article>

      <article className="tarjeta" aria-label="Último entrenamiento">
        <h2>Último entrenamiento</h2>
        {anterior ? (
          <>
            <p className="cifra">
              <a href={enlace({ pantalla: "entrenamiento", entrenamientoId: anterior.id })}>
                {fechaCorta(anterior.fecha)} · {anterior.rutina_nombre}
              </a>
            </p>
            <p>{resumenEntrada(anterior)}</p>
            {records.length > 0 && (
              <ul className="records-dia" aria-label="Récords de ese día">
                {records.map((r) => (
                  <li key={r.ejercicio_id}>
                    Récord en {r.ejercicio}: <strong>{pesoPorReps(r)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>Aún no hay entrenamientos en el diario.</p>
        )}
      </article>
    </section>
  );
}
