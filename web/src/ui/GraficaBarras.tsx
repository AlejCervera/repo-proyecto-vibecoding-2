import { useState } from "react";
import { compacto, ejeY } from "../diario/graficas";

export type Barra = {
  /** Texto corto del eje («9/11»). */
  etiqueta: string;
  /** Texto de la lectura y de la tabla («semana del 9/11»). */
  detalle: string;
  valor: number;
};

type Props = {
  titulo: string;
  barras: Barra[];
  /** Cómo se escribe un valor («2 entrenos», «1250 kg»). */
  formato: (n: number) => string;
};

const ANCHO = 320;
const ALTO = 140;
const IZQ = 34; // espacio para las cifras del eje
const ABAJO = 18; // espacio para las fechas
const ARRIBA = 6;
const GROSOR_MAX = 24;
const R = 4;

/** Barra con la punta redondeada (4 px) y la base recta, creciendo desde el eje. */
function rutaBarra(x: number, ancho: number, base: number, alto: number): string {
  const r = Math.min(R, alto, ancho / 2);
  const arriba = base - alto;
  return `M${x},${base} V${arriba + r} Q${x},${arriba} ${x + r},${arriba} H${x + ancho - r} Q${x + ancho},${arriba} ${x + ancho},${arriba + r} V${base} Z`;
}

/**
 * Columnas de una serie (las últimas semanas): la última, la actual, en el color de datos;
 * el resto en gris. Al tocar o enfocar una columna, su valor se lee arriba.
 */
export function GraficaBarras({ titulo, barras, formato }: Props) {
  const [elegida, setElegida] = useState(barras.length - 1);
  const marcas = ejeY(Math.max(...barras.map((b) => b.valor), 0));
  const tope = marcas.at(-1)!;
  const base = ALTO - ABAJO;
  const altoUtil = base - ARRIBA;
  const hueco = (ANCHO - IZQ) / barras.length;
  const grosor = Math.min(GROSOR_MAX, hueco * 0.62);
  const actual = barras[elegida];

  return (
    <figure className="grafica">
      <p className="lectura" aria-live="polite">
        <strong>{formato(actual.valor)}</strong> {actual.detalle}
      </p>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="group" aria-label={titulo} className="grafica-svg">
        {marcas.map((m) => {
          const y = base - (m / tope) * altoUtil;
          return (
            <g key={m} aria-hidden="true">
              <line x1={IZQ} x2={ANCHO} y1={y} y2={y} className="rejilla" />
              <text x={IZQ - 6} y={y + 3} className="eje" textAnchor="end">
                {compacto(m)}
              </text>
            </g>
          );
        })}
        {barras.map((b, i) => {
          const x = IZQ + hueco * i + (hueco - grosor) / 2;
          const alto = (b.valor / tope) * altoUtil;
          const esActual = i === barras.length - 1;
          const clase = `barra${esActual ? " actual" : ""}${i === elegida ? " elegida" : ""}`;
          // Fechas solo cada 3 columnas, contando desde la actual, para que no se pisen
          const conFecha = (barras.length - 1 - i) % 3 === 0;
          return (
            <g key={b.detalle}>
              {alto > 0 && <path d={rutaBarra(x, grosor, base, alto)} className={clase} aria-hidden="true" />}
              {conFecha && (
                <text x={x + grosor / 2} y={ALTO - 4} className="eje" textAnchor="middle" aria-hidden="true">
                  {b.etiqueta}
                </text>
              )}
              {/* Zona de toque: toda la franja de la columna, más grande que la barra */}
              <rect
                x={IZQ + hueco * i}
                y={0}
                width={hueco}
                height={base}
                className="zona-toque"
                tabIndex={0}
                aria-label={`${b.detalle}: ${formato(b.valor)}`}
                data-indice={i}
                onClick={() => setElegida(i)}
                onFocus={() => setElegida(i)}
              />
            </g>
          );
        })}
        <line x1={IZQ} x2={ANCHO} y1={base} y2={base} className="eje-base" aria-hidden="true" />
      </svg>
      <table className="oculto">
        <caption>{titulo}</caption>
        <tbody>
          {barras.map((b) => (
            <tr key={b.detalle}>
              <th scope="row">{b.detalle}</th>
              <td>{formato(b.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
