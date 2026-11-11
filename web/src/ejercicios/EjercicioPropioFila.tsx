import { useState, type FormEvent } from "react";
import { borrarEjercicio, renombrarEjercicio, type OpcionBorrado } from "../api/ejercicios";
import { enlaceHistorial } from "../navegacion";
import { FotoCirculo } from "../ui/FotoCirculo";
import { HojaInferior } from "../ui/HojaInferior";
import { IconoOpciones } from "../ui/iconos";
import type { Ejercicio, EjercicioPropio } from "./ejercicio";
import { EjercicioPicker } from "./EjercicioPicker";

type Props = {
  ejercicio: EjercicioPropio;
  onRenombrado: (e: EjercicioPropio) => void;
  onBorrado: (id: number) => void;
};

/** «ver»: solo la fila; el resto, la hoja inferior correspondiente. */
type Modo = "ver" | "opciones" | "renombrar" | "borrar" | "mover";

const plural = (n: number) => (n === 1 ? "1 serie" : `${n} series`);

/** Un ejercicio propio: nombre (lleva a su historial), nº de series y menú ⋯. */
export function EjercicioPropioFila({ ejercicio, onRenombrado, onBorrado }: Props) {
  const [modo, setModo] = useState<Modo>("ver");
  const [nombre, setNombre] = useState(ejercicio.nombre);
  const [destino, setDestino] = useState<Ejercicio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function cambiarModo(nuevo: Modo) {
    setError(null);
    setNombre(ejercicio.nombre);
    setDestino(null);
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

  const renombrar = (e: FormEvent) => {
    e.preventDefault();
    return ejecutar(async () => {
      const r = await renombrarEjercicio(ejercicio.id, nombre);
      if (r.tipo === "existe") {
        setError(r.mensaje);
        return;
      }
      onRenombrado({ ...ejercicio, nombre: r.ejercicio.nombre });
      setModo("ver");
    });
  };

  const borrar = (opcion: OpcionBorrado) =>
    ejecutar(async () => {
      await borrarEjercicio(ejercicio.id, opcion);
      onBorrado(ejercicio.id);
    });

  const cerrar = () => cambiarModo("ver");
  const cancelar = (
    <button type="button" onClick={cerrar}>
      Cancelar
    </button>
  );
  const aviso = error && <p role="alert">{error}</p>;
  const n = ejercicio.num_series;

  return (
    <li className="fila-ejercicio">
      <FotoCirculo nombre={ejercicio.nombre} tamano={32} />
      <span className="fila-ejercicio-texto">
        <a href={enlaceHistorial(ejercicio.id)}>{ejercicio.nombre}</a>
        <small>{plural(n)}</small>
      </span>
      <button
        type="button"
        className="boton-redondo discreto"
        aria-label={`Opciones de ${ejercicio.nombre}`}
        onClick={() => cambiarModo("opciones")}
      >
        <IconoOpciones />
      </button>

      {modo === "opciones" && (
        <HojaInferior titulo={ejercicio.nombre} onCerrar={cerrar}>
          <div className="hoja-acciones">
            <button type="button" onClick={() => cambiarModo("renombrar")}>
              Renombrar
            </button>
            <button type="button" className="peligro" onClick={() => cambiarModo("borrar")}>
              Borrar
            </button>
          </div>
        </HojaInferior>
      )}

      {modo === "renombrar" && (
        <HojaInferior titulo="Renombrar ejercicio" onCerrar={cerrar}>
          <form onSubmit={renombrar} aria-label={`Renombrar ${ejercicio.nombre}`} className="formulario-hoja">
            <label>
              Nuevo nombre
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            {aviso}
            <button type="submit" className="grande" disabled={ocupado}>
              Guardar nombre
            </button>
          </form>
        </HojaInferior>
      )}

      {modo === "borrar" && n === 0 && (
        <HojaInferior titulo="Borrar ejercicio" onCerrar={cerrar}>
          <p>¿Borrar «{ejercicio.nombre}»?</p>
          {aviso}
          <div className="hoja-acciones">
            <button type="button" className="peligro" onClick={() => borrar(null)} disabled={ocupado}>
              Sí, borrar
            </button>
            {cancelar}
          </div>
        </HojaInferior>
      )}

      {modo === "borrar" && n > 0 && (
        <HojaInferior titulo="Borrar ejercicio" onCerrar={cerrar}>
          <p>
            «{ejercicio.nombre}» tiene {plural(n)}. ¿Qué hacemos con ellas?
          </p>
          {aviso}
          <div className="hoja-acciones">
            <button
              type="button"
              className="peligro"
              onClick={() => borrar({ series: "borrar" })}
              disabled={ocupado}
            >
              Borrarlas también
            </button>
            <button type="button" onClick={() => cambiarModo("mover")}>
              Pasarlas a otro ejercicio…
            </button>
            {cancelar}
          </div>
        </HojaInferior>
      )}

      {modo === "mover" && (
        <HojaInferior titulo="Pasar las series" onCerrar={cerrar}>
          <EjercicioPicker compacto etiqueta="Pasar a" value={destino} onChange={setDestino} />
          {aviso}
          <div className="hoja-acciones">
            <button
              type="button"
              className="primario"
              disabled={!destino || ocupado}
              onClick={() => destino && borrar({ mover_a: destino.id })}
            >
              Pasar las series y borrar «{ejercicio.nombre}»
            </button>
            {cancelar}
          </div>
        </HojaInferior>
      )}
    </li>
  );
}
