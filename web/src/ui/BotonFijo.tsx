import type { ReactNode } from "react";

/** Franja fija abajo, encima de la barra de pestañas, para la acción principal de la pantalla. */
export function BotonFijo({ children }: { children: ReactNode }) {
  return <div className="boton-fijo">{children}</div>;
}
