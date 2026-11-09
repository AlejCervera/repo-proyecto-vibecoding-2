"""Tipo real de una imagen (por su contenido, no por su nombre) y reglas de subida. Lógica pura."""

MAX_BYTES = 2 * 1024 * 1024
TIPOS_SUBIDA = {"image/jpeg", "image/png", "image/webp"}


class ImagenInvalida(ValueError):
    pass


def detectar_tipo(datos: bytes) -> str | None:
    if datos.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if datos.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if datos[:4] == b"RIFF" and datos[8:12] == b"WEBP":
        return "image/webp"
    if datos[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None


def validar_subida(datos: bytes) -> str:
    """Devuelve el tipo de la imagen o lanza ImagenInvalida."""
    if not datos:
        raise ImagenInvalida("No se ha recibido ninguna imagen")
    if len(datos) > MAX_BYTES:
        raise ImagenInvalida("La imagen no puede pasar de 2 MB")
    tipo = detectar_tipo(datos)
    if tipo not in TIPOS_SUBIDA:
        raise ImagenInvalida("La imagen debe ser JPEG, PNG o WebP")
    return tipo
