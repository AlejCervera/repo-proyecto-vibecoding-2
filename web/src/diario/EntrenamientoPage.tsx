import { useCallback, useEffect, useState } from "react";
import { obtenerEntrenamiento, quitarEntrenamiento, type Entrenamiento } from "../api/entrenamientos";
import { ApiError } from "../api/http";
import { fechaCorta } from "../inicio/resumen";
import { enlace, enlaceHistorial, ir } from "../navegacion";
import { SeriesList } from "../series/SeriesList";

type Props = { entrenamientoId: number; onSesionCaducada: () => void };

/** Un entrenamiento del diario: cada ejercicio con sus series (que se pueden corregir o borrar). */
export function EntrenamientoPage({ entrenamientoId, onSesionCaducada }: Props) {
  const [entrenamiento, setEntrenamiento] = useState<Entrenamiento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const cargar = useCallback(() => {
    obtenerEntrenamiento(entrenamientoId)
      .then(setEntrenamiento)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [entrenamientoId, onSesionCaducada]);

  useEffect(cargar, [cargar]);

  async function quitar() {
    try {
      await quitarEntrenamiento(entrenamientoId);
      ir({ pantalla: "diario" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido quitar");
    }
  }

  const volver = <a href={enlace({ pantalla: "diario" })}>← Diario</a>;
  if (!entrenamiento) {
    return (
      <section>
        {volver}
        {error ? <p role="alert">{error}</p> : <p>Cargando…</p>}
      </section>
    );
  }

  const { fecha, rutina_nombre, ejercicios } = entrenamiento;
  return (
    <section>
      {volver}
      <h2>
        {fechaCorta(fecha)} · {rutina_nombre}
      </h2>
      {ejercicios.length === 0 && <p>Este entrenamiento ya no tiene series.</p>}
      {ejercicios.map((e) => (
        <article key={e.id} aria-label={e.nombre}>
          <h3>
            <a href={enlaceHistorial(e.id)}>{e.nombre}</a>
          </h3>
          {/* Al corregir o borrar una serie se recarga: puede cambiar de ejercicio o desaparecer */}
          <SeriesList
            series={e.series}
            etiqueta={`Series de ${e.nombre}`}
            mostrarEjercicio={false}
            onCambiada={cargar}
            onBorrada={cargar}
          />
        </article>
      ))}

      {!confirmando ? (
        <button type="button" onClick={() => setConfirmando(true)}>
          Quitar del diario
        </button>
      ) : (
        <p>
          ¿Quitar este entrenamiento del diario? Sus series se quedan en el historial de cada
          ejercicio.{" "}
          <button type="button" onClick={quitar}>
            Sí, quitar
          </button>{" "}
          <button type="button" onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
