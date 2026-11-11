import { useEffect, useRef } from "react";
import { Anillo, useRestante } from "./Anillo";
import { pitar, vibrar } from "./aviso";
import { formatear, fraccion, type Cronometro } from "./cronometro";

type Props = { cronometro: Cronometro | null; onAbrir: () => void };

/**
 * Reloj circular pequeño de la cabecera, solo mientras hay descanso. Al tocarlo se abre la
 * hoja con el reloj grande y los controles. Es quien avisa (sonido y vibración) al llegar a 0.
 */
export function RelojDescanso({ cronometro, onAbrir }: Props) {
  const queda = useRestante(cronometro);
  const quedaba = useRef<number | null>(null);

  // Avisar solo al pasar de >0 a 0 con la app abierta (no al recargar un descanso ya acabado).
  useEffect(() => {
    if (queda === 0 && quedaba.current !== null && quedaba.current > 0) {
      pitar();
      vibrar();
    }
    quedaba.current = queda;
  }, [queda]);

  if (!cronometro || queda === null) return null;
  const terminado = queda === 0;
  return (
    <>
      <button type="button" className="reloj-descanso" onClick={onAbrir} aria-label="Abrir el descanso">
        <Anillo fraccion={fraccion(cronometro, Date.now())} tamano={52} grosor={4} terminado={terminado}>
          <span role="timer" aria-label="Tiempo de descanso">
            {formatear(queda)}
          </span>
        </Anillo>
      </button>
      {terminado && (
        <p role="alert" className="oculto">
          ¡Descanso terminado!
        </p>
      )}
    </>
  );
}
