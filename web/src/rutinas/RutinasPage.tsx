import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/http";
import { crearRutina, listarRutinas } from "../api/rutinas";
import { enlace, enlaceRutina, ir } from "../navegacion";
import { HojaInferior } from "../ui/HojaInferior";
import { IconoMas } from "../ui/iconos";
import { nombresEjercicios, resumen, separar, type Rutina } from "./rutina";

type Props = { onSesionCaducada: () => void };

/** Una tarjeta por rutina: su nombre, qué ejercicios tiene y «Empezar». */
function Lista({ rutinas, etiqueta }: { rutinas: Rutina[]; etiqueta: string }) {
  return (
    <ul aria-label={etiqueta} className="lista-rutinas">
      {rutinas.map((r) => (
        <li key={r.id} className="tarjeta-rutina">
          <div className="tarjeta-rutina-texto">
            <a href={enlaceRutina(r.id)}>{r.nombre}</a>
            <small>
              {resumen(r)} · {nombresEjercicios(r)}
            </small>
          </div>
          {r.ejercicios.length > 0 && (
            <a
              className="boton primario"
              href={enlace({ pantalla: "entrenar", rutinaId: r.id, paso: 0 })}
              aria-label={`Empezar ${r.nombre}`}
            >
              Empezar
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function RutinasPage({ onSesionCaducada }: Props) {
  const [rutinas, setRutinas] = useState<Rutina[] | null>(null);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarRutinas()
      .then(setRutinas)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [onSesionCaducada]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const nueva = await crearRutina(nombre);
      ir({ pantalla: "rutina", rutinaId: nueva.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  const { predefinidas, mias } = separar(rutinas ?? []);

  return (
    // Espacio abajo para que el botón + flotante no tape la última tarjeta
    <section className="con-boton-fijo">
      <h2>Rutinas</h2>
      {rutinas === null && !error && <p>Cargando…</p>}
      {!creando && error && <p role="alert">{error}</p>}

      <h3>Mis rutinas</h3>
      {rutinas && mias.length === 0 && (
        <p className="vacio">Aún no tienes rutinas. Crea una con el botón + o copia una predefinida.</p>
      )}
      {mias.length > 0 && <Lista rutinas={mias} etiqueta="Mis rutinas" />}

      {predefinidas.length > 0 && (
        <>
          <h3>Predefinidas</h3>
          <p>
            <small>No se pueden modificar: ábrela y cópiala a tus rutinas para adaptarla.</small>
          </p>
          <Lista rutinas={predefinidas} etiqueta="Rutinas predefinidas" />
        </>
      )}

      <button
        type="button"
        className="boton-flotante"
        aria-label="Crear rutina"
        onClick={() => {
          setError(null);
          setCreando(true);
        }}
      >
        <IconoMas />
        <span aria-hidden="true">Nueva</span>
      </button>

      {creando && (
        <HojaInferior titulo="Nueva rutina" onCerrar={() => setCreando(false)}>
          <form onSubmit={crear} aria-label="Crear rutina" className="formulario-hoja">
            <label>
              Nombre de la rutina
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej.: Pecho"
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button type="submit" className="grande">
              Crear
            </button>
          </form>
        </HojaInferior>
      )}
    </section>
  );
}
