import { useEffect, useState } from "react";

/** Pantallas de la app. La dirección (#/…) permite usar «atrás» y recargar sin perderla. */
export type Ruta =
  | { pantalla: "diario" }
  | { pantalla: "ejercicios" }
  | { pantalla: "historial"; ejercicioId: number };

const HISTORIAL = /^#\/ejercicios\/(\d+)\/historial$/;

export function leerRuta(hash: string): Ruta {
  const m = HISTORIAL.exec(hash);
  if (m) return { pantalla: "historial", ejercicioId: Number(m[1]) };
  if (hash === "#/ejercicios") return { pantalla: "ejercicios" };
  return { pantalla: "diario" };
}

export function enlace(ruta: Ruta): string {
  if (ruta.pantalla === "historial") return `#/ejercicios/${ruta.ejercicioId}/historial`;
  if (ruta.pantalla === "ejercicios") return "#/ejercicios";
  return "#/";
}

export function enlaceHistorial(ejercicioId: number): string {
  return enlace({ pantalla: "historial", ejercicioId });
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(() => leerRuta(window.location.hash));
  useEffect(() => {
    const alCambiar = () => setRuta(leerRuta(window.location.hash));
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);
  return ruta;
}
