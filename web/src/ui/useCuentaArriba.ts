import { useEffect, useState } from "react";
import { hayMovimiento, valorEn } from "./movimiento";

/**
 * Cuenta de 0 a `final` en `duracion` ms (para las cifras del resumen). Con «Reducir movimiento»
 * activado, o sin requestAnimationFrame, devuelve el valor final desde el principio.
 */
export function useCuentaArriba(final: number, duracion = 600): number {
  const [animar] = useState(() => hayMovimiento() && typeof requestAnimationFrame === "function");
  const [valor, setValor] = useState(() => (animar ? 0 : final));

  useEffect(() => {
    if (!animar) {
      setValor(final);
      return;
    }
    let inicio: number | null = null;
    let id = 0;
    const paso = (ahora: number) => {
      inicio ??= ahora;
      const v = valorEn(final, ahora - inicio, duracion);
      setValor(v);
      if (v !== final) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [animar, final, duracion]);

  return valor;
}
