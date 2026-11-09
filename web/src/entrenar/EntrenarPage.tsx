import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { obtenerRutina } from "../api/rutinas";
import { listarSeries } from "../api/series";
import { enlace, enlaceRutina } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { hoyISO, pesoPorReps, type Serie } from "../series/serie";
import { PasoEjercicio } from "./PasoEjercicio";
import { contarHoy, seriesDeHoy } from "./progreso";

type Props = { rutinaId: number; paso: number | "fin"; onSesionCaducada: () => void };

export function EntrenarPage({ rutinaId, paso, onSesionCaducada }: Props) {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [series, setSeries] = useState<Serie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hoy = useMemo(() => hoyISO(), []);

  useEffect(() => {
    Promise.all([obtenerRutina(rutinaId), listarSeries()])
      .then(([r, s]) => {
        setRutina(r);
        setSeries(s);
      })
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [rutinaId, onSesionCaducada]);

  const volver = <a href={enlaceRutina(rutinaId)}>← Volver a la rutina</a>;
  if (!rutina) {
    return (
      <section>
        {volver}
        {error ? <p role="alert">{error}</p> : <p>Cargando…</p>}
      </section>
    );
  }

  const ejercicios = rutina.ejercicios;
  if (ejercicios.length === 0) {
    return (
      <section>
        {volver}
        <p>Esta rutina no tiene ejercicios: añade alguno antes de entrenar.</p>
      </section>
    );
  }

  const ir = (p: number | "fin") => enlace({ pantalla: "entrenar", rutinaId, paso: p });
  const cuenta = contarHoy(series, hoy);
  const actual = paso === "fin" ? null : Math.min(Math.max(paso, 0), ejercicios.length - 1);

  return (
    <section>
      {volver}
      <h2>Entrenando: {rutina.nombre}</h2>
      <ol aria-label="Ejercicios del entrenamiento">
        {ejercicios.map((e, i) => (
          <li key={e.id}>
            <a href={ir(i)} aria-current={i === actual ? "step" : undefined}>
              {i === actual ? <strong>{e.nombre}</strong> : e.nombre}
            </a>
            {cuenta.get(e.id) ? ` ✓${cuenta.get(e.id)}` : ""}
          </li>
        ))}
      </ol>

      {actual !== null ? (
        <>
          <PasoEjercicio
            key={ejercicios[actual].id}
            ejercicioId={ejercicios[actual].id}
            hoy={hoy}
            onGuardada={(s) => setSeries((prev) => [s, ...prev])}
          />
          <nav aria-label="Pasos">
            {actual > 0 && <a href={ir(actual - 1)}>← Anterior</a>}{" "}
            {actual < ejercicios.length - 1 ? (
              <a href={ir(actual + 1)}>Siguiente →</a>
            ) : (
              <a href={ir("fin")}>Terminar</a>
            )}
          </nav>
        </>
      ) : (
        <Resumen rutina={rutina} series={series} hoy={hoy} />
      )}
    </section>
  );
}

function Resumen({ rutina, series, hoy }: { rutina: Rutina; series: Serie[]; hoy: string }) {
  const filas = rutina.ejercicios.map((e) => ({
    ...e,
    deHoy: seriesDeHoy(
      series.filter((s) => s.ejercicio_id === e.id),
      hoy,
    ),
  }));
  const total = filas.reduce((n, f) => n + f.deHoy.length, 0);
  return (
    <article aria-label="Resumen del entrenamiento">
      <h3>Resumen de hoy</h3>
      <p>
        {total === 0
          ? "Hoy no has registrado series de esta rutina."
          : `${total} ${total === 1 ? "serie" : "series"} en total.`}
      </p>
      <ul>
        {filas.map((f) => (
          <li key={f.id}>
            {f.nombre}:{" "}
            {f.deHoy.length > 0 ? f.deHoy.map(pesoPorReps).join(" · ") : "sin series"}
          </li>
        ))}
      </ul>
      <a href={enlace({ pantalla: "diario" })}>Ir al diario</a>
    </article>
  );
}
