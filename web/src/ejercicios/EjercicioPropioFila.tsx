import { useState, type FormEvent } from "react";
import { borrarEjercicio, renombrarEjercicio, type OpcionBorrado } from "../api/ejercicios";
import { enlaceHistorial } from "../navegacion";
import type { Ejercicio, EjercicioPropio } from "./ejercicio";
import { EjercicioPicker } from "./EjercicioPicker";

type Props = {
  ejercicio: EjercicioPropio;
  onRenombrado: (e: EjercicioPropio) => void;
  onBorrado: (id: number) => void;
};

type Modo = "ver" | "renombrar" | "borrar" | "mover";

const plural = (n: number) => (n === 1 ? "1 serie" : `${n} series`);

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

  const cancelar = (
    <button type="button" onClick={() => cambiarModo("ver")}>
      Cancelar
    </button>
  );
  const aviso = error && <p role="alert">{error}</p>;

  if (modo === "renombrar") {
    return (
      <li>
        <form onSubmit={renombrar} aria-label={`Renombrar ${ejercicio.nombre}`}>
          <label>
            Nuevo nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>{" "}
          <button type="submit" disabled={ocupado}>
            Guardar nombre
          </button>{" "}
          {cancelar}
        </form>
        {aviso}
      </li>
    );
  }

  const n = ejercicio.num_series;
  return (
    <li>
      <a href={enlaceHistorial(ejercicio.id)}>{ejercicio.nombre}</a> <small>({plural(n)})</small>{" "}
      {modo === "ver" && (
        <>
          <button type="button" onClick={() => cambiarModo("renombrar")}>
            Renombrar
          </button>{" "}
          <button type="button" onClick={() => cambiarModo("borrar")}>
            Borrar
          </button>
        </>
      )}
      {modo === "borrar" && n === 0 && (
        <p>
          ¿Borrar «{ejercicio.nombre}»?{" "}
          <button type="button" onClick={() => borrar(null)} disabled={ocupado}>
            Sí, borrar
          </button>{" "}
          {cancelar}
        </p>
      )}
      {modo === "borrar" && n > 0 && (
        <p>
          «{ejercicio.nombre}» tiene {plural(n)}. ¿Qué hacemos con ellas?{" "}
          <button type="button" onClick={() => borrar({ series: "borrar" })} disabled={ocupado}>
            Borrarlas también
          </button>{" "}
          <button type="button" onClick={() => cambiarModo("mover")}>
            Pasarlas a otro ejercicio…
          </button>{" "}
          {cancelar}
        </p>
      )}
      {modo === "mover" && (
        <div>
          <EjercicioPicker compacto etiqueta="Pasar a" value={destino} onChange={setDestino} />
          <button
            type="button"
            disabled={!destino || ocupado}
            onClick={() => destino && borrar({ mover_a: destino.id })}
          >
            Pasar las series y borrar «{ejercicio.nombre}»
          </button>{" "}
          {cancelar}
        </div>
      )}
      {aviso}
    </li>
  );
}
