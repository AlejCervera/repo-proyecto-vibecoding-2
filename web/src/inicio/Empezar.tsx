import { useEffect } from "react";
import { ir } from "../navegacion";
import { leerUltimaRutina } from "./resumen";

/** Atajo «Iniciar entrenamiento» del icono del móvil: va a la última rutina o a elegir una. */
export function Empezar() {
  useEffect(() => {
    const ultima = leerUltimaRutina();
    if (ultima) ir({ pantalla: "entrenar", rutinaId: ultima.id, paso: 0 });
    else ir({ pantalla: "rutinas" });
  }, []);
  return <p>Abriendo el entrenamiento…</p>;
}
