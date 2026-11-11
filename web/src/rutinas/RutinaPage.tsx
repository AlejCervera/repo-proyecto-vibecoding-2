import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/http";
import {
  anadirEjercicio,
  borrarRutina,
  configurarEjercicio,
  copiarRutina,
  obtenerRutina,
  quitarEjercicio,
  renombrarRutina,
  reordenarRutina,
} from "../api/rutinas";
import type { Ejercicio } from "../ejercicios/ejercicio";
import { EjercicioPicker } from "../ejercicios/EjercicioPicker";
import { enlace, ir } from "../navegacion";
import { EjercicioRutinaFila } from "./EjercicioRutinaFila";
import { RecomendacionesPanel } from "./RecomendacionesPanel";
import { mover, type Rutina } from "./rutina";

type Props = { rutinaId: number; onSesionCaducada: () => void };
type Modo = "ver" | "renombrar" | "anadir" | "borrar";

export function RutinaPage({ rutinaId, onSesionCaducada }: Props) {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [modo, setModo] = useState<Modo>("ver");
  const [nombre, setNombre] = useState("");
  const [elegido, setElegido] = useState<Ejercicio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    obtenerRutina(rutinaId)
      .then(setRutina)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [rutinaId, onSesionCaducada]);

  /** Ejecuta una acción que devuelve la rutina actualizada (o nada si navega). */
  async function ejecutar(accion: () => Promise<Rutina | void>) {
    setOcupado(true);
    setError(null);
    try {
      const actualizada = await accion();
      if (actualizada) {
        setRutina(actualizada);
        setModo("ver");
        setElegido(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setOcupado(false);
    }
  }

  function cambiarModo(nuevo: Modo) {
    setError(null);
    setNombre(rutina?.nombre ?? "");
    setElegido(null);
    setModo(nuevo);
  }

  const volver = <a href={enlace({ pantalla: "rutinas" })}>← Rutinas</a>;
  if (!rutina) {
    return (
      <section>
        {volver}
        {error ? <p role="alert">{error}</p> : <p>Cargando…</p>}
      </section>
    );
  }

  const ids = rutina.ejercicios.map((e) => e.id);
  const editable = !rutina.predefinida;
  const cancelar = (
    <button type="button" onClick={() => cambiarModo("ver")}>
      Cancelar
    </button>
  );

  const renombrar = (e: FormEvent) => {
    e.preventDefault();
    return ejecutar(() => renombrarRutina(rutina.id, nombre));
  };

  return (
    <section>
      {volver}
      <h2>{rutina.nombre}</h2>
      {rutina.ejercicios.length > 0 && (
        <p>
          <a href={enlace({ pantalla: "entrenar", rutinaId: rutina.id, paso: 0 })}>
            <strong>▶ Empezar entrenamiento</strong>
          </a>
        </p>
      )}
      {rutina.predefinida && (
        <p>
          <small>Rutina predefinida: no se puede modificar.</small>{" "}
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              ejecutar(async () => {
                const copia = await copiarRutina(rutina.id);
                ir({ pantalla: "rutina", rutinaId: copia.id });
              })
            }
          >
            Copiar a mis rutinas
          </button>
        </p>
      )}

      {editable && modo === "ver" && (
        <p>
          <button type="button" onClick={() => cambiarModo("renombrar")}>
            Renombrar
          </button>{" "}
          <button type="button" onClick={() => cambiarModo("borrar")}>
            Borrar rutina
          </button>
        </p>
      )}
      {modo === "renombrar" && (
        <form onSubmit={renombrar} aria-label="Renombrar rutina">
          <label>
            Nuevo nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>{" "}
          <button type="submit" disabled={ocupado}>
            Guardar nombre
          </button>{" "}
          {cancelar}
        </form>
      )}
      {modo === "borrar" && (
        <p>
          ¿Borrar la rutina «{rutina.nombre}»? Tus series no se borran.{" "}
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              ejecutar(async () => {
                await borrarRutina(rutina.id);
                ir({ pantalla: "rutinas" });
              })
            }
          >
            Sí, borrar
          </button>{" "}
          {cancelar}
        </p>
      )}

      {rutina.ejercicios.length === 0 ? (
        <p>Esta rutina aún no tiene ejercicios.</p>
      ) : (
        <ol aria-label="Ejercicios de la rutina">
          {rutina.ejercicios.map((e, i) => (
            <EjercicioRutinaFila
              key={e.id}
              ejercicio={e}
              editable={editable}
              primero={i === 0}
              ultimo={i === ids.length - 1}
              ocupado={ocupado}
              onMover={(d) => ejecutar(() => reordenarRutina(rutina.id, mover(ids, i, d)))}
              onQuitar={() => ejecutar(() => quitarEjercicio(rutina.id, e.id))}
              onConfigurar={(cambios) => ejecutar(() => configurarEjercicio(rutina.id, e.id, cambios))}
            />
          ))}
        </ol>
      )}

      {editable && modo === "ver" && (
        <button type="button" onClick={() => cambiarModo("anadir")}>
          Añadir ejercicio
        </button>
      )}
      {modo === "anadir" && (
        <div>
          <EjercicioPicker compacto etiqueta="Ejercicio a añadir" value={elegido} onChange={setElegido} />
          <button
            type="button"
            disabled={!elegido || ocupado}
            onClick={() => elegido && ejecutar(() => anadirEjercicio(rutina.id, elegido.id))}
          >
            Añadir a la rutina
          </button>{" "}
          {cancelar}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {editable && modo === "ver" && (
        <RecomendacionesPanel rutina={rutina} onRutina={setRutina} onSesionCaducada={onSesionCaducada} />
      )}
    </section>
  );
}
