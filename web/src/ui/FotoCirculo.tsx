import { useState } from "react";
import { iniciales } from "./iniciales";

type Props = {
  nombre: string;
  /** URL de la imagen; sin ella (o si no carga) se ven las iniciales. */
  src?: string | null;
  /** Diámetro en px. Pequeño por defecto: la foto acompaña al nombre, no manda. */
  tamano?: number;
  /** Si se pasa, el círculo es un botón «Ver foto de …». */
  onAbrir?: () => void;
};

/** Foto discreta de un ejercicio en un círculo pequeño, o sus iniciales en gris. */
export function FotoCirculo({ nombre, src, tamano = 36, onAbrir }: Props) {
  const [fallo, setFallo] = useState(false);
  const conImagen = Boolean(src) && !fallo;
  const circulo = (
    <span
      className="foto-circulo"
      style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.34) }}
      data-testid="foto-circulo"
    >
      {conImagen ? (
        <img src={src!} alt="" loading="lazy" onError={() => setFallo(true)} />
      ) : (
        <span aria-hidden="true">{iniciales(nombre)}</span>
      )}
    </span>
  );

  if (!onAbrir) return circulo;
  // El círculo es pequeño, pero el botón que lo rodea mide al menos 44 px para el dedo.
  return (
    <button type="button" className="foto-boton" onClick={onAbrir} aria-label={`Ver foto de ${nombre}`}>
      {circulo}
    </button>
  );
}
