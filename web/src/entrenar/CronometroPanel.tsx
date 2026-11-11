import { HojaInferior } from "../ui/HojaInferior";
import { IconoMas, IconoMenos } from "../ui/iconos";
import { Anillo, useRestante } from "./Anillo";
import {
  ajustarDuracion,
  enPausa,
  formatear,
  fraccion,
  MAX_DESCANSO,
  MIN_DESCANSO,
  pausar,
  PASO_DESCANSO,
  reanudar,
  sumarTiempo,
  type Cronometro,
} from "./cronometro";

type Props = {
  cronometro: Cronometro | null;
  onCambiar: (c: Cronometro | null) => void;
  ejercicio: string;
  /** Descanso guardado para este ejercicio (ms). */
  duracion: number;
  onCambiarDuracion: (ms: number) => void;
  onCerrar: () => void;
};

/** Hoja del descanso: el reloj grande con −15 s / +15 s, pausa y saltar, y el descanso del ejercicio. */
export function CronometroPanel({ cronometro, onCambiar, ejercicio, duracion, onCambiarDuracion, onCerrar }: Props) {
  const queda = useRestante(cronometro);
  const ahora = Date.now();

  return (
    <HojaInferior titulo="Descanso" onCerrar={onCerrar}>
      {cronometro && queda !== null && (
        <div className="descanso-grande">
          <Anillo fraccion={fraccion(cronometro, ahora)} tamano={200} grosor={10} terminado={queda === 0}>
            <span className="descanso-tiempo">{formatear(queda)}</span>
            <span className="descanso-total">
              {queda === 0 ? "¡Terminado!" : `de ${formatear(cronometro.duracion)}`}
            </span>
          </Anillo>
          <div className="descanso-controles">
            <button
              type="button"
              aria-label="Restar 15 s"
              disabled={queda === 0}
              onClick={() => onCambiar(sumarTiempo(cronometro, -PASO_DESCANSO, Date.now()))}
            >
              −15 s
            </button>
            {queda > 0 && (
              <button
                type="button"
                onClick={() =>
                  onCambiar(enPausa(cronometro) ? reanudar(cronometro, Date.now()) : pausar(cronometro, Date.now()))
                }
              >
                {enPausa(cronometro) ? "Reanudar" : "Pausar"}
              </button>
            )}
            <button
              type="button"
              aria-label="Sumar 15 s"
              onClick={() => onCambiar(sumarTiempo(cronometro, PASO_DESCANSO, Date.now()))}
            >
              +15 s
            </button>
          </div>
          <button
            type="button"
            className="primario grande"
            onClick={() => {
              onCambiar(null);
              onCerrar();
            }}
          >
            {queda === 0 ? "A por la siguiente" : "Saltar descanso"}
          </button>
        </div>
      )}

      <div className="descanso-ejercicio">
        <div>
          <p className="descanso-etiqueta">Descanso de {ejercicio}</p>
          <p className="descanso-nota">Se pone en marcha al pulsar «Hecha».</p>
        </div>
        <div className="descanso-ajuste">
          <button
            type="button"
            aria-label="Menos descanso"
            disabled={duracion <= MIN_DESCANSO}
            onClick={() => onCambiarDuracion(ajustarDuracion(duracion, -1))}
          >
            <IconoMenos tamano={18} />
          </button>
          <output aria-label={`Descanso de ${ejercicio}`}>{formatear(duracion)}</output>
          <button
            type="button"
            aria-label="Más descanso"
            disabled={duracion >= MAX_DESCANSO}
            onClick={() => onCambiarDuracion(ajustarDuracion(duracion, 1))}
          >
            <IconoMas tamano={18} />
          </button>
        </div>
      </div>
    </HojaInferior>
  );
}
