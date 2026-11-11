import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { listarEntrenamientos, type EntradaDiario } from "../api/entrenamientos";
import { listarRutinas } from "../api/rutinas";
import { resumenEntrada } from "../diario/DiarioPage";
import { listarSeries } from "../api/series";
import { recordsDeHoy } from "../entrenar/estadisticas";
import { enlace } from "../navegacion";
import { resumen, type Rutina } from "../rutinas/rutina";
import { hoyISO, pesoPorReps, type Serie } from "../series/serie";
import { DIAS, diasEntre, fechaCorta, fechaLarga, haceDias, leerUltimaRutina, lunesDe, semana } from "./resumen";

type Props = { onSesionCaducada: () => void };

/** Primera pantalla: qué toca hoy, cómo va la semana y el último entrenamiento. */
export function InicioPage({ onSesionCaducada }: Props) {
  const [series, setSeries] = useState<Serie[] | null>(null);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [diario, setDiario] = useState<EntradaDiario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hoy = useMemo(() => hoyISO(), []);

  useEffect(() => {
    Promise.all([listarSeries(), listarRutinas(), listarEntrenamientos()])
      .then(([s, r, d]) => {
        setSeries(s);
        setRutinas(r);
        setDiario(d);
      })
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [onSesionCaducada]);

  if (error) return <p role="alert">{error}</p>;
  if (!series) return <p>Cargando…</p>;

  // Solo se ofrece la última rutina si sigue existiendo y tiene ejercicios.
  const guardada = leerUltimaRutina();
  const ultima = rutinas.find((r) => r.id === guardada?.id && r.ejercicios.length > 0);
  // El diario viene del más reciente al más antiguo
  const vezAnterior = ultima ? diario.find((d) => d.rutina_id === ultima.id) : undefined;
  const esta = semana(series, hoy);
  const indiceHoy = diasEntre(lunesDe(hoy), hoy);
  const anterior = diario[0];
  const records = anterior ? recordsDeHoy(series, anterior.fecha) : [];

  return (
    <section className="inicio">
      <p className="fecha-hoy">{fechaLarga(hoy)}</p>

      <article className="tarjeta destacada" aria-label="Entrenar">
        {ultima ? (
          <>
            <p className="etiqueta">Hoy toca</p>
            <h2 className="hoy-toca">{ultima.nombre}</h2>
            <p className="subtitulo">
              {resumen(ultima)} ·{" "}
              {vezAnterior ? `la última vez ${haceDias(vezAnterior.fecha, hoy)}` : "aún sin entrenar"}
            </p>
            <a
              className="boton primario grande"
              href={enlace({ pantalla: "entrenar", rutinaId: ultima.id, paso: 0 })}
            >
              Empezar
            </a>
            <a className="enlace-secundario" href={enlace({ pantalla: "rutinas" })}>
              Elegir otra rutina
            </a>
          </>
        ) : (
          <>
            <p className="etiqueta">Hoy</p>
            <h2 className="hoy-toca">¿Qué entrenas hoy?</h2>
            <p className="subtitulo">Elige una de tus rutinas o una predefinida.</p>
            <a className="boton primario grande" href={enlace({ pantalla: "rutinas" })}>
              Elegir rutina
            </a>
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
