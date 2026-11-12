import { useEffect, useState } from "react";
import { obtenerHistorial, type Historial } from "../api/historial";
import { ApiError } from "../api/http";
import { urlImagen } from "../api/imagenes";
import { EjercicioImagen } from "../ejercicios/EjercicioImagen";
import { progresoEjercicio } from "../diario/graficas";
import { mejorSerie } from "../entrenar/estadisticas";
import { fechaCorta } from "../inicio/resumen";
import { enlace } from "../navegacion";
import { pesoPorReps, reemplazarSerie, type Serie } from "../series/serie";
import { SerieFila } from "../series/SerieFila";
import { FotoCirculo } from "../ui/FotoCirculo";
import { GraficaLinea } from "../ui/GraficaLinea";
import { HojaInferior } from "../ui/HojaInferior";
import { formatearNumero } from "../ui/pasos";
import { agruparPorDia } from "./agrupar";

type Props = { ejercicioId: number; onSesionCaducada: () => void };

/** «Lun 09/11/2026» */
const fechaDia = (iso: string) => `${fechaCorta(iso)}/${iso.slice(0, 4)}`;

/** Historial de un ejercicio: foto pequeña, récord y las series agrupadas por día. */
export function HistorialPage({ ejercicioId, onSesionCaducada }: Props) {
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState(false);
  const [versionFoto, setVersionFoto] = useState(0);

  useEffect(() => {
    obtenerHistorial(ejercicioId)
      .then(setHistorial)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
  }, [ejercicioId, onSesionCaducada]);

  const volver = <a href={enlace({ pantalla: "diario" })}>← Volver</a>;

  if (error) {
    return (
      <section>
        {volver}
        <p role="alert">{error}</p>
      </section>
    );
  }
  if (!historial) return <p>Cargando…</p>;

  const { ejercicio, series } = historial;
  const dias = agruparPorDia(series);
  const mejor = mejorSerie(series);
  const sesiones = progresoEjercicio(series);

  const cambiada = (s: Serie) =>
    setHistorial({
      ...historial,
      // si se cambia a otro ejercicio, ya no pertenece a este historial
      series: s.ejercicio_id === ejercicio.id ? reemplazarSerie(series, s) : series.filter((x) => x.id !== s.id),
    });
  const borrada = (id: number) => setHistorial({ ...historial, series: series.filter((x) => x.id !== id) });

  return (
    <section className="historial">
      {volver}
      <div className="historial-cabecera">
        <FotoCirculo
          nombre={ejercicio.nombre}
          src={ejercicio.imagen ? urlImagen(ejercicio.id, versionFoto) : null}
          onAbrir={() => setFotoAbierta(true)}
        />
        <h2>
          <span className="oculto">Historial:</span> {ejercicio.nombre}
        </h2>
      </div>

      {mejor && (
        <dl className="cifras" aria-label="Resumen del ejercicio">
          <div className="destacada">
            <dt>Mejor serie</dt>
            <dd>{pesoPorReps(mejor)}</dd>
          </div>
          <div>
            <dt>Sesiones</dt>
            <dd>{dias.length}</dd>
          </div>
          <div>
            <dt>Series</dt>
            <dd>{series.length}</dd>
          </div>
        </dl>
      )}

      {sesiones.length >= 2 && (
        <section className="tarjeta tarjeta-grafica" aria-label="Evolución">
          <h3 className="titulo-grafica">Evolución</h3>
          <GraficaLinea
            titulo={`Evolución de ${ejercicio.nombre}, últimas ${sesiones.length} sesiones`}
            etiquetas={sesiones.map((x) => `${x.fecha.slice(8)}/${x.fecha.slice(5, 7)}`)}
            series={[
              { nombre: "Peso máximo", valores: sesiones.map((x) => x.pesoMax), color: "dato-1" },
              { nombre: "1RM estimado", valores: sesiones.map((x) => x.unoRM), color: "dato-2", discontinua: true },
            ]}
            formato={(n) => `${formatearNumero(n)} kg`}
          />
        </section>
      )}
      {sesiones.length === 1 && (
        <p className="vacio">Necesitas al menos 2 sesiones para ver la evolución.</p>
      )}

      {dias.length === 0 ? (
        <p className="vacio">Aún no has registrado series de este ejercicio.</p>
      ) : (
        dias.map((d) => (
          <section key={d.fecha} className="dia" aria-label={fechaDia(d.fecha)}>
            <h3>{fechaDia(d.fecha)}</h3>
            <ul aria-label={`Series del ${fechaDia(d.fecha)}`} className="series-dia">
              {d.series.map((s) => (
                <SerieFila
                  key={s.id}
                  serie={s}
                  mostrarEjercicio={false}
                  mostrarFecha={false}
                  onCambiada={cambiada}
                  onBorrada={borrada}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {fotoAbierta && (
        <HojaInferior titulo={ejercicio.nombre} onCerrar={() => setFotoAbierta(false)}>
          <EjercicioImagen
            ejercicio={ejercicio}
            onCambio={(e) => {
              setHistorial({ ...historial, ejercicio: e });
              setVersionFoto(Date.now());
            }}
          />
        </HojaInferior>
      )}
    </section>
  );
}
