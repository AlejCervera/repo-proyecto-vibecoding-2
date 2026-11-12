import { useRef, useState } from "react";
import type { EntradaDiario } from "../api/entrenamientos";
import { fechaCorta } from "../inicio/resumen";
import type { Serie } from "../series/serie";
import { GraficaBarras, type Barra } from "../ui/GraficaBarras";
import { formatearNumero } from "../ui/pasos";
import { compacto, entrenosPorSemana, media, recordsRecientes, volumenPorSemana, type Punto } from "./graficas";

type Props = { hoy: string; diario: EntradaDiario[]; series: Serie[] };

const TARJETAS = ["Entrenos por semana", "Volumen semanal", "Récords recientes"];

/** «9/11» */
const diaMes = (iso: string) => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;

function aBarras(puntos: Punto[]): Barra[] {
  return puntos.map((p, i) => ({
    etiqueta: diaMes(p.lunes),
    detalle: i === puntos.length - 1 ? "esta semana" : `semana del ${diaMes(p.lunes)}`,
    valor: p.valor,
  }));
}

const entrenos = (n: number) => `${n} ${n === 1 ? "entreno" : "entrenos"}`;
const kilos = (n: number) => `${compacto(n)} kg`;

/** Tres tarjetas que se deslizan en horizontal: entrenos y volumen por semana, y récords recientes. */
export function Progreso({ hoy, diario, series }: Props) {
  const carrusel = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);

  const porSemana = entrenosPorSemana(diario, hoy);
  const volumen = volumenPorSemana(series, hoy);
  const records = recordsRecientes(series);
  const [anterior, actual] = volumen.slice(-2).map((p) => p.valor);
  const cambio = anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null;

  function irA(i: number) {
    const el = carrusel.current;
    el?.scrollTo?.({ left: i * el.clientWidth, behavior: "smooth" });
    setVisible(i);
  }

  return (
    <section className="progreso-diario" aria-label="Progreso">
      <h3>Progreso</h3>
      <div
        ref={carrusel}
        className="carrusel"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth > 0) setVisible(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        <article className="tarjeta tarjeta-grafica" aria-label={TARJETAS[0]}>
          <h4>{TARJETAS[0]}</h4>
          <p className="subtitulo">
            Media de las últimas 12 semanas: {formatearNumero(Math.round(media(porSemana.map((p) => p.valor)) * 10) / 10)}
          </p>
          <GraficaBarras titulo="Entrenos por semana, últimas 12 semanas" barras={aBarras(porSemana)} formato={entrenos} />
        </article>

        <article className="tarjeta tarjeta-grafica" aria-label={TARJETAS[1]}>
          <h4>{TARJETAS[1]}</h4>
          <p className="subtitulo">
            Kilos × repeticiones de todas tus series
            {cambio !== null && ` · ${cambio >= 0 ? "+" : "−"}${Math.abs(cambio)} % respecto a la anterior`}
          </p>
          <GraficaBarras titulo="Volumen por semana, últimas 12 semanas" barras={aBarras(volumen)} formato={kilos} />
        </article>

        <article className="tarjeta tarjeta-grafica" aria-label={TARJETAS[2]}>
          <h4>{TARJETAS[2]}</h4>
          {records.length === 0 ? (
            <p className="vacio">Aún no hay récords: aparecen cuando superas tu mejor peso en un ejercicio.</p>
          ) : (
            <ul aria-label="Récords recientes" className="lista-records">
              {records.map((r) => (
                <li key={`${r.fecha}-${r.ejercicio_id}`}>
                  <span className="record-ejercicio">
                    <strong>{r.ejercicio}</strong>
                    <small>{fechaCorta(r.fecha)}</small>
                  </span>
                  <span className="record-valor">
                    {formatearNumero(r.peso_kg)} kg × {r.repeticiones}
                    <small>+{formatearNumero(r.mejora)} kg</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
      <div className="puntos-carrusel">
        {TARJETAS.map((t, i) => (
          <button key={t} type="button" aria-label={`Ver ${t.toLowerCase()}`} aria-current={i === visible ? "true" : undefined} onClick={() => irA(i)}>
            <span />
          </button>
        ))}
      </div>
    </section>
  );
}
