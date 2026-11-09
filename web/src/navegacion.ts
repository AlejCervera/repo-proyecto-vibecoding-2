import { useEffect, useState } from "react";

/** Pantallas de la app. La dirección (#/…) permite usar «atrás» y recargar sin perderla. */
export type Ruta = { pantalla: "diario" } | { pantalla: "historial"; ejercicioId: number };

const HISTORIAL = /^#\/ejercicios\/(\d+)\/historial$/;

export function leerRuta(hash: string): Ruta {
  const m = HISTORIAL.exec(hash);
  if (m) return { pantalla: "historial", ejercicioId: Number(m[1]) };
  return { pantalla: "diario" };
}

export function enlace(ruta: Ruta): string {
  return ruta.pantalla === "historial" ? `#/ejercicios/${ruta.ejercicioId}/historial` : "#/";
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
