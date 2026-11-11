import { useEffect } from "react";

type Props = {
  mensaje: string;
  onCerrar: () => void;
  /** Si se pasa, aparece el botón «Deshacer». */
  onDeshacer?: () => void;
  duracionMs?: number;
};

/** Mensaje breve abajo que desaparece solo («Serie guardada · Deshacer»). */
export function Aviso({ mensaje, onCerrar, onDeshacer, duracionMs = 4000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onCerrar, duracionMs);
    return () => clearTimeout(t);
  }, [onCerrar, duracionMs]);

  return (
    <div className="aviso" role="status">
      <span>{mensaje}</span>
      {onDeshacer && (
        <button
          type="button"
          onClick={() => {
            onDeshacer();
            onCerrar();
          }}
        >
          Deshacer
        </button>
      )}
    </div>
  );
}
