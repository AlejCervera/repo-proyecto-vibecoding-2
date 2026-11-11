import { useId } from "react";
import { IconoMas, IconoMenos } from "./iconos";
import { ajustarTexto, formatearNumero, leerNumero, type Limites } from "./pasos";

type Props = Limites & {
  /** Etiqueta del campo, p. ej. «Peso (kg)». */
  etiqueta: string;
  /** Unidad para los botones, p. ej. «kg» → «Restar 2,5 kg». */
  unidad: string;
  /** Lo escrito en el campo («62,5»): se puede teclear o cambiar con − / +. */
  valor: string;
  onCambio: (v: string) => void;
  modoTeclado: "decimal" | "numeric";
};

/** Un número grande con botones − / + para no abrir el teclado; también se puede escribir. */
export function ContadorBotones({ etiqueta, unidad, valor, onCambio, modoTeclado, ...limites }: Props) {
  const id = useId();
  const paso = `${formatearNumero(limites.paso)} ${unidad}`;
  const n = leerNumero(valor);
  return (
    <div className="contador">
      <label htmlFor={id} className="contador-etiqueta">
        {etiqueta}
      </label>
      <input
        id={id}
        className="contador-valor"
        inputMode={modoTeclado}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <div className="contador-botones">
        <button
          type="button"
          aria-label={`Restar ${paso}`}
          disabled={n !== null && n <= limites.min}
          onClick={() => onCambio(ajustarTexto(valor, -1, limites))}
        >
          <IconoMenos />
        </button>
        <button
          type="button"
          aria-label={`Sumar ${paso}`}
          disabled={n !== null && n >= limites.max}
          onClick={() => onCambio(ajustarTexto(valor, 1, limites))}
        >
          <IconoMas />
        </button>
      </div>
    </div>
  );
}
