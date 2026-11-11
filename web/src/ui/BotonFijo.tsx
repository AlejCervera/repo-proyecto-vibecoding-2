import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** En pantallas sin barra de pestañas (p. ej. al entrenar), va pegado al borde de abajo. */
  sinPestanas?: boolean;
};

/** Franja fija abajo, encima de la barra de pestañas, para la acción principal de la pantalla. */
export function BotonFijo({ children, sinPestanas = false }: Props) {
  return <div className={sinPestanas ? "boton-fijo sin-pestanas" : "boton-fijo"}>{children}</div>;
}
