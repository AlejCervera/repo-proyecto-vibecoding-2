import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { IconoCerrar } from "./iconos";

type Props = {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
};

/** Ventana que sube desde abajo. Se cierra con la ✕, tocando fuera o con Esc. */
export function HojaInferior({ titulo, onCerrar, children }: Props) {
  const idTitulo = useId();
  const hoja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // El foco entra en la hoja al abrirse y vuelve donde estaba al cerrarse.
    const anterior = document.activeElement as HTMLElement | null;
    hoja.current?.focus();
    return () => anterior?.focus?.();
  }, []);

  function teclas(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCerrar();
    }
  }

  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <div
        ref={hoja}
        className="hoja"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={teclas}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hoja-asa" aria-hidden="true" />
        <div className="hoja-cabecera">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="hoja-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <IconoCerrar tamano={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
