import type { EntradaDiario } from "../api/entrenamientos";
import { resumenEntrada } from "../diario/entrada";
import { enlace } from "../navegacion";
import { resumen } from "../rutinas/rutina";
import type { Hoy } from "./hoy";
import { haceDias } from "./resumen";

type Props = { hoy: string; que: Hoy; diario: EntradaDiario[] };

/** Tarjeta principal de Inicio: lo que toca hoy (o descanso, o hecho) y el botón para empezar. */
export function TarjetaHoy({ hoy, que, diario }: Props) {
  return (
    <article className="tarjeta destacada" aria-label="Entrenar">
      {que.tipo === "toca" && (
        <>
          <p className="etiqueta">Hoy toca</p>
          <h2 className="hoy-toca">{que.rutina.nombre}</h2>
          <p className="subtitulo">
            {resumen(que.rutina)} · {ultimaVez(que.rutina.id, hoy, diario)}
          </p>
          <a className="boton primario grande" href={enlace({ pantalla: "entrenar", rutinaId: que.rutina.id, paso: 0 })}>
            Empezar
          </a>
          <a className="enlace-secundario" href={enlace({ pantalla: "rutinas" })}>
            Elegir otra rutina
          </a>
          {!que.segunPlan && (
            <a className="enlace-secundario" href={enlace({ pantalla: "diario" })}>
              Planificar la semana
            </a>
          )}
        </>
      )}
      {que.tipo === "descanso" && (
        <>
          <p className="etiqueta">Hoy</p>
          <h2 className="hoy-toca">Toca descanso</h2>
          <p className="subtitulo">Recuperar también es entrenar. Si te apetece, puedes entrenar igualmente.</p>
          <a className="boton grande" href={enlace({ pantalla: "rutinas" })}>
            Entrenar igualmente
          </a>
        </>
      )}
      {que.tipo === "hecho" && (
        <>
          <p className="etiqueta">Hoy</p>
          <h2 className="hoy-toca">¡Hecho! ✓</h2>
          <p className="subtitulo">
            {que.entrada.rutina_nombre} · {resumenEntrada(que.entrada)}
          </p>
          <a className="boton grande" href={enlace({ pantalla: "entrenamiento", entrenamientoId: que.entrada.id })}>
            Ver el entreno
          </a>
        </>
      )}
      {que.tipo === "elegir" && (
        <>
          <p className="etiqueta">Hoy</p>
          <h2 className="hoy-toca">¿Qué entrenas hoy?</h2>
          <p className="subtitulo">Elige una de tus rutinas o una predefinida, o planifica tu semana en el Diario.</p>
          <a className="boton primario grande" href={enlace({ pantalla: "rutinas" })}>
            Elegir rutina
          </a>
        </>
      )}
    </article>
  );
}

/** «la última vez hace 3 días» o «aún sin entrenar» (el diario va del más reciente al más antiguo). */
function ultimaVez(rutinaId: number, hoy: string, diario: EntradaDiario[]): string {
  const vez = diario.find((d) => d.rutina_id === rutinaId);
  return vez ? `la última vez ${haceDias(vez.fecha, hoy)}` : "aún sin entrenar";
}
