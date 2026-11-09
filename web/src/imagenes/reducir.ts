export const LADO_MAXIMO = 1200;
const CALIDAD = 0.85;

/** Medidas finales manteniendo la proporción, sin agrandar nunca. */
export function medidasReducidas(ancho: number, alto: number, maximo = LADO_MAXIMO) {
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/** Reduce una foto a JPEG de como mucho 1200 px. Si el navegador no puede, devuelve el original. */
export async function reducirImagen(archivo: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const { ancho, alto } = medidasReducidas(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();
    const reducida = await new Promise<Blob | null>((ok) =>
      canvas.toBlob(ok, "image/jpeg", CALIDAD),
    );
    return reducida ?? archivo;
  } catch {
    return archivo;
  }
}
