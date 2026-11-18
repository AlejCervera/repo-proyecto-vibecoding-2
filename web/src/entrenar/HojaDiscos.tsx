import { useEffect, useState } from "react";
import { obtenerPerfil } from "../api/perfil";
import { formatearNumero } from "../ui/pasos";
import { HojaInferior } from "../ui/HojaInferior";
import { discosPorLado } from "./discos";

type Props = { peso: number | null; onCerrar: () => void };

const BARRA_POR_DEFECTO = 20;
const kg = (n: number) => `${formatearNumero(n)} kg`;

/** Qué discos poner por lado para el peso de la serie (Fase 9g). La barra se elige en Perfil. */
export function HojaDiscos({ peso, onCerrar }: Props) {
  const [barra, setBarra] = useState<number | null>(null);

  useEffect(() => {
    obtenerPerfil()
      .then((p) => setBarra(p.barra_kg ?? BARRA_POR_DEFECTO))
      .catch(() => setBarra(BARRA_POR_DEFECTO));
  }, []);

  return (
    <HojaInferior titulo="Discos por lado" onCerrar={onCerrar}>
      {peso === null || peso <= 0 ? (
        <p>Escribe primero el peso de la serie.</p>
      ) : barra === null ? (
        <p>Cargando…</p>
      ) : (
        <Carga peso={peso} barra={barra} />
      )}
      <p className="subtitulo">
        <small>El peso de la barra se cambia en Perfil.</small>
      </p>
    </HojaInferior>
  );
}

function Carga({ peso, barra }: { peso: number; barra: number }) {
  const carga = discosPorLado(peso, barra);
  if (carga.tipo === "sin-discos") {
    return (
      <p className="discos-resumen">
        {kg(peso)} con una barra de {kg(barra)}: <strong>sin discos</strong>.
      </p>
    );
  }
  return (
    <>
      <p className="discos-resumen">
        Para <strong>{kg(peso)}</strong> con barra de {kg(barra)}:
      </p>
      {/* Dibujo de un lado de la barra: cada disco más alto cuanto más pesa */}
      <div className="discos-dibujo" aria-hidden="true">
        <span className="discos-barra" />
        {carga.porLado.map((d, i) => (
          <span key={i} className="disco" style={{ height: `${28 + d * 2.4}px` }}>
            {formatearNumero(d)}
          </span>
        ))}
      </div>
      <p className="discos-lista">
        <span className="oculto">Por lado: </span>
        {carga.porLado.map(formatearNumero).join(" · ")}
      </p>
      {!carga.exacto && (
        <p role="status" className="aviso-discos">
          No se puede cargar exacto: lo más cercano es <strong>{kg(carga.total)}</strong>.
        </p>
      )}
    </>
  );
}
