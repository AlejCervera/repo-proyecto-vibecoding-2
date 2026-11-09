import type { Rutina } from "../rutinas/rutina";

/** Estado de las casillas de un ejercicio: cuántas hechas, si queda una siguiente y cuántas después. */
export function casillas(hechas: number, previstas: number) {
  const siguiente = hechas < previstas ? hechas + 1 : null;
  return {
    siguiente,
    pendientes: Math.max(previstas - hechas - 1, 0),
    completado: hechas >= previstas,
  };
}

/** Se puede quitar una serie prevista si no baja de 1 ni de las ya hechas. */
export function puedeQuitar(hechas: number, previstas: number): boolean {
  return previstas > Math.max(hechas, 1);
}

/** Ejercicios de la rutina cuyo nº de series de hoy difiere del guardado en la rutina. */
export function cambiosPendientes(rutina: Rutina, previstasHoy: Record<number, number>) {
  return rutina.ejercicios
    .filter((e) => previstasHoy[e.id] !== undefined && previstasHoy[e.id] !== e.series)
    .map((e) => ({ id: e.id, nombre: e.nombre, antes: e.series, ahora: previstasHoy[e.id] }));
}

/** Los ajustes de hoy se recuerdan en el navegador para no perderlos al recargar. */
const clave = (rutinaId: number, hoy: string) => `gymlog-entreno-${rutinaId}-${hoy}`;

export function leerAjustes(rutinaId: number, hoy: string): Record<number, number> {
  try {
    return JSON.parse(sessionStorage.getItem(clave(rutinaId, hoy)) ?? "{}");
  } catch {
    return {};
  }
}

export function guardarAjustes(rutinaId: number, hoy: string, ajustes: Record<number, number>) {
  try {
    sessionStorage.setItem(clave(rutinaId, hoy), JSON.stringify(ajustes));
  } catch {
    // sin almacenamiento disponible: los ajustes solo duran mientras la pantalla esté abierta
  }
}
