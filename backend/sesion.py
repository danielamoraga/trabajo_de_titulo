"""
Sesión de cabina (D-029).

Se crea en la lista de elecciones al usar el token de entrada. El frontend
la guarda solo en memoria y la envía en la cabecera Authorization: Bearer
de cada request siguiente (cabina, voto...).

PENDIENTE: decidir si se mantiene así o se pasa a cookie HTTP.
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import bdd
from esquemas import Sesion

# auto_error=False para responder siempre el mismo 401, falte la cabecera
# o venga mal formada.
_bearer = HTTPBearer(auto_error=False)


def sesion_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> Sesion:
    """
    Dependencia para las rutas que requieren sesión de cabina.

    El token se acepta solo por cabecera, nunca por query: en una URL
    volvería a quedar expuesto (D-029). Falte, no exista o haya vencido,
    la respuesta es la misma.
    """
    sesion = bdd.obtener_sesion(credenciales.credentials) if credenciales else None
    if sesion is None:
        raise HTTPException(
            401,
            "La sesión no es válida.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return sesion
