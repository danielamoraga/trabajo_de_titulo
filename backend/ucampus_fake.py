"""
UCampus simulado, solo para desarrollo. En producción esto lo provee UCampus.

Cubre los dos puntos del flujo en que participa UCampus:
  - Paso 4: emite un token (acá, a pedido, para poder probar).
  - Paso 5: recibe el token y devuelve el JSON del usuario, en la misma
    ruta que el UCampus real (/b/externos/datos).

La documentación llama "ticket" a este parámetro; se usa "token",
confirmado por el profesor guía (ver decisiones.md).
"""

import secrets
import time

from fastapi import APIRouter, Response

from esquemas import DatosUCampus

router = APIRouter(tags=["UCampus (simulado)"])

# token -> datos del usuario
_TOKENS: dict[str, DatosUCampus] = {}


@router.post("/ucampus-fake/emitir-token")
def emitir_token(id_externo: str = "votante01", antiguedad: int = 0) -> dict:
    """
    Genera un token de prueba. No existe en UCampus.

    `id_externo` elige a la persona: en los datos de prueba, votante01
    figura en tres padrones, votante02 en uno y votante03 en ninguno.

    `antiguedad` resta segundos al campo time, para probar un token caducado.
    """
    token = secrets.token_urlsafe(24)
    _TOKENS[token] = DatosUCampus(
        pers_id="11111111-1",
        permisos=["votar"],
        lang="es",
        theme="focus",
        # Hoja para servicios externos, la que cargan por dentro los
        # servicios de ADI (doc_ucampus/ejemplos_iframes).
        css="https://ucampus.uchile.cl/d/css/focus.style_externo_v34719.css",
        time=int(time.time()) - antiguedad,
        mod_id="uparticipa",
        gru_id=None,
        id_externo=id_externo,
        session_hash=secrets.token_hex(8),
    )
    return {"token": token}


@router.get("/b/externos/datos", response_model=DatosUCampus)
def datos(token: str):
    """
    Paso 5: devuelve el JSON del usuario asociado al token.

    SUPUESTO: ante un token inválido responde 404 sin cuerpo; no se sabe
    qué responde el UCampus real.

    PENDIENTE: el token debería ser de un solo uso. Por ahora no se consume.
    """
    usuario = _TOKENS.get(token)
    if usuario is None:
        return Response(status_code=404)
    return usuario
