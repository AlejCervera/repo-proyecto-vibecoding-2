import { useCallback, useEffect, useMemo, useState } from "react";
import { listarEntrenamientos, type EntradaDiario } from "../api/entrenamientos";
import { ApiError } from "../api/http";
import { cambiarDia, guardarSemana, leerCambios, leerSemana, volverAlPlan } from "../api/plan";
import { listarRutinas } from "../api/rutinas";
import { listarSeries } from "../api/series";
import { fechaCorta } from "../inicio/resumen";
import { enlace } from "../navegacion";
import type { Rutina } from "../rutinas/rutina";
import { hoyISO, type Serie } from "../series/serie";
import { CalendarioMes } from "./CalendarioMes";
import { limitesMes, type Plan } from "./calendario";
import { resumenEntrada } from "./entrada";
import { HojaDia } from "./HojaDia";
import { HojaPlanSemanal } from "./HojaPlanSemanal";
import { Progreso } from "./Progreso";

type Props = { onSesionCaducada: () => void };

/** Diario: arriba el calendario (planeado frente a hecho) y debajo los entrenos guardados. */
export function DiarioPage({ onSesionCaducada }: Props) {
  const hoy = useMemo(() => hoyISO(), []);
  const [mes, setMes] = useState(() => ({ anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) - 1 }));
  const [entradas, setEntradas] = useState<EntradaDiario[] | null>(null);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [plan, setPlan] = useState<Plan>({ semana: Array(7).fill(null), cambios: [] });
  const [dia, setDia] = useState<string | null>(null);
  const [editandoPlan, setEditandoPlan] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHoja, setErrorHoja] = useState<string | null>(null);

  const fallo = useCallback(
    (e: Error) => {
      if (e instanceof ApiError && e.status === 401) onSesionCaducada();
      else setError(e.message);
    },
    [onSesionCaducada],
  );

  useEffect(() => {
    Promise.all([listarEntrenamientos(), listarRutinas(), leerSemana(), listarSeries()])
      .then(([d, r, semana, s]) => {
        setEntradas(d);
        setRutinas(r);
        setPlan((p) => ({ ...p, semana }));
        setSeries(s);
      })
      .catch(fallo);
  }, [fallo]);

  // Los cambios de días concretos se piden mes a mes
  useEffect(() => {
    const { desde, hasta } = limitesMes(mes.anio, mes.mes);
    leerCambios(desde, hasta)
      .then((cambios) => setPlan((p) => ({ ...p, cambios })))
      .catch(fallo);
  }, [mes, fallo]);

  function cambiarMes(delta: -1 | 1) {
    setMes(({ anio, mes: m }) => {
      const nuevo = m + delta;
      return { anio: anio + Math.floor(nuevo / 12), mes: (nuevo + 12) % 12 };
    });
  }

  async function ejecutar(accion: () => Promise<void>, alTerminar?: () => void) {
    setOcupado(true);
    setErrorHoja(null);
    try {
      await accion();
      alTerminar?.();
    } catch (e) {
      setErrorHoja(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setOcupado(false);
    }
  }

  const sinCambio = (fecha: string) => plan.cambios.filter((c) => c.fecha !== fecha);

  return (
    <section>
      <h2>Diario</h2>
      {error && <p role="alert">{error}</p>}

      <CalendarioMes
        anio={mes.anio}
        mes={mes.mes}
        hoy={hoy}
        plan={plan}
        diario={entradas ?? []}
        onCambiarMes={cambiarMes}
        onElegirDia={(f) => {
          setErrorHoja(null);
          setDia(f);
        }}
      />
      <button
        type="button"
        className="boton-anadir"
        onClick={() => {
          setErrorHoja(null);
          setEditandoPlan(true);
        }}
      >
        Editar plan semanal
      </button>

      {entradas !== null && <Progreso hoy={hoy} diario={entradas} series={series} />}

      <h3>Entrenos</h3>
      {entradas === null && !error && <p>Cargando…</p>}
      {entradas?.length === 0 && (
        <p className="vacio">
          Aún no hay entrenamientos en el diario: al terminar un entreno se guarda aquí solo.{" "}
          <a href={enlace({ pantalla: "rutinas" })}>Ir a rutinas</a>
        </p>
      )}
      {entradas && entradas.length > 0 && (
        <ul aria-label="Entrenamientos" className="lista-entrenos">
          {entradas.map((e) => (
            <li key={e.id}>
              <a href={enlace({ pantalla: "entrenamiento", entrenamientoId: e.id })}>
                <strong>{fechaCorta(e.fecha)}</strong> · {e.rutina_nombre}
              </a>
              <br />
              <small>{resumenEntrada(e)}</small>
            </li>
          ))}
        </ul>
      )}

      {dia && (
        <HojaDia
          fecha={dia}
          hoy={hoy}
          plan={plan}
          diario={entradas ?? []}
          rutinas={rutinas}
          ocupado={ocupado}
          error={errorHoja}
          onCambiar={(rutinaId) =>
            ejecutar(async () => {
              const cambio = await cambiarDia(dia, rutinaId);
              setPlan((p) => ({ ...p, cambios: [...sinCambio(dia), cambio] }));
            })
          }
          onVolverAlPlan={() =>
            ejecutar(async () => {
              await volverAlPlan(dia);
              setPlan((p) => ({ ...p, cambios: sinCambio(dia) }));
            })
          }
          onCerrar={() => setDia(null)}
        />
      )}

      {editandoPlan && (
        <HojaPlanSemanal
          semana={plan.semana}
          rutinas={rutinas}
          ocupado={ocupado}
          error={errorHoja}
          onGuardar={(dias) =>
            ejecutar(
              async () => {
                const semana = await guardarSemana(dias);
                setPlan((p) => ({ ...p, semana }));
              },
              () => setEditandoPlan(false),
            )
          }
          onCerrar={() => setEditandoPlan(false)}
        />
      )}
    </section>
  );
}
