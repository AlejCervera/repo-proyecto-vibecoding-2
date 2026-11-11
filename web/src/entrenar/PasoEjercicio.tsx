import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { obtenerHistorial, type Historial } from "../api/historial";
import { urlImagen } from "../api/imagenes";
import { borrarSerie, crearSerie } from "../api/series";
import { enlaceHistorial } from "../navegacion";
import { MAX_SERIES, textoPlan } from "../rutinas/rutina";
import { aPeticion, formatearFecha, pesoPorReps, type Serie } from "../series/serie";
import { Aviso } from "../ui/Aviso";
import { BotonFijo } from "../ui/BotonFijo";
import { ContadorBotones } from "../ui/ContadorBotones";
import { FotoCirculo } from "../ui/FotoCirculo";
import { IconoMas, IconoMenos } from "../ui/iconos";
import { leerNumero } from "../ui/pasos";
import { PASO_KG, pistaProgresion } from "./estadisticas";
import { FotoHoja } from "./FotoHoja";
import { casillas, puedeQuitar } from "./plan";
import { seriesDeHoy, ultimaSesion, valoresIniciales } from "./progreso";

type Props = {
  ejercicioId: number;
  hoy: string;
  /** Series previstas para hoy y repeticiones objetivo. */
  previstas: number;
  repsMin: number | null;
  repsMax: number | null;
  onCambiarPrevistas: (n: number) => void;
  /** Se llama tras guardar cada serie (arranca el cronómetro de descanso). */
  onGuardada: (s: Serie) => void;
  /** Se llama al deshacer una serie recién guardada. */
  onBorrada: (id: number) => void;
  /** A dónde lleva el botón fijo al completar el ejercicio. */
  siguiente: { href: string; texto: string };
};

const KILOS = { paso: PASO_KG, min: 0, max: 999 };
const REPS = { paso: 1, min: 1, max: 100 };

/** Un ejercicio en modo foco: series de hoy, kilos y repeticiones en grande y «Hecha». */
export function PasoEjercicio(props: Props) {
  const { ejercicioId, hoy, previstas, repsMin, repsMax, onCambiarPrevistas, onGuardada, onBorrada } = props;
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [peso, setPeso] = useState("");
  const [repeticiones, setRepeticiones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [recienGuardada, setRecienGuardada] = useState<Serie | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState(false);
  const [versionFoto, setVersionFoto] = useState(0);
  const idFormulario = useId();
  const cerrarAviso = useCallback(() => setRecienGuardada(null), []);

  useEffect(() => {
    // Si la carga se repite o se cancela, su respuesta tardía no debe pisar lo ya escrito.
    let vigente = true;
    obtenerHistorial(ejercicioId)
      .then((h) => {
        if (!vigente) return;
        setHistorial(h);
        const v = valoresIniciales(h.series, hoy);
        setPeso(v.peso);
        setRepeticiones(v.repeticiones || (repsMin ? String(repsMin) : ""));
      })
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
    // repsMin solo sirve para el valor inicial: no se recarga el historial si cambia
  }, [ejercicioId, hoy]);

  if (!historial) return error ? <p role="alert">{error}</p> : <p>Cargando…</p>;

  const { ejercicio, series } = historial;
  const anterior = ultimaSesion(series, hoy);
  const hechas = seriesDeHoy(series, hoy);
  const estado = casillas(hechas.length, previstas);
  const pista = estado.completado ? null : pistaProgresion(leerNumero(peso), repsMax);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const nueva = await crearSerie(aPeticion({ fecha: hoy, ejercicio, peso, repeticiones }));
      setHistorial((h) => h && { ...h, series: [nueva, ...h.series] });
      setRecienGuardada(nueva);
      onGuardada(nueva);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardando(false);
    }
  }

  async function deshacer(s: Serie) {
    setError(null);
    try {
      await borrarSerie(s.id);
      setHistorial((h) => h && { ...h, series: h.series.filter((x) => x.id !== s.id) });
      onBorrada(s.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido deshacer");
    }
  }

  return (
    <article aria-label={ejercicio.nombre} className="paso">
      <div className="paso-cabecera">
        <FotoCirculo
          nombre={ejercicio.nombre}
          src={ejercicio.imagen ? urlImagen(ejercicio.id, versionFoto) : null}
          onAbrir={() => setFotoAbierta(true)}
        />
        <div>
          <h2>{ejercicio.nombre}</h2>
          <p className="paso-objetivo">
            Objetivo: {textoPlan({ series: previstas, reps_min: repsMin, reps_max: repsMax })}
          </p>
        </div>
      </div>

      <div className="paso-series">
        <ol aria-label="Series de hoy" className="puntos">
          {hechas.map((s, i) => (
            <li key={s.id} className="hecha">
              <span aria-hidden="true">✓</span>
              <span className="oculto"> Serie {i + 1} ·</span> {pesoPorReps(s)}
            </li>
          ))}
          {estado.siguiente !== null && (
            <li aria-current="step" className="siguiente">
              <span className="oculto">Ahora: serie </span>
              {estado.siguiente}
            </li>
          )}
          {Array.from({ length: estado.pendientes }, (_, i) => (
            <li key={`pendiente-${i}`} className="pendiente">
              <span className="oculto">Serie </span>
              {(estado.siguiente ?? 0) + i + 1}
            </li>
          ))}
        </ol>
        <div className="ajuste-series">
          <button
            type="button"
            aria-label="Quitar serie"
            disabled={!puedeQuitar(hechas.length, previstas)}
            onClick={() => onCambiarPrevistas(previstas - 1)}
          >
            <IconoMenos tamano={18} />
          </button>
          <button
            type="button"
            aria-label="Añadir serie"
            disabled={previstas >= MAX_SERIES}
            onClick={() => onCambiarPrevistas(previstas + 1)}
          >
            <IconoMas tamano={18} />
          </button>
        </div>
      </div>

      {estado.completado ? (
        <p role="status" className="completado">
          ¡Ejercicio completado!
        </p>
      ) : (
        <form id={idFormulario} onSubmit={guardar} noValidate aria-label={`Serie ${estado.siguiente}`}>
          <div className="contadores">
            <ContadorBotones
              etiqueta="Peso (kg)"
              unidad="kg"
              modoTeclado="decimal"
              valor={peso}
              onCambio={setPeso}
              {...KILOS}
            />
            <ContadorBotones
              etiqueta="Repeticiones"
              unidad="rep."
              modoTeclado="numeric"
              valor={repeticiones}
              onCambio={setRepeticiones}
              {...REPS}
            />
          </div>
        </form>
      )}

      <p className="paso-referencia">
        {anterior ? (
          <>
            La última vez ({formatearFecha(anterior.fecha)}):{" "}
            <strong>{anterior.series.map(pesoPorReps).join(" · ")}</strong>
          </>
        ) : (
          "Primera vez con este ejercicio."
        )}{" "}
        <a href={enlaceHistorial(ejercicio.id)}>Ver historial</a>
      </p>
      {pista && <p className="pista">{pista}</p>}
      {error && <p role="alert">{error}</p>}

      <BotonFijo sinPestanas>
        {estado.completado ? (
          <a className="boton primario" href={props.siguiente.href}>
            {props.siguiente.texto}
          </a>
        ) : (
          <button type="submit" form={idFormulario} disabled={guardando}>
            Hecha · empezar descanso
          </button>
        )}
      </BotonFijo>

      {recienGuardada && (
        <Aviso
          key={recienGuardada.id}
          mensaje={`Serie guardada: ${pesoPorReps(recienGuardada)}`}
          onDeshacer={() => deshacer(recienGuardada)}
          onCerrar={cerrarAviso}
        />
      )}
      {fotoAbierta && (
        <FotoHoja
          ejercicio={ejercicio}
          series={series}
          hoy={hoy}
          onCambio={(e) => {
            setHistorial((h) => h && { ...h, ejercicio: e });
            setVersionFoto(Date.now());
          }}
          onCerrar={() => setFotoAbierta(false)}
        />
      )}
    </article>
  );
}
