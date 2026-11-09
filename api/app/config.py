import os


def _obligatoria(nombre: str) -> str:
    valor = os.environ.get(nombre)
    if not valor:
        raise RuntimeError(f"Falta la variable {nombre}")
    return valor


def database_url() -> str:
    return _obligatoria("DATABASE_URL")


def session_secret() -> str:
    return _obligatoria("SESSION_SECRET")


def invite_code() -> str:
    """Código para registrarse. Vacío = registro cerrado."""
    return os.environ.get("INVITE_CODE", "")


def cookie_secure() -> bool:
    """True cuando la app se sirva por HTTPS."""
    return os.environ.get("COOKIE_SECURE", "").lower() in ("1", "true", "yes")
