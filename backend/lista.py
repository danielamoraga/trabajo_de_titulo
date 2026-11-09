"""
Lista de elecciones para UCampus (pasos 10 a 12).

Es la primera llamada del frontend. Usa el token de entrada de la URL de
retorno, que queda invalidado, y entrega a cambio la sesión de cabina, los
datos de presentación y las elecciones de la persona.

Por dentro equivale a /panel-voter de Psifos (crud.get_elections_from_voter),
con la sesión de UCampus en lugar de OIDC como forma de autenticación (D-002).
"""

from fastapi import APIRouter, HTTPException

import bdd
from esquemas import ListaElecciones, TokenEntrada

router = APIRouter(tags=["Lista de elecciones"])


@router.post(
    "/psifos/api/lista-elecciones/ucampus",
    response_model=ListaElecciones,
    responses={401: {"description": "El token de entrada no existe, ya se usó o venció"}},
)
def lista_elecciones(entrada: TokenEntrada) -> ListaElecciones:
    """
    Cambia el token de entrada por una sesión de cabina y devuelve las
    elecciones en cuyo padrón figura la persona.

    El token de entrada es de un solo uso: se invalida al primer intento,
    sea válido o no.
    """
    resultado = bdd.usar_token_entrada(entrada.token)
    if resultado is None:
        raise HTTPException(401, "El token de acceso no es válido.")

    token_sesion, sesion = resultado
    return ListaElecciones(
        sesion=token_sesion,
        css=sesion.css,
        theme=sesion.theme,
        lang=sesion.lang,
        # id_externo es el username del padrón de Psifos.
        elections=bdd.elecciones_de(sesion.id_externo),
    )
