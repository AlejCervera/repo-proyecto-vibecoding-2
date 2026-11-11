import type { ReactNode } from "react";
import { enlace, type Ruta } from "../navegacion";
import { IconoDiario, IconoEjercicios, IconoEntrenar, IconoInicio, IconoPerfil } from "./iconos";

type Pestana = { ruta: Ruta; texto: string; icono: ReactNode; activa: Ruta["pantalla"][] };

export const PESTANAS: Pestana[] = [
  { ruta: { pantalla: "inicio" }, texto: "Inicio", icono: <IconoInicio />, activa: ["inicio"] },
  {
    ruta: { pantalla: "rutinas" },
    texto: "Entrenar",
    icono: <IconoEntrenar />,
    activa: ["rutinas", "rutina", "entrenar", "empezar"],
  },
  {
    ruta: { pantalla: "diario" },
    texto: "Diario",
    icono: <IconoDiario />,
    activa: ["diario", "entrenamiento", "historial"],
  },
  { ruta: { pantalla: "ejercicios" }, texto: "Ejercicios", icono: <IconoEjercicios />, activa: ["ejercicios"] },
  { ruta: { pantalla: "perfil" }, texto: "Perfil", icono: <IconoPerfil />, activa: ["perfil"] },
];

/** Barra de pestañas fija abajo, al alcance del pulgar. */
export function BarraPestanas({ actual }: { actual: Ruta["pantalla"] }) {
  return (
    <nav aria-label="Secciones" className="pestanas">
      {PESTANAS.map((p) => (
        <a
          key={p.texto}
          href={enlace(p.ruta)}
          aria-current={p.activa.includes(actual) ? "page" : undefined}
        >
          {p.icono}
          <span>{p.texto}</span>
        </a>
      ))}
    </nav>
  );
}
