import { useEffect, useState } from "react";

/** Pantallas de la app. La dirección (#/…) permite usar «atrás» y recargar sin perderla. */
export type Ruta =
  | { pantalla: "inicio" }
  /** Atajo del icono del móvil: entrena con la última rutina (o elige una). */
  | { pantalla: "empezar" }
  | { pantalla: "diario" }
  | { pantalla: "entrenamiento"; entrenamientoId: number }
  | { pantalla: "ejercicios" }
  | { pantalla: "historial"; ejercicioId: number }
  | { pantalla: "rutinas" }
  | { pantalla: "rutina"; rutinaId: number }
  /** paso = índice del ejercicio en la rutina, o "fin" para el resumen. */
  | { pantalla: "entrenar"; rutinaId: number; paso: number | "fin" };

const HISTORIAL = /^#\/ejercicios\/(\d+)\/historial$/;
const RUTINA = /^#\/rutinas\/(\d+)$/;
const ENTRENAR = /^#\/rutinas\/(\d+)\/entrenar(?:\/(\d+|fin))?$/;
const ENTRENAMIENTO = /^#\/diario\/(\d+)$/;

export function leerRuta(hash: string): Ruta {
  let m = HISTORIAL.exec(hash);
  if (m) return { pantalla: "historial", ejercicioId: Number(m[1]) };
  m = ENTRENAR.exec(hash);
  if (m) {
    const paso = m[2] === "fin" ? "fin" : Number(m[2] ?? 0);
    return { pantalla: "entrenar", rutinaId: Number(m[1]), paso };
  }
  m = RUTINA.exec(hash);
  if (m) return { pantalla: "rutina", rutinaId: Number(m[1]) };
  m = ENTRENAMIENTO.exec(hash);
  if (m) return { pantalla: "entrenamiento", entrenamientoId: Number(m[1]) };
  if (hash === "#/ejercicios") return { pantalla: "ejercicios" };
  if (hash === "#/rutinas") return { pantalla: "rutinas" };
  if (hash === "#/diario") return { pantalla: "diario" };
  if (hash === "#/empezar") return { pantalla: "empezar" };
  return { pantalla: "inicio" };
}

export function enlace(ruta: Ruta): string {
  switch (ruta.pantalla) {
    case "historial":
      return `#/ejercicios/${ruta.ejercicioId}/historial`;
    case "rutina":
      return `#/rutinas/${ruta.rutinaId}`;
    case "entrenar":
      return `#/rutinas/${ruta.rutinaId}/entrenar/${ruta.paso}`;
    case "ejercicios":
      return "#/ejercicios";
    case "rutinas":
      return "#/rutinas";
    case "diario":
      return "#/diario";
    case "entrenamiento":
      return `#/diario/${ruta.entrenamientoId}`;
    case "empezar":
      return "#/empezar";
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
