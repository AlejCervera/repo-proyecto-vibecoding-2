import { useState } from "react";
import { iniciales } from "./iniciales";

type Props = {
  nombre: string;
  /** URL de la imagen; sin ella (o si no carga) se ven las iniciales. */
  src?: string | null;
  /** Diámetro en px. Pequeño por defecto: la foto acompaña, no manda. */
  tamano?: number;
  /** Si se pasa, el círculo es un botón «Ver foto de …». */
  onAbrir?: () => void;
};

/** Foto discreta de un ejercicio en un círculo pequeño, o sus iniciales en gris. */
export function FotoCirculo({ nombre, src, tamano = 40, onAbrir }: Props) {
  const [fallo, setFallo] = useState(false);
  const conImagen = Boolean(src) && !fallo;
  const contenido = conImagen ? (
    <img src={src!} alt="" loading="lazy" onError={() => setFallo(true)} />
  ) : (
    <span aria-hidden="true">{iniciales(nombre)}</span>
  );
  const estilo = { width: tamano, height: tamano, fontSize: Math.round(tamano * 0.34) };

  if (onAbrir) {
    return (
      <button
        type="button"
        className="foto-circulo"
        style={estilo}
        onClick={onAbrir}
        aria-label={`Ver foto de ${nombre}`}
      >
        {contenido}
      </button>
    );
  }
  return (
    <span className="foto-circulo" style={estilo} data-testid="foto-circulo">
      {contenido}
    </span>
  );
}
