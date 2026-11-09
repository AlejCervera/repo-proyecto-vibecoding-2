import { useState, type ChangeEvent } from "react";
import { subirImagen, urlImagen } from "../api/imagenes";
import { reducirImagen } from "../imagenes/reducir";
import { atribucion, puedeSubirImagen, type Ejercicio } from "./ejercicio";

type Props = { ejercicio: Ejercicio; onCambio: (e: Ejercicio) => void };

/** Imagen del ejercicio (de ejemplo o propia) y, si se puede, botón para subir la tuya. */
export function EjercicioImagen({ ejercicio, onCambio }: Props) {
  const [version, setVersion] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      const imagen = await subirImagen(ejercicio.id, await reducirImagen(archivo));
      setVersion(Date.now());
      onCambio({ ...ejercicio, imagen });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido subir la imagen");
    } finally {
      setSubiendo(false);
    }
  }

  const texto = atribucion(ejercicio.imagen);

  return (
    <div>
      {ejercicio.imagen && (
        <figure>
          <img
            src={urlImagen(ejercicio.id, version)}
            alt={`Imagen de ${ejercicio.nombre}`}
            style={{ maxWidth: "100%", maxHeight: 240 }}
          />
          {texto && (
            <figcaption>
              <small>{texto}</small>
            </figcaption>
          )}
        </figure>
      )}
      {puedeSubirImagen(ejercicio) && (
        <label>
          {subiendo ? "Subiendo…" : ejercicio.imagen ? "Cambiar imagen" : "Subir imagen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={elegirArchivo}
            disabled={subiendo}
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
