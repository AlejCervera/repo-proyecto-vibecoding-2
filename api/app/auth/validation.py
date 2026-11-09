"""Reglas de registro e inicio de sesión. Lógica pura."""

import hmac
import re
from dataclasses import dataclass
from typing import Any

_NOMBRE = re.compile(r"^[A-Za-z0-9._-]{3,30}$")
MIN_PASSWORD, MAX_PASSWORD = 8, 200


class DatosInvalidos(ValueError):
    pass


@dataclass(frozen=True)
class Credenciales:
    nombre_usuario: str
    password: str


def _texto(datos: dict, campo: str) -> str:
    valor = datos.get(campo)
    return valor if isinstance(valor, str) else ""


def validar_login(datos: Any) -> Credenciales:
    if not isinstance(datos, dict):
        raise DatosInvalidos("Los datos no son válidos")
    nombre = _texto(datos, "nombre_usuario").strip()
    password = _texto(datos, "password")
    if not nombre or not password:
        raise DatosInvalidos("Escribe usuario y contraseña")
    return Credenciales(nombre, password)


def validar_registro(datos: Any) -> Credenciales:
    cred = validar_login(datos)
    if not _NOMBRE.match(cred.nombre_usuario):
        raise DatosInvalidos(
            "El usuario debe tener de 3 a 30 caracteres: letras, números, «.», «_» o «-»"
        )
    if len(cred.password) < MIN_PASSWORD:
        raise DatosInvalidos(f"La contraseña debe tener al menos {MIN_PASSWORD} caracteres")
    if len(cred.password) > MAX_PASSWORD:
        raise DatosInvalidos("La contraseña es demasiado larga")
    return cred


def codigo_valido(dado: Any, esperado: str) -> bool:
    """Sin código configurado, el registro está cerrado."""
    if not esperado or not isinstance(dado, str):
        return False
    return hmac.compare_digest(dado.strip().encode(), esperado.encode())
