import { useState } from "react";

export type SerieLinea = {
  nombre: string;
  valores: number[];
  /** Clase de color: «dato-1» (lima de datos) o «dato-2» (azul). */
  color: "dato-1" | "dato-2";
  /** Línea discontinua: segunda forma de distinguirla, además del color. */
  discontinua?: boolean;
};

type Props = {
  titulo: string;
  /** Etiqueta de cada punto en el eje X («09/11»). */
  etiquetas: string[];
  series: SerieLinea[];
  formato: (n: number) => string;
};

const ANCHO = 320;
const ALTO = 150;
const IZQ = 34;
const DER = 10;
const ABAJO = 18;
const ARRIBA = 10;

/** Extremos redondos (de 2,5 en 2,5) un poco por fuera de los datos. */
function rango(valores: number[]): [number, number] {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const bajo = Math.floor((min * 0.95) / 2.5) * 2.5;
  const alto = Math.ceil((max * 1.05) / 2.5) * 2.5;
  return bajo === alto ? [bajo - 2.5, alto + 2.5] : [bajo, alto];
}

/**
 * Líneas de evolución (una o dos series en el mismo eje). Al tocar o enfocar una sesión, una
 * línea vertical la marca y arriba se leen los valores de todas las series en ese punto.
 */
export function GraficaLinea({ titulo, etiquetas, series, formato }: Props) {
  const n = etiquetas.length;
  const [elegido, setElegido] = useState(n - 1);
  const [bajo, alto] = rango(series.flatMap((s) => s.valores));
  const base = ALTO - ABAJO;
  const x = (i: number) => IZQ + (n === 1 ? (ANCHO - IZQ - DER) / 2 : (i * (ANCHO - IZQ - DER)) / (n - 1));
  const y = (v: number) => base - ((v - bajo) / (alto - bajo)) * (base - ARRIBA);
  const marcas = [bajo, (bajo + alto) / 2, alto];
  const franja = (ANCHO - IZQ - DER) / Math.max(n - 1, 1);

  return (
    <figure className="grafica">
      <p className="lectura" aria-live="polite">
        <span className="lectura-fecha">{etiquetas[elegido]}</span>
        {series.map((s) => (
          <span key={s.nombre} className="lectura-valor">
            <span className={`clave-linea ${s.color}${s.discontinua ? " discontinua" : ""}`} aria-hidden="true" />
            <strong>{formato(s.valores[elegido])}</strong> {s.nombre}
          </span>
        ))}
      </p>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="group" aria-label={titulo} className="grafica-svg">
        {marcas.map((m) => (
          <g key={m} aria-hidden="true">
            <line x1={IZQ} x2={ANCHO - DER} y1={y(m)} y2={y(m)} className="rejilla" />
            <text x={IZQ - 6} y={y(m) + 3} className="eje" textAnchor="end">
              {Math.round(m)}
            </text>
          </g>
        ))}
        {[0, n - 1].filter((i, j, a) => a.indexOf(i) === j).map((i) => (
          <text key={i} x={x(i)} y={ALTO - 4} className="eje" textAnchor={i === 0 && n > 1 ? "start" : "end"} aria-hidden="true">
            {etiquetas[i]}
          </text>
        ))}
        <line x1={x(elegido)} x2={x(elegido)} y1={ARRIBA} y2={base} className="cruceta" aria-hidden="true" />
        {series.map((s) => (
          <g key={s.nombre} aria-hidden="true">
            <polyline
              points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              className={`linea ${s.color}${s.discontinua ? " discontinua" : ""}`}
            />
            <circle cx={x(elegido)} cy={y(s.valores[elegido])} r={4.5} className={`punto ${s.color}`} />
          </g>
        ))}
        {etiquetas.map((e, i) => (
          <rect
            key={`${e}-${i}`}
            x={x(i) - franja / 2}
            y={0}
            width={franja}
            height={base}
            className="zona-toque"
            tabIndex={0}
            aria-label={`${e}: ${series.map((s) => `${s.nombre} ${formato(s.valores[i])}`).join(", ")}`}
            data-indice={i}
            onClick={() => setElegido(i)}
            onFocus={() => setElegido(i)}
          />
        ))}
      </svg>
      <ul className="leyenda-grafica" aria-hidden="true">
        {series.map((s) => (
          <li key={s.nombre}>
            <span className={`clave-linea ${s.color}${s.discontinua ? " discontinua" : ""}`} />
            {s.nombre}
          </li>
        ))}
      </ul>
      <table className="oculto">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Sesión</th>
            {series.map((s) => (
              <th key={s.nombre} scope="col">
                {s.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {etiquetas.map((e, i) => (
            <tr key={`${e}-${i}`}>
              <th scope="row">{e}</th>
              {series.map((s) => (
                <td key={s.nombre}>{formato(s.valores[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
