import { useState, type FormEvent } from "react";
import { actualizarSerie, borrarSerie } from "../api/series";
import { EjercicioPicker } from "../ejercicios/EjercicioPicker";
import { enlaceHistorial } from "../navegacion";
import { HojaInferior } from "../ui/HojaInferior";
import { IconoEditar } from "../ui/iconos";
import {
  aPeticion,
  formatearFecha,
  formularioDesde,
  pesoPorReps,
  type FormularioSerie,
  type Serie,
} from "./serie";

type Props = {
  serie: Serie;
  /** En el diario se enlaza el ejercicio; en su historial no hace falta. */
  mostrarEjercicio: boolean;
  /** En el historial las series van agrupadas por día: la fecha ya está en el grupo. */
  mostrarFecha?: boolean;
  onCambiada: (s: Serie) => void;
  onBorrada: (id: number) => void;
};

/** «ver»: solo la fila; «editar» y «confirmar»: la hoja inferior correspondiente. */
type Modo = "ver" | "editar" | "confirmar";

/** Una serie en una fila compacta; «Editar» abre una hoja para corregirla o borrarla. */
export function SerieFila({ serie, mostrarEjercicio, mostrarFecha = true, onCambiada, onBorrada }: Props) {
  const [modo, setModo] = useState<Modo>("ver");
  const [form, setForm] = useState<FormularioSerie>(() => formularioDesde(serie));
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function cambiarModo(nuevo: Modo) {
    setError(null);
    if (nuevo === "editar") setForm(formularioDesde(serie));
    setModo(nuevo);
  }

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setOcupado(false);
    }
  }

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    return ejecutar(async () => {
      onCambiada(await actualizarSerie(serie.id, aPeticion(form)));
      setModo("ver");
    });
  };

  const borrar = () =>
    ejecutar(async () => {
      await borrarSerie(serie.id);
      onBorrada(serie.id);
    });

  const campo = (nombre: "fecha" | "peso" | "repeticiones") => ({
    value: form[nombre],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [nombre]: e.target.value })),
  });

  const aviso = error && <p role="alert">{error}</p>;

  return (
    <li className="fila-serie">
      <span className="fila-serie-texto">
        {mostrarFecha && <time dateTime={serie.fecha}>{formatearFecha(serie.fecha)}</time>}
        {mostrarEjercicio && (
          <>
            {" — "}
            <a href={enlaceHistorial(serie.ejercicio_id)}>{serie.ejercicio}</a>
          </>
        )}
        {(mostrarFecha || mostrarEjercicio) && " · "}
        <strong>{pesoPorReps(serie)}</strong>
      </span>
      <button type="button" className="boton-redondo discreto" aria-label="Editar" onClick={() => cambiarModo("editar")}>
        <IconoEditar tamano={18} />
      </button>

      {modo === "editar" && (
        <HojaInferior titulo="Editar serie" onCerrar={() => cambiarModo("ver")}>
          <form onSubmit={guardar} noValidate aria-label="Editar serie" className="formulario-hoja">
            <label>
              Fecha
              <input type="date" {...campo("fecha")} />
            </label>
            <EjercicioPicker
              compacto
              value={form.ejercicio}
              onChange={(ejercicio) => setForm((f) => ({ ...f, ejercicio }))}
            />
            <div className="campos-en-fila">
              <label>
                Peso (kg)
                <input inputMode="decimal" {...campo("peso")} />
              </label>
              <label>
                Repeticiones
                <input inputMode="numeric" {...campo("repeticiones")} />
              </label>
            </div>
            {aviso}
            <button type="submit" className="grande" disabled={ocupado}>
              Guardar cambios
            </button>
            <div className="hoja-acciones">
              <button type="button" className="peligro" onClick={() => cambiarModo("confirmar")}>
                Borrar serie
              </button>
              <button type="button" onClick={() => cambiarModo("ver")}>
                Cancelar
              </button>
            </div>
          </form>
        </HojaInferior>
      )}

      {modo === "confirmar" && (
        <HojaInferior titulo="Borrar serie" onCerrar={() => cambiarModo("ver")}>
          <p>
            ¿Borrar la serie de {pesoPorReps(serie)} del {formatearFecha(serie.fecha)}?
          </p>
          {aviso}
          <div className="hoja-acciones">
            <button type="button" className="peligro" onClick={borrar} disabled={ocupado}>
              Sí, borrar
            </button>
            <button type="button" onClick={() => cambiarModo("ver")}>
              Cancelar
            </button>
          </div>
        </HojaInferior>
      )}
    </li>
  );
}
