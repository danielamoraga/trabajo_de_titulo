"""
Entrada desde UCampus (pasos 4 a 8 del diagrama de secuencia).

Esta ruta es la "URL acordada" que se registra en UCampus. Es una
propuesta de endpoint nuevo para la API de Psifos.
"""

import time
from collections.abc import AsyncIterator
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from pydantic import ValidationError

import bdd
import config
from esquemas import DatosUCampus

router = APIRouter(tags=["Entrada desde UCampus"])


async def cliente_ucampus() -> AsyncIterator[httpx.AsyncClient]:
    """Cliente HTTP hacia UCampus. Las pruebas lo reemplazan."""
    async with httpx.AsyncClient(timeout=10) as cliente:
        yield cliente


@router.get("/psifos/api/ucampus-entry", response_class=PlainTextResponse)
async def entrada(
    token: str, cliente: httpx.AsyncClient = Depends(cliente_ucampus)
) -> str:
    """
    UCampus llama acá con ?token=XXX (paso 4).

    Responde SIEMPRE texto plano con status 200: o una URL, que UCampus
    carga en el iframe, o un mensaje de error, que UCampus le muestra a
    la persona.
    """
    # Paso 5: obtener los datos de la persona desde UCampus, con GET como
    # en el ejemplo oficial.
    try:
        r = await cliente.get(config.URL_DATOS_UCAMPUS, params={"token": token})
    except httpx.RequestError:
        return "No fue posible contactar a UCampus. Intente nuevamente."

    # Paso 6: cualquier cosa que no sea un 200 con el JSON esperado se
    # trata como token inválido (no se sabe qué responde UCampus en ese caso).
    if r.status_code != 200:
        return "El token de acceso no es válido."
    try:
        datos = DatosUCampus.model_validate_json(r.content)
    except ValidationError:
        return "El token de acceso no es válido."

    if time.time() - datos.time > config.TOLERANCIA_UCAMPUS_SEG:
        return "El token de acceso caducó. Vuelva a ingresar al módulo."

    # Paso 7: asociar los datos a un token de entrada en la BDD.
    token_entrada = bdd.crear_token_entrada(datos)

    # Paso 8: URL de retorno con el token de entrada. Esta URL queda
    # expuesta (UCampus la copia en su hash); el token deja de servir
    # apenas el frontend lo usa para pedir la lista (D-029).
    return f"{config.URL_FRONTEND}?{urlencode({'token': token_entrada})}"
