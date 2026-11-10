import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { obtenerRutina } from "../api/rutinas";
import { listarSeries } from "../api/series";
import { guardarUltimaRutina } from "../inicio/resumen";
import { enlace, enlaceRutina } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { hoyISO, type Serie } from "../series/serie";
import { desbloquearAudio, useMantenerPantalla } from "./aviso";
import {
  guardarCronometro,
  guardarDuracion,
  iniciar,
  leerCronometro,
  leerDuracion,
  type Cronometro,
} from "./cronometro";
import { CronometroPanel } from "./CronometroPanel";
import { guardarAjustes, leerAjustes } from "./plan";
import { PasoEjercicio } from "./PasoEjercicio";
import { contarHoy } from "./progreso";
import { ResumenEntreno } from "./ResumenEntreno";

type Props = { rutinaId: number; paso: number | "fin"; onSesionCaducada: () => void };

export function EntrenarPage({ rutinaId, paso, onSesionCaducada }: Props) {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [series, setSeries] = useState<Serie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hoy = useMemo(() => hoyISO(), []);
  // Series previstas para hoy cuando difieren de la rutina (+/− durante el entrenamiento)
  const [ajustes, setAjustes] = useState<Record<number, number>>(() => leerAjustes(rutinaId, hoy));

  useEffect(() => {
    Promise.all([obtenerRutina(rutinaId), listarSeries()])
      .then(([r, s]) => {
        setRutina(r);
        setSeries(s);
        guardarUltimaRutina(r); // para «Continuar con…» en el inicio
      })
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [rutinaId, onSesionCaducada]);

  // Descanso: se recuerda para no perderlo al recargar; arranca solo al guardar una serie.
  const [cronometro, setCronometro] = useState<Cronometro | null>(() => leerCronometro());
  useMantenerPantalla();

  function cambiarAjustes(nuevos: Record<number, number>) {
    setAjustes(nuevos);
    guardarAjustes(rutinaId, hoy, nuevos);
  }

  function cambiarCronometro(c: Cronometro | null) {
    setCronometro(c);
    guardarCronometro(c);
  }

  function elegirDuracion(ms: number) {
    guardarDuracion(ms);
    cambiarCronometro(iniciar(ms, Date.now()));
  }

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
  const previstas = (id: number, base: number) => ajustes[id] ?? base;
  const actual = paso === "fin" ? null : Math.min(Math.max(paso, 0), ejercicios.length - 1);
  const e = actual === null ? null : ejercicios[actual];

  return (
    // Cualquier toque desbloquea el sonido (iPhone solo lo permite tras una pulsación).
    <section onPointerDown={desbloquearAudio}>
      {volver}
      <h2>Entrenando: {rutina.nombre}</h2>
      <ol aria-label="Ejercicios del entrenamiento">
        {ejercicios.map((x, i) => {
          const hechas = cuenta.get(x.id) ?? 0;
          const total = previstas(x.id, x.series);
          return (
            <li key={x.id}>
              <a href={ir(i)} aria-current={i === actual ? "step" : undefined}>
                {i === actual ? <strong>{x.nombre}</strong> : x.nombre}
              </a>{" "}
              {hechas}/{total}
              {hechas >= total ? " ✓" : ""}
            </li>
          );
        })}
      </ol>

      {e && actual !== null ? (
        <>
          <CronometroPanel
            cronometro={cronometro}
            onCambiar={cambiarCronometro}
            onElegirDuracion={elegirDuracion}
          />
          <PasoEjercicio
            key={e.id}
            ejercicioId={e.id}
            hoy={hoy}
            previstas={previstas(e.id, e.series)}
            repsMin={e.reps_min}
            repsMax={e.reps_max}
            onCambiarPrevistas={(n) => cambiarAjustes({ ...ajustes, [e.id]: n })}
            onGuardada={(s) => {
              setSeries((prev) => [s, ...prev]);
              cambiarCronometro(iniciar(leerDuracion(), Date.now()));
            }}
          />
          <nav aria-label="Pasos">
            {actual > 0 && <a href={ir(actual - 1)}>← Anterior</a>}{" "}
            {actual < ejercicios.length - 1 && <a href={ir(actual + 1)}>Siguiente →</a>}{" "}
            {/* Se puede terminar en cualquier momento (p. ej. si hoy te saltas un ejercicio) */}
            <a href={ir("fin")}>Terminar</a>
          </nav>
        </>
      ) : (
        <ResumenEntreno
          rutina={rutina}
          series={series}
          hoy={hoy}
          ajustes={ajustes}
          onRutinaGuardada={(r) => {
            setRutina(r);
            cambiarAjustes({});
          }}
        />
      )}
    </section>
  );
}
