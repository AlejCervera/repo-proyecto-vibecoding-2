import { useId, useRef } from "react";
import { IconoMas, IconoMenos } from "./iconos";
import { saltito } from "./movimiento";
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
  const campo = useRef<HTMLInputElement>(null);
  const paso = `${formatearNumero(limites.paso)} ${unidad}`;
  const n = leerNumero(valor);
  // Con − / + el número da un saltito, para que se note el cambio
  const ajustar = (sentido: 1 | -1) => {
    onCambio(ajustarTexto(valor, sentido, limites));
    saltito(campo.current);
  };
  return (
    <div className="contador">
      <label htmlFor={id} className="contador-etiqueta">
        {etiqueta}
      </label>
      <input
        id={id}
        ref={campo}
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
          onClick={() => ajustar(-1)}
        >
          <IconoMenos />
        </button>
        <button
          type="button"
          aria-label={`Sumar ${paso}`}
          disabled={n !== null && n >= limites.max}
          onClick={() => ajustar(1)}
        >
          <IconoMas />
        </button>
      </div>
    </div>
  );
}
