"""
Esquemas del contrato entre el módulo y el backend de UParticipa.

Declararlos como modelos y no como dict pelado sirve para tres cosas:

  1. El /openapi.json queda con esquemas reales, así que se pueden
     generar los tipos de TypeScript del frontend a partir de él. El
     contrato deja de ser un comentario y pasa a verificarlo el
     compilador.
  2. FastAPI valida la respuesta antes de enviarla. Si un endpoint
     olvida un campo, falla acá y no en el navegador.
  3. Es el documento que se le entrega al CLCERT como especificación de
     lo que hay que extender en el backend real.
"""

from typing import Literal

from pydantic import BaseModel, Field

EstadoEleccion = Literal["en_curso", "finalizada", "en_pausa"]
TipoEleccion = Literal["eleccion", "consulta", "plebiscito"]
TipoSeleccion = Literal["simple", "multiple"]

# Acciones disponibles sobre una elección. Las decide el SERVIDOR: el
# frontend no deriva permisos del estado, así que la lógica de
# habilitación queda en un solo lugar.
Accion = Literal["votar", "urna", "estadisticas", "resultados", "verificacion"]


class Usuario(BaseModel):
    """Datos del votante que el módulo necesita para renderizar."""

    id_externo: str = Field(description="Identificador del votante en UParticipa")
    theme: str = Field(description="Tema activo en UCampus")
    lang: str


class ResumenEleccion(BaseModel):
    """Proyección de una elección para el listado."""

    id: str
    nombre: str
    tipo: TipoEleccion
    estado: EstadoEleccion
    desde: str
    hasta: str
    claustro: int = Field(description="Personas habilitadas para votar")
    respuestas: int
    participacion: float = Field(description="Porcentaje, 0 a 100")

    ya_voto: bool | None = Field(
        default=None,
        description=(
            "None significa 'no informar'. El listado no expone la "
            "participación en elecciones abiertas."
        ),
    )
    acciones: list[Accion]


class Listado(BaseModel):
    usuario: Usuario
    elecciones: list[ResumenEleccion]


class Opcion(BaseModel):
    id: str
    codigo: str | None = Field(
        default=None,
        description="Código de la candidatura. Nulo en blanco y nulo.",
    )
    nombre: str
    lista: str | None = Field(
        default=None, description="Lista a la que pertenece, si corresponde"
    )


class Pregunta(BaseModel):
    id: str
    enunciado: str
    opciones: list[Opcion] = Field(
        description=(
            "En el orden en que deben mostrarse. UParticipa ofrece ver los "
            "resultados 'como se mostraron al votar', así que este orden es "
            "parte del proceso electoral y el cliente no lo reordena."
        )
    )


class DetalleEleccion(ResumenEleccion):
    seleccion: TipoSeleccion
    max_selecciones: int
    preguntas: list[Pregunta]
    # En el detalle sí se informa siempre: el RF11 pide advertir a quien
    # ya votó y vuelve a entrar a la papeleta.
    ya_voto: bool


class FilaUrna(BaseModel):
    papeleta: str = Field(
        description=(
            "Código de papeleta COMPLETO. Es lo que permite comprobar que un "
            "voto está en la urna, así que no se trunca."
        )
    )
    voto_url: str


class PaginaUrna(BaseModel):
    """
    Página de la urna. La paginación es del servidor: traer la urna
    completa para mostrar 50 filas anula el objetivo del RNF11, y en una
    elección de rectoría son decenas de miles de papeletas.
    """

    pagina: int
    por_pagina: int
    total: int
    total_paginas: int
    desde: int
    hasta: int
    filas: list[FilaUrna]


class VotoEntrante(BaseModel):
    """
    Voto ya encriptado.

    No incluye la opción elegida a propósito. El encriptado ocurre en el
    cliente y el servidor nunca ve el voto en claro; si acá viajara un
    identificador de opción, el sistema perdería la propiedad que lo
    justifica.
    """

    voto_encriptado: str
    prueba: str | None = Field(
        default=None,
        description=(
            "Prueba de conocimiento cero. En el backend real se verifica "
            "antes de aceptar la papeleta."
        ),
    )


class VotoEmitido(BaseModel):
    papeleta: str
    reemplaza_voto_anterior: bool = Field(
        description="UParticipa permite volver a votar; el último voto cuenta."
    )
    certificado_url: str
