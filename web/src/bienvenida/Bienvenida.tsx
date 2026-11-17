import { useEffect, useState } from "react";
import { guardarSemana, leerSemana } from "../api/plan";
import { copiarRutina, listarRutinas } from "../api/rutinas";
import { SelectorSemana } from "../diario/SelectorSemana";
import { nombresEjercicios, resumen, separar, type Rutina } from "../rutinas/rutina";
import { BotonFijo } from "../ui/BotonFijo";
import { PASOS, resumenPlan } from "./pasos";

type Props = {
  nombre: string;
  /** Al terminar o saltarla: se marca como vista y se va a Inicio. */
  onTerminar: () => void;
};

/** Primeros pasos (Fase 9f): elige una rutina, planifica la semana y listo. Se puede saltar. */
export function Bienvenida({ nombre, onTerminar }: Props) {
  const [paso, setPaso] = useState(1);
  const [rutinas, setRutinas] = useState<Rutina[] | null>(null);
  const [dias, setDias] = useState<(number | null)[]>(Array(7).fill(null));
  const [copiadas, setCopiadas] = useState<number[]>([]); // ids de las predefinidas ya copiadas
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarRutinas(), leerSemana()])
      .then(([r, semana]) => {
        setRutinas(r);
        setDias(semana.map((d) => d?.id ?? null));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setOcupado(false);
    }
  }

  const copiar = (r: Rutina) =>
    ejecutar(async () => {
      const copia = await copiarRutina(r.id);
      setRutinas((todas) => [...(todas ?? []), copia]);
      setCopiadas((c) => [...c, r.id]);
    });

  const guardarPlan = () =>
    ejecutar(async () => {
      await guardarSemana(dias);
      setPaso(3);
    });

  const { predefinidas, mias } = separar(rutinas ?? []);
  const plan = resumenPlan(dias, rutinas ?? []);

  return (
    <section className="bienvenida" aria-labelledby="titulo-bienvenida">
      <header className="bienvenida-cabecera">
        {paso > 1 ? (
          <button type="button" className="discreto" onClick={() => setPaso(paso - 1)}>
            ‹ Atrás
          </button>
        ) : (
          <span />
        )}
        <p className="bienvenida-paso" aria-live="polite">
          Paso {paso} de {PASOS}
        </p>
        <button type="button" className="discreto" onClick={onTerminar}>
          Saltar
        </button>
      </header>
      <ol className="bienvenida-progreso" aria-hidden="true">
        {Array.from({ length: PASOS }, (_, i) => (
          <li key={i} className={i < paso ? "hecho" : undefined} />
        ))}
      </ol>

      {paso === 1 && (
        <>
          <h2 id="titulo-bienvenida">Hola, {nombre}. Elige con qué empezar</h2>
          <p className="subtitulo">
            Copia una rutina a las tuyas para poder cambiarla. Podrás crear las tuyas cuando quieras desde
            Entrenar.
          </p>
          {rutinas === null && !error && <p>Cargando…</p>}
          <ul className="bienvenida-rutinas" aria-label="Rutinas para empezar">
            {predefinidas.map((r) => {
              const copiada = copiadas.includes(r.id);
              return (
                <li key={r.id}>
                  <div>
                    <strong>{r.nombre}</strong>
                    <small>
                      {resumen(r)} · {nombresEjercicios(r)}
                    </small>
                  </div>
                  <button
                    type="button"
                    className={copiada ? "discreto" : "primario"}
                    disabled={copiada || ocupado}
                    onClick={() => copiar(r)}
                    aria-label={copiada ? `${r.nombre} copiada` : `Copiar ${r.nombre}`}
                  >
                    {copiada ? "✓ Copiada" : "Copiar"}
                  </button>
                </li>
              );
            })}
          </ul>
          {mias.length > 0 && (
            <p className="subtitulo">
              Ya tienes {mias.length} {mias.length === 1 ? "rutina tuya" : "rutinas tuyas"}.
            </p>
          )}
        </>
      )}

      {paso === 2 && (
        <>
          <h2 id="titulo-bienvenida">Planifica tu semana</h2>
          <p className="subtitulo">
            Elige qué rutina toca cada día; el resto, descanso. Inicio te dirá qué toca hoy. Es opcional y lo
            puedes cambiar en el Diario.
          </p>
          <div className="plan-semanal" role="group" aria-label="Plan semanal">
            <SelectorSemana dias={dias} rutinas={rutinas ?? []} onCambiar={setDias} />
          </div>
          <button type="button" className="enlace-secundario" onClick={() => setPaso(3)}>
            Ahora no
          </button>
        </>
      )}

      {paso === 3 && (
        <>
          <h2 id="titulo-bienvenida">¡Listo!</h2>
          {plan.length > 0 ? (
            <>
              <p className="subtitulo">Tu semana:</p>
              <ul className="bienvenida-plan" aria-label="Tu semana">
                {plan.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="subtitulo">Sin plan por ahora: Inicio te propondrá la última rutina que uses.</p>
          )}
          <p className="subtitulo">
            Al entrenar, cada serie se rellena con lo que hiciste la última vez: solo tienes que ajustar y pulsar
            «Hecha».
          </p>
        </>
      )}

      {error && <p role="alert">{error}</p>}

      <BotonFijo sinPestanas>
        {paso === 1 && (
          <button type="button" className="primario" onClick={() => setPaso(2)} disabled={ocupado}>
            Siguiente
          </button>
        )}
        {paso === 2 && (
          <button type="button" className="primario" onClick={guardarPlan} disabled={ocupado}>
            Guardar y seguir
          </button>
        )}
        {paso === 3 && (
          <button type="button" className="primario" onClick={onTerminar}>
            Ir al inicio
          </button>
        )}
      </BotonFijo>
    </section>
  );
}
