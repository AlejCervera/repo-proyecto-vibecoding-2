import { useCallback, useEffect, useState, type FormEvent } from "react";
import { crearEjercicio, misEjercicios } from "../api/ejercicios";
import { ApiError } from "../api/http";
import type { EjercicioPropio } from "./ejercicio";
import { EjercicioPropioFila } from "./EjercicioPropioFila";

type Props = { onSesionCaducada: () => void };

export function MisEjerciciosPage({ onSesionCaducada }: Props) {
  const [ejercicios, setEjercicios] = useState<EjercicioPropio[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    misEjercicios()
      .then(setEjercicios)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [onSesionCaducada]);

  useEffect(cargar, [cargar]);

  const [nuevo, setNuevo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    try {
      const r = await crearEjercicio(nuevo);
      if (r.tipo === "existe") {
        setAviso(`${r.mensaje}: no hace falta crearlo, búscalo al añadirlo a una rutina.`);
        return;
      }
      setNuevo("");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <section>
      <h2>Mis ejercicios</h2>
      <p>
        <small>
          Los ejercicios que has creado tú. Los del catálogo no se pueden cambiar. También puedes
          crear uno al añadir ejercicios a una rutina.
        </small>
      </p>
      <form onSubmit={crear} aria-label="Crear ejercicio">
        <label>
          Nuevo ejercicio
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej.: Remo con goma" />
        </label>
        <button type="submit">Crear</button>
      </form>
      {aviso && <p role="alert">{aviso}</p>}
      {error && <p role="alert">{error}</p>}
      {ejercicios === null && !error && <p>Cargando…</p>}
      {ejercicios?.length === 0 && <p>Aún no has creado ejercicios propios.</p>}
      {ejercicios && ejercicios.length > 0 && (
        <ul aria-label="Mis ejercicios">
          {ejercicios.map((e) => (
            <EjercicioPropioFila
              key={e.id}
              ejercicio={e}
              onRenombrado={(nuevo) =>
                setEjercicios((prev) => prev!.map((x) => (x.id === nuevo.id ? nuevo : x)))
              }
              onBorrado={(id) => {
                setEjercicios((prev) => prev!.filter((x) => x.id !== id));
                // Las series pueden haber pasado a otro ejercicio: recargar los contadores reales.
                cargar();
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
