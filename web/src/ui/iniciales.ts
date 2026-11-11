/** Palabras que no cuentan para las iniciales («Press de banca» → «PB»). */
const VACIAS = new Set(["a", "al", "con", "de", "del", "el", "en", "la", "las", "los", "y"]);

/** Iniciales para la foto en círculo de un ejercicio sin imagen: dos letras como mucho. */
export function iniciales(nombre: string): string {
  const palabras = nombre
    .split(/[\s\-_/()]+/)
    .filter((p) => p && /\p{L}/u.test(p) && !VACIAS.has(p.toLowerCase()));
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) {
    const [p] = palabras;
    return p.charAt(0).toUpperCase() + (p.charAt(1) ?? "").toLowerCase();
  }
  return (palabras[0].charAt(0) + palabras[1].charAt(0)).toUpperCase();
}
