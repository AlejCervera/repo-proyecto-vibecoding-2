import { useEffect, useState, type ReactNode } from "react";
import { enPausa, restante, type Cronometro } from "./cronometro";

/** Lo que queda de descanso, repintando 4 veces por segundo solo mientras corre. */
export function useRestante(c: Cronometro | null): number | null {
  const [, setTic] = useState(0);
  const queda = c ? restante(c, Date.now()) : null;
  const corriendo = c !== null && !enPausa(c) && (queda ?? 0) > 0;
  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => setTic((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [corriendo]);
  return queda;
}

type Props = {
  /** De 1 (lleno) a 0 (vacío). */
  fraccion: number;
  tamano: number;
  grosor: number;
  terminado?: boolean;
  children: ReactNode;
};

/** Reloj circular: el arco lima se va vaciando en el sentido de las agujas del reloj. */
export function Anillo({ fraccion, tamano, grosor, terminado = false, children }: Props) {
  const r = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * r;
  return (
    <span className={terminado ? "anillo terminado" : "anillo"} style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true">
        <circle className="anillo-fondo" cx={tamano / 2} cy={tamano / 2} r={r} strokeWidth={grosor} fill="none" />
        <circle
          className="anillo-arco"
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          strokeWidth={grosor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - (terminado ? 1 : fraccion))}
          transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
        />
      </svg>
      <span className="anillo-centro">{children}</span>
    </span>
  );
}
