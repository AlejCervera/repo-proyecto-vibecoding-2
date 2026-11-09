"""Bytes que pasan por imágenes de cada tipo (solo la cabecera importa para la validación)."""

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 100
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 100
GIF = b"GIF89a" + b"\x00" * 100
