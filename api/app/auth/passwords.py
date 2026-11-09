"""Hash de contraseñas y tokens de sesión. Solo librería estándar."""

import hashlib
import hmac
import secrets

_N, _R, _P, _LARGO = 2**14, 8, 1, 32


def _scrypt(password: str, sal: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode(), salt=sal, n=n, r=r, p=p, dklen=_LARGO)


def hash_password(password: str) -> str:
    sal = secrets.token_bytes(16)
    clave = _scrypt(password, sal, _N, _R, _P)
    return f"scrypt${_N}${_R}${_P}${sal.hex()}${clave.hex()}"


def verify_password(password: str, guardado: str) -> bool:
    try:
        algoritmo, n, r, p, sal, clave = guardado.split("$")
        if algoritmo != "scrypt":
            return False
        calculada = _scrypt(password, bytes.fromhex(sal), int(n), int(r), int(p))
    except ValueError:
        return False
    return hmac.compare_digest(calculada, bytes.fromhex(clave))


# Hash fijo para gastar el mismo tiempo cuando el usuario no existe.
HASH_FALSO = hash_password(secrets.token_hex(16))


def nuevo_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str, secreto: str) -> str:
    return hmac.new(secreto.encode(), token.encode(), hashlib.sha256).hexdigest()
