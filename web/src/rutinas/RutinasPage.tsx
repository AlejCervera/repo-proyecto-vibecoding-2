import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/http";
import { crearRutina, listarRutinas } from "../api/rutinas";
import { enlaceRutina, ir } from "../navegacion";
import { resumen, separar, type Rutina } from "./rutina";

type Props = { onSesionCaducada: () => void };

function Lista({ rutinas, etiqueta }: { rutinas: Rutina[]; etiqueta: string }) {
  return (
    <ul aria-label={etiqueta}>
      {rutinas.map((r) => (
        <li key={r.id}>
          <a href={enlaceRutina(r.id)}>{r.nombre}</a> <small>({resumen(r)})</small>
        </li>
      ))}
    </ul>
  );
}

export function RutinasPage({ onSesionCaducada }: Props) {
  const [rutinas, setRutinas] = useState<Rutina[] | null>(null);
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
    <section>
      <h2>Rutinas</h2>
      {rutinas === null && !error && <p>Cargando…</p>}

      <h3>Mis rutinas</h3>
      {rutinas && mias.length === 0 && (
        <p>Aún no tienes rutinas. Crea una o copia una predefinida.</p>
      )}
      {mias.length > 0 && <Lista rutinas={mias} etiqueta="Mis rutinas" />}
      <form onSubmit={crear} aria-label="Crear rutina">
        <label>
          Nueva rutina
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Pecho" />
        </label>{" "}
        <button type="submit">Crear</button>
      </form>
      {error && <p role="alert">{error}</p>}

      {predefinidas.length > 0 && (
        <>
          <h3>Predefinidas</h3>
          <p>
            <small>No se pueden modificar: ábrela y cópiala a tus rutinas para adaptarla.</small>
          </p>
          <Lista rutinas={predefinidas} etiqueta="Rutinas predefinidas" />
        </>
      )}
    </section>
  );
}
