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
import { BotonFijo } from "../ui/BotonFijo";
import { HojaInferior } from "../ui/HojaInferior";
import { IconoEntrenar, IconoMas, IconoOpciones } from "../ui/iconos";
import { EjercicioRutinaFila } from "./EjercicioRutinaFila";
import { RecomendacionesPanel } from "./RecomendacionesPanel";
import { mover, resumen, type EjercicioRutina, type Rutina } from "./rutina";

type Props = { rutinaId: number; onSesionCaducada: () => void };
/** Qué hoja inferior está abierta (o ninguna, «ver»). */
type Modo = "ver" | "opciones" | "renombrar" | "anadir" | "borrar";

export function RutinaPage({ rutinaId, onSesionCaducada }: Props) {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [modo, setModo] = useState<Modo>("ver");
  const [nombre, setNombre] = useState("");
  const [elegido, setElegido] = useState<Ejercicio | null>(null);
  const [quitando, setQuitando] = useState<EjercicioRutina | null>(null);
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
        setQuitando(null);
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
  const cerrar = () => cambiarModo("ver");
  const cancelar = (
    <button type="button" onClick={cerrar}>
      Cancelar
    </button>
  );
  // El error se ve dentro de la hoja abierta o, si no hay ninguna, en la pantalla.
  const hojaAbierta = modo !== "ver" || quitando !== null;
  const aviso = error && <p role="alert">{error}</p>;

  const renombrar = (e: FormEvent) => {
    e.preventDefault();
    return ejecutar(() => renombrarRutina(rutina.id, nombre));
  };

  return (
    <section className="con-boton-fijo">
      {volver}
      <div className="cabecera-pantalla">
        <div>
          <h2>{rutina.nombre}</h2>
          <p className="subtitulo">{resumen(rutina)}</p>
        </div>
        {editable && (
          <button
            type="button"
            className="boton-redondo"
            aria-label="Opciones de la rutina"
            onClick={() => cambiarModo("opciones")}
          >
            <IconoOpciones />
          </button>
        )}
      </div>

      {rutina.predefinida && (
        <div className="tarjeta aviso-predefinida">
          <p>
            <small>Rutina predefinida: no se puede modificar.</small>
          </p>
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
        </div>
      )}

      {rutina.ejercicios.length === 0 ? (
        <p className="vacio">Esta rutina aún no tiene ejercicios.</p>
      ) : (
        <ol aria-label="Ejercicios de la rutina" className="lista-ejercicios-rutina">
          {rutina.ejercicios.map((e, i) => (
            <EjercicioRutinaFila
              key={e.id}
              ejercicio={e}
              editable={editable}
              primero={i === 0}
              ultimo={i === ids.length - 1}
              ocupado={ocupado}
              onMover={(d) => ejecutar(() => reordenarRutina(rutina.id, mover(ids, i, d)))}
              onQuitar={() => {
                setError(null);
                setQuitando(e);
              }}
              onConfigurar={(cambios) => ejecutar(() => configurarEjercicio(rutina.id, e.id, cambios))}
            />
          ))}
        </ol>
      )}

      {editable && (
        <button type="button" className="boton-anadir" onClick={() => cambiarModo("anadir")}>
          <IconoMas tamano={18} />
          Añadir ejercicio
        </button>
      )}
      {!hojaAbierta && aviso}
      {editable && !hojaAbierta && (
        <RecomendacionesPanel rutina={rutina} onRutina={setRutina} onSesionCaducada={onSesionCaducada} />
      )}

      {rutina.ejercicios.length > 0 && (
        <BotonFijo>
          <a className="boton primario" href={enlace({ pantalla: "entrenar", rutinaId: rutina.id, paso: 0 })}>
            <IconoEntrenar />
            Empezar entrenamiento
          </a>
        </BotonFijo>
      )}

      {modo === "opciones" && (
        <HojaInferior titulo={rutina.nombre} onCerrar={cerrar}>
          <div className="hoja-acciones">
            <button type="button" onClick={() => cambiarModo("renombrar")}>
              Renombrar
            </button>
            <button type="button" className="peligro" onClick={() => cambiarModo("borrar")}>
              Borrar rutina
            </button>
          </div>
        </HojaInferior>
      )}

      {modo === "renombrar" && (
        <HojaInferior titulo="Renombrar rutina" onCerrar={cerrar}>
          <form onSubmit={renombrar} aria-label="Renombrar rutina" className="formulario-hoja">
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

      {modo === "borrar" && (
        <HojaInferior titulo="Borrar rutina" onCerrar={cerrar}>
          <p>¿Borrar la rutina «{rutina.nombre}»? Tus series no se borran.</p>
          {aviso}
          <div className="hoja-acciones">
            <button
              type="button"
              className="peligro"
              disabled={ocupado}
              onClick={() =>
                ejecutar(async () => {
                  await borrarRutina(rutina.id);
                  ir({ pantalla: "rutinas" });
                })
              }
            >
              Sí, borrar
            </button>
            {cancelar}
          </div>
        </HojaInferior>
      )}

      {modo === "anadir" && (
        <HojaInferior titulo="Añadir a la rutina" onCerrar={cerrar}>
          <EjercicioPicker compacto etiqueta="Ejercicio a añadir" value={elegido} onChange={setElegido} />
          {aviso}
          <div className="hoja-acciones">
            <button
              type="button"
              className="primario"
              disabled={!elegido || ocupado}
              onClick={() => elegido && ejecutar(() => anadirEjercicio(rutina.id, elegido.id))}
            >
              Añadir a la rutina
            </button>
            {cancelar}
          </div>
        </HojaInferior>
      )}

      {quitando && (
        <HojaInferior titulo="Quitar ejercicio" onCerrar={() => setQuitando(null)}>
          <p>
            ¿Quitar «{quitando.nombre}» de la rutina? Sus series siguen en el historial.
          </p>
          {aviso}
          <div className="hoja-acciones">
            <button
              type="button"
              className="peligro"
              disabled={ocupado}
              onClick={() => ejecutar(() => quitarEjercicio(rutina.id, quitando.id))}
            >
              Sí, quitar
            </button>
            <button type="button" onClick={() => setQuitando(null)}>
              Cancelar
            </button>
          </div>
        </HojaInferior>
      )}
    </section>
  );
}
