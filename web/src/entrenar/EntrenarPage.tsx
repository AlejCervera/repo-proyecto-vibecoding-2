import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { obtenerRutina } from "../api/rutinas";
import { listarSeries } from "../api/series";
import { guardarUltimaRutina } from "../inicio/resumen";
import { enlace, enlaceRutina } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { hoyISO, type Serie } from "../series/serie";
import { HojaInferior } from "../ui/HojaInferior";
import { IconoCerrar, IconoEjercicios } from "../ui/iconos";
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
import { marcarInicio } from "./estadisticas";
import { guardarAjustes, leerAjustes } from "./plan";
import { PasoEjercicio } from "./PasoEjercicio";
import { contarHoy } from "./progreso";
import { ResumenEntreno } from "./ResumenEntreno";
import { TiempoEntreno } from "./TiempoEntreno";

type Props = { rutinaId: number; paso: number | "fin"; onSesionCaducada: () => void };

export function EntrenarPage({ rutinaId, paso, onSesionCaducada }: Props) {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [series, setSeries] = useState<Serie[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Paso en el que se abrió la lista de ejercicios: al cambiar de paso se cierra sola.
  const [listaEnPaso, setListaEnPaso] = useState<number | "fin" | null>(null);
  const listaAbierta = listaEnPaso === paso;
  const setListaAbierta = (abierta: boolean) => setListaEnPaso(abierta ? paso : null);
  const hoy = useMemo(() => hoyISO(), []);
  // Hora de inicio del entreno de hoy (para el tiempo de arriba y la duración del resumen)
  const inicio = useMemo(() => marcarInicio(rutinaId, hoy, Date.now()), [rutinaId, hoy]);
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

  const salir = (
    <a href={enlaceRutina(rutinaId)} className="entreno-salir" aria-label="Salir del entreno">
      <IconoCerrar />
    </a>
  );
  if (!rutina) {
    return (
      <section>
        {salir}
        {error ? <p role="alert">{error}</p> : <p>Cargando…</p>}
      </section>
    );
  }

  const ejercicios = rutina.ejercicios;
  if (ejercicios.length === 0) {
    return (
      <section>
        {salir}
        <p>Esta rutina no tiene ejercicios: añade alguno antes de entrenar.</p>
      </section>
    );
  }

  const ir = (p: number | "fin") => enlace({ pantalla: "entrenar", rutinaId, paso: p });
  const cuenta = contarHoy(series, hoy);
  const previstas = (id: number, base: number) => ajustes[id] ?? base;
  const actual = paso === "fin" ? null : Math.min(Math.max(paso, 0), ejercicios.length - 1);

  if (actual === null) {
    // Resumen final: el entreno ha terminado, sin reloj ni lista de ejercicios.
    return (
      <section className="entreno">
        <ResumenEntreno
          rutina={rutina}
          series={series}
          hoy={hoy}
          inicio={inicio}
          ajustes={ajustes}
          onRutinaGuardada={(r) => {
            setRutina(r);
            cambiarAjustes({});
          }}
        />
      </section>
    );
  }

  const e = ejercicios[actual];
  const esUltimo = actual === ejercicios.length - 1;

  return (
    // Cualquier toque desbloquea el sonido (iPhone solo lo permite tras una pulsación).
    <section onPointerDown={desbloquearAudio} className="entreno">
      <header className="entreno-cabecera">
        {salir}
        <div className="entreno-titulo">
          <h2>
            <span className="oculto">Entrenando: </span>
            {rutina.nombre}
          </h2>
          <TiempoEntreno inicio={inicio} />
        </div>
        <button type="button" className="entreno-lista" onClick={() => setListaAbierta(true)}>
          <IconoEjercicios />
          <span className="oculto">Ejercicios</span>
        </button>
      </header>

      <div className="progreso" aria-hidden="true">
        {ejercicios.map((x, i) => {
          const completo = (cuenta.get(x.id) ?? 0) >= previstas(x.id, x.series);
          const clase = i === actual ? "actual" : completo ? "hecho" : "";
          return <span key={x.id} className={clase} />;
        })}
      </div>
      <p className="oculto">
        Ejercicio {actual + 1} de {ejercicios.length}
      </p>

      {listaAbierta && (
        <HojaInferior titulo="Ejercicios de hoy" onCerrar={() => setListaAbierta(false)}>
          <ol aria-label="Ejercicios del entrenamiento" className="lista-entreno">
            {ejercicios.map((x, i) => {
              const hechas = cuenta.get(x.id) ?? 0;
              const total = previstas(x.id, x.series);
              return (
                <li key={x.id}>
                  <a
                    href={ir(i)}
                    aria-current={i === actual ? "step" : undefined}
                    onClick={() => setListaAbierta(false)}
                  >
                    {x.nombre}
                  </a>{" "}
                  {hechas}/{total}
                  {hechas >= total ? " ✓" : ""}
                </li>
              );
            })}
          </ol>
          <div className="hoja-acciones">
            <a className="boton" href={ir("fin")} onClick={() => setListaAbierta(false)}>
              Terminar entreno
            </a>
          </div>
        </HojaInferior>
      )}

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
        onBorrada={(id) => {
          setSeries((prev) => prev.filter((s) => s.id !== id));
          cambiarCronometro(null);
        }}
        siguiente={
          esUltimo
            ? { href: ir("fin"), texto: "Terminar entreno" }
            : { href: ir(actual + 1), texto: "Siguiente ejercicio" }
        }
      />
      <nav aria-label="Pasos" className="pasos">
        {actual > 0 && <a href={ir(actual - 1)}>← Anterior</a>}
        {actual < ejercicios.length - 1 && <a href={ir(actual + 1)}>Siguiente →</a>}
        {/* Se puede terminar en cualquier momento (p. ej. si hoy te saltas un ejercicio) */}
        <a href={ir("fin")}>Terminar</a>
      </nav>
    </section>
  );
}
