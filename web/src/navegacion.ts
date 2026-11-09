import { useEffect, useState } from "react";

/** Pantallas de la app. La dirección (#/…) permite usar «atrás» y recargar sin perderla. */
export type Ruta =
  | { pantalla: "diario" }
  | { pantalla: "ejercicios" }
  | { pantalla: "historial"; ejercicioId: number }
  | { pantalla: "rutinas" }
  | { pantalla: "rutina"; rutinaId: number };

const HISTORIAL = /^#\/ejercicios\/(\d+)\/historial$/;
const RUTINA = /^#\/rutinas\/(\d+)$/;

export function leerRuta(hash: string): Ruta {
  let m = HISTORIAL.exec(hash);
  if (m) return { pantalla: "historial", ejercicioId: Number(m[1]) };
  m = RUTINA.exec(hash);
  if (m) return { pantalla: "rutina", rutinaId: Number(m[1]) };
  if (hash === "#/ejercicios") return { pantalla: "ejercicios" };
  if (hash === "#/rutinas") return { pantalla: "rutinas" };
  return { pantalla: "diario" };
}

export function enlace(ruta: Ruta): string {
  switch (ruta.pantalla) {
    case "historial":
      return `#/ejercicios/${ruta.ejercicioId}/historial`;
    case "rutina":
      return `#/rutinas/${ruta.rutinaId}`;
    case "ejercicios":
      return "#/ejercicios";
    case "rutinas":
      return "#/rutinas";
    default:
      return "#/";
  }
}

export function enlaceHistorial(ejercicioId: number): string {
  return enlace({ pantalla: "historial", ejercicioId });
}

export function enlaceRutina(rutinaId: number): string {
  return enlace({ pantalla: "rutina", rutinaId });
}

export function ir(ruta: Ruta): void {
  window.location.hash = enlace(ruta);
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
