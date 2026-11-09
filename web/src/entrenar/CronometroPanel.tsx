import { useEffect, useRef, useState } from "react";
import { pitar, vibrar } from "./aviso";
import {
  DURACIONES,
  enPausa,
  etiquetaDuracion,
  formatear,
  pausar,
  reanudar,
  reiniciar,
  restante,
  type Cronometro,
} from "./cronometro";

type Props = {
  cronometro: Cronometro | null;
  onCambiar: (c: Cronometro | null) => void;
  /** Elegir una duración la arranca y la recuerda para las siguientes series. */
  onElegirDuracion: (ms: number) => void;
};

/** Panel del descanso: cuenta atrás, botones rápidos y aviso al terminar. */
export function CronometroPanel({ cronometro, onCambiar, onElegirDuracion }: Props) {
  // «tic» solo sirve para repintar; el tiempo se calcula siempre con la hora actual,
  // así un cronómetro recién arrancado nunca se ve con un segundo de más.
  const [, setTic] = useState(0);
  const quedaba = useRef<number | null>(null);

  const queda = cronometro ? restante(cronometro, Date.now()) : null;
  const corriendo = cronometro !== null && !enPausa(cronometro) && (queda ?? 0) > 0;

  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => setTic((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [corriendo]);

  // Avisar solo al pasar de >0 a 0 con la app abierta (no al recargar un descanso ya acabado).
  useEffect(() => {
    if (queda === 0 && quedaba.current !== null && quedaba.current > 0) {
      pitar();
      vibrar();
    }
    quedaba.current = queda;
  }, [queda]);

  const cambiar = (c: Cronometro | null) => onCambiar(c);

  return (
    <section aria-label="Descanso">
      {cronometro && queda !== null && (
        <p>
          <strong>Descanso</strong>{" "}
          <span role="timer" aria-label="Tiempo de descanso">
            {formatear(queda)}
          </span>{" "}
          {queda > 0 && (
            <button
              type="button"
              onClick={() =>
                cambiar(enPausa(cronometro) ? reanudar(cronometro, Date.now()) : pausar(cronometro, Date.now()))
              }
            >
              {enPausa(cronometro) ? "Reanudar" : "Pausar"}
            </button>
          )}{" "}
          <button type="button" onClick={() => cambiar(reiniciar(cronometro, Date.now()))}>
            Reiniciar
          </button>{" "}
          <button type="button" onClick={() => cambiar(null)}>
            Parar
          </button>
        </p>
      )}
      {queda === 0 && <p role="alert">¡Descanso terminado!</p>}
      <p>
        {DURACIONES.map((ms) => (
          <button
            key={ms}
            type="button"
            aria-pressed={cronometro?.duracion === ms}
            onClick={() => onElegirDuracion(ms)}
          >
            {etiquetaDuracion(ms)}
          </button>
        ))}
      </p>
    </section>
  );
}
