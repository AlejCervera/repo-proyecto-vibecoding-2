import { IconoMas, IconoMenos } from "./iconos";
import { ajustar, formatearNumero, type Limites } from "./pasos";

type Props = Limites & {
  /** Nombre visible, p. ej. «Kilos». */
  etiqueta: string;
  /** Unidad para los botones, p. ej. «kg» → «Restar 2,5 kg». */
  unidad: string;
  valor: number;
  onCambio: (v: number) => void;
};

/** Un número grande con botones − / + para no tener que abrir el teclado. */
export function ContadorBotones({ etiqueta, unidad, valor, onCambio, ...limites }: Props) {
  const paso = `${formatearNumero(limites.paso)} ${unidad}`;
  return (
    <div className="contador" role="group" aria-label={etiqueta}>
      <span className="contador-etiqueta">{etiqueta}</span>
      <output className="contador-valor" aria-live="polite">
        {formatearNumero(valor)}
      </output>
      <div className="contador-botones">
        <button
          type="button"
          aria-label={`Restar ${paso}`}
          disabled={valor <= limites.min}
          onClick={() => onCambio(ajustar(valor, -1, limites))}
        >
          <IconoMenos />
        </button>
        <button
          type="button"
          aria-label={`Sumar ${paso}`}
          disabled={valor >= limites.max}
          onClick={() => onCambio(ajustar(valor, 1, limites))}
        >
          <IconoMas />
        </button>
      </div>
    </div>
  );
}
