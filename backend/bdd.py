"""
BDD de UParticipa (simulada en memoria).

Separada de la API para reflejar el diagrama de secuencia, donde la
sesión se asocia en la BDD (paso 7). Se pierde al reiniciar el proceso.

Guarda:
  - Tokens de entrada: van en la URL de retorno, son de un solo uso y
    vencen en segundos (D-029).
  - Sesiones de cabina: se crean al usar el token de entrada; su token
    nunca va en una URL.
  - Elecciones y padrón, con la misma forma que en Psifos.
"""

import secrets
import time
from datetime import datetime

from config import DURACION_SESION_SEG, DURACION_TOKEN_ENTRADA_SEG
from esquemas import DatosUCampus, Eleccion, Sesion

# =====================================================================
# Tokens de entrada y sesiones de cabina
# =====================================================================

# token de entrada -> datos pendientes
_TOKENS_ENTRADA: dict[str, Sesion] = {}

# token de sesión de cabina -> sesión
_SESIONES: dict[str, Sesion] = {}


def crear_token_entrada(datos: DatosUCampus) -> str:
    token = secrets.token_urlsafe(32)
    _TOKENS_ENTRADA[token] = Sesion(
        id_externo=datos.id_externo,
        css=datos.css,
        theme=datos.theme,
        lang=datos.lang,
        expira=time.time() + DURACION_TOKEN_ENTRADA_SEG,
    )
    return token


def usar_token_entrada(token: str) -> tuple[str, Sesion] | None:
    """
    Cambia un token de entrada por una sesión de cabina nueva. Devuelve
    (token de sesión, sesión), o None si el token no existe o venció.

    El token de entrada se borra al primer intento, sea válido o no.
    """
    pendiente = _TOKENS_ENTRADA.pop(token, None)
    if pendiente is None or pendiente.expira < time.time():
        return None

    token_sesion = secrets.token_urlsafe(32)
    sesion = pendiente.model_copy(update={"expira": time.time() + DURACION_SESION_SEG})
    _SESIONES[token_sesion] = sesion
    return token_sesion, sesion


def obtener_sesion(token: str) -> Sesion | None:
    """La sesión de cabina asociada al token, o None si no existe o ya venció."""
    sesion = _SESIONES.get(token)
    if sesion is None:
        return None
    if sesion.expira < time.time():
        del _SESIONES[token]
        return None
    return sesion


# =====================================================================
# Elecciones y padrón (datos de prueba)
#
# Misma forma que en Psifos: el padrón es por elección, una fila de Voter
# por persona y elección, y se une con Election por username.
#
# SUPUESTO: los valores de type, status, voters_login_type y trustee_type
# son de ejemplo; no se conocen los valores reales de esos enums.
# Las fechas son fijas: no se simula el log de eventos de Psifos.
# =====================================================================

_BASE = {
    "description": None,
    "type": "election",
    "max_weight": 1,
    "randomized_options": False,
    "voters_login_type": "close_p",
    "normalized": False,
    "grouped_voters": False,
    "trustee_type": None,
    "is_public": False,
}

ELECCIONES: dict[int, Eleccion] = {
    e.id: e
    for e in [
        Eleccion(
            **_BASE,
            id=1,
            short_name="votacion-1",
            long_name="Votación 1",
            status="started",
            start_date=datetime(2026, 10, 14, 9, 0),
            end_date=None,
        ),
        Eleccion(
            **_BASE,
            id=2,
            short_name="votacion-2",
            long_name="Votación 2",
            status="setting_up",
            start_date=None,
            end_date=None,
        ),
        Eleccion(
            **_BASE,
            id=3,
            short_name="votacion-3",
            long_name="Votación 3",
            status="ended",
            start_date=datetime(2026, 5, 11, 9, 0),
            end_date=datetime(2026, 5, 12, 20, 0),
        ),
    ]
}

# Voter: (election_id, username). username es el id_externo de UCampus.
VOTERS: list[tuple[int, str]] = [
    (1, "votante01"),
    (2, "votante01"),
    (3, "votante01"),
    (1, "votante02"),
    # votante03 no figura en ningún padrón.
]


def elecciones_de(username: str) -> list[Eleccion]:
    """
    Equivalente a crud.get_elections_from_voter de Psifos: todas las
    elecciones en cuyo padrón figura la persona, sin filtrar por estado.
    """
    return [ELECCIONES[eid] for eid, u in VOTERS if u == username and eid in ELECCIONES]
