import { useState, type ReactNode } from "react";
import { ApiError } from "../api/http";
import { pedirRecomendaciones, type Recomendaciones } from "../api/recomendaciones";
import { enlace } from "../navegacion";
import { aplicarAnadir, aplicarObjetivo, aplicarSustitucion, textoPeso } from "./recomendaciones";
import type { Rutina } from "./rutina";

type Props = {
  rutina: Rutina;
  onRutina: (r: Rutina) => void;
  onSesionCaducada: () => void;
};

type Fallo = { mensaje: string; sinPerfil: boolean };

/** Pide a la IA ejercicios que añadir o sustituir y objetivos de peso y repeticiones. */
export function RecomendacionesPanel({ rutina, onRutina, onSesionCaducada }: Props) {
  const [recos, setRecos] = useState<Recomendaciones | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [aplicadas, setAplicadas] = useState<Set<string>>(new Set());
  const [ocupada, setOcupada] = useState<string | null>(null);

  function tratarError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) return onSesionCaducada();
    const mensaje = e instanceof Error ? e.message : "Error inesperado";
    setFallo({ mensaje, sinPerfil: e instanceof ApiError && e.status === 400 });
  }

  async function pedir() {
    setCargando(true);
    setFallo(null);
    setRecos(null);
    setAplicadas(new Set());
    try {
      setRecos(await pedirRecomendaciones(rutina.id));
    } catch (e) {
      tratarError(e);
    } finally {
      setCargando(false);
    }
  }

  async function aplicar(clave: string, accion: () => Promise<Rutina>) {
    setOcupada(clave);
    setFallo(null);
    try {
      onRutina(await accion());
      setAplicadas((a) => new Set(a).add(clave));
    } catch (e) {
      tratarError(e);
    } finally {
      setOcupada(null);
    }
  }

  function boton(clave: string, nombre: string, accion: () => Promise<Rutina>): ReactNode {
    if (aplicadas.has(clave)) return <small>✓ Aplicado</small>;
    return (
      <button
        type="button"
        aria-label={`Aplicar: ${nombre}`}
        disabled={ocupada !== null}
        onClick={() => aplicar(clave, accion)}
      >
        Aplicar
      </button>
    );
  }

  return (
    <section aria-label="Recomendaciones de la IA" className="tarjeta">
      <h3>Recomendaciones con IA</h3>
      <p>
        <small>Según tu altura, tu peso y tus últimas series (peso y repeticiones).</small>
      </p>
      <button type="button" onClick={pedir} disabled={cargando}>
        {cargando ? "Pensando…" : recos ? "Pedir otras" : "Pedir recomendaciones"}
      </button>
      {fallo && (
        <p role="alert">
          {fallo.mensaje}
          {fallo.sinPerfil && (
            <>
              {" "}
              <a href={enlace({ pantalla: "perfil" })}>Ir a Mi perfil</a>
            </>
          )}
        </p>
      )}
      {recos && (
        <div>
          <p>{recos.resumen}</p>
          {recos.objetivos.length > 0 && (
            <>
              <h4>Próxima sesión</h4>
              <ul aria-label="Objetivos recomendados">
                {recos.objetivos.map((o) => {
                  const peso = textoPeso(o.peso_kg);
                  return (
                    <li key={`o${o.ejercicio_id}`}>
                      <strong>{o.nombre}</strong>: {peso ? `${peso}, ` : ""}
                      {o.reps_min === o.reps_max ? o.reps_min : `${o.reps_min}-${o.reps_max}`} repeticiones
                      <br />
                      <small>{o.motivo}</small>{" "}
                      {boton(`o${o.ejercicio_id}`, `objetivo de ${o.nombre}`, () => aplicarObjetivo(rutina.id, o))}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {recos.anadir.length > 0 && (
            <>
              <h4>Añadir</h4>
              <ul aria-label="Ejercicios recomendados para añadir">
                {recos.anadir.map((a) => (
                  <li key={`a${a.ejercicio_id}`}>
                    <strong>{a.nombre}</strong>: {a.series} × {a.reps_min}-{a.reps_max}
                    <br />
                    <small>{a.motivo}</small> {boton(`a${a.ejercicio_id}`, `añadir ${a.nombre}`, () => aplicarAnadir(rutina.id, a))}
                  </li>
                ))}
              </ul>
            </>
          )}
          {recos.sustituir.length > 0 && (
            <>
              <h4>Sustituir</h4>
              <ul aria-label="Sustituciones recomendadas">
                {recos.sustituir.map((s) => (
                  <li key={`s${s.quitar_id}`}>
                    <strong>{s.quitar_nombre}</strong> → <strong>{s.poner_nombre}</strong>
                    <br />
                    <small>{s.motivo}</small>{" "}
                    {boton(`s${s.quitar_id}`, `cambiar ${s.quitar_nombre} por ${s.poner_nombre}`, () =>
                      aplicarSustitucion(rutina, s),
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p>
            <small>Son sugerencias de una IA: revísalas y escucha a tu cuerpo.</small>
          </p>
        </div>
      )}
    </section>
  );
}
