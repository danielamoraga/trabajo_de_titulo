"""
Esquemas de datos.

Los de UCampus siguen su documentación. Los de UParticipa siguen el código
de Psifos (psifos-backend-op / psifos-backend-info) y se agregan a medida
que se confirma cada paso.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# =====================================================================
# UCampus
# =====================================================================


class DatosUCampus(BaseModel):
    """
    JSON que devuelve UCampus en /b/externos/datos.

    La documentación de UCampus da los nombres de los campos y su
    significado, pero NO los tipos, y no hay un JSON real de referencia.
    Los tipos marcados como SUPUESTO están por confirmar.
    """

    # SUPUESTO: string. "Usualmente es el rut": puede llegar como entero,
    # o con o sin dígito verificador.
    pers_id: str = Field(description="Identificador de la persona, usualmente el RUT")
    # SUPUESTO: lista de strings; se desconocen los valores posibles.
    permisos: list[str] = Field(description="Permisos calculados según el grupo")
    lang: str = Field(description="Lenguaje del usuario: en o es")
    theme: str = Field(description="Tema del usuario: focus, focus-dark, classic, classic-dark, ...")
    css: str = Field(description="URL de los estilos base de UCampus según el tema")
    # SUPUESTO: segundos Unix. El ejemplo en PHP lo compara con time().
    time: int = Field(description="Timestamp en que fue enviado el mensaje")
    # SUPUESTO: string.
    mod_id: str = Field(description="Identificador del módulo que se está llamando")
    # SUPUESTO: tipo desconocido. "Datos del grupo/curso si corresponde"
    # sugiere un objeto más que un identificador.
    gru_id: Any | None = Field(default=None, description="Datos del grupo/curso, si corresponde")
    # La doc lo marca como opcional ("corresponde al Pasaporte"). Por
    # decisión de alcance se asume siempre presente. Es el mismo valor que
    # Voter.username en el padrón de Psifos. SUPUESTO: formato.
    id_externo: str = Field(description="Pasaporte del usuario; es el username del padrón de Psifos")
    session_hash: str = Field(
        description="Identifica el estado del usuario; cambia si cambian sus grupos o permisos"
    )


# =====================================================================
# Sesión
# =====================================================================


class Sesion(BaseModel):
    """
    Lo que la API guarda en la BDD, tanto para un token de entrada
    pendiente como para una sesión de cabina (paso 7, D-029).

    Solo lo necesario: no se guarda pers_id (RUT) ni el resto del JSON de
    UCampus. Lo que no se guarda no se puede filtrar.
    """

    id_externo: str
    css: str
    theme: str
    lang: str
    expira: float = Field(description="Timestamp Unix en que vence")


class TokenEntrada(BaseModel):
    """
    Cuerpo de la lista de elecciones. El token va en el cuerpo de un POST y
    no en el query, para que no vuelva a quedar en una URL ni en los logs.
    """

    token: str = Field(description="Token de entrada de un solo uso, recibido en la URL de retorno")


# =====================================================================
# UParticipa (Psifos)
# =====================================================================


class Eleccion(BaseModel):
    """
    Una elección, con los campos de SimpleElection de Psifos (ElectionBase
    más id, status, start_date y end_date).

    PENDIENTE: confirmar con PanelResponseBase, que es lo que devuelve
    /panel-voter. SimpleElection es el candidato más probable porque es el
    único schema con start_date y end_date, que son los que agrega
    voters_panel.

    SUPUESTO: los enums (type, status, voters_login_type, trustee_type) van
    como str libre porque se desconocen sus valores.
    """

    id: int
    short_name: str = Field(max_length=100, description="Identificador legible (slug)")
    long_name: str = Field(max_length=100, description="Nombre a mostrar")
    description: str | None
    type: str = Field(description="ElectionTypeEnum (valores desconocidos)")
    max_weight: int
    randomized_options: bool | None
    voters_login_type: str = Field(description="ElectionLoginTypeEnum (valores desconocidos)")
    normalized: bool | None
    grouped_voters: bool | None
    trustee_type: str | None = Field(default=None, description="ElectionTrusteeTypeEnum (valores desconocidos)")
    is_public: bool = False
    status: str = Field(description="ElectionStatusEnum (valores desconocidos)")
    start_date: datetime | None = Field(
        default=None,
        description="Primer evento voting_started del log. None si la votación no ha empezado",
    )
    end_date: datetime | None = Field(
        default=None,
        description="Último evento voting_stopped del log. None si la votación sigue abierta",
    )


class ListaElecciones(BaseModel):
    """Respuesta de la lista: la sesión de cabina, la presentación y las elecciones."""

    # PENDIENTE: decidir si la sesión de cabina se entrega así (token en el
    # cuerpo, enviado luego en Authorization: Bearer) o como cookie HTTP.
    sesion: str = Field(
        description="Token de la sesión de cabina. Se guarda solo en memoria y se envía en Authorization: Bearer"
    )
    css: str = Field(description="URL de la hoja de estilos de UCampus para servicios externos")
    theme: str
    lang: str
    elections: list[Eleccion] = Field(
        description="Elecciones en cuyo padrón figura la persona, en cualquier estado"
    )
