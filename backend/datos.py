"""
Datos de prueba del mock.

Este módulo es la fuente única del contrato: las mismas estructuras que
devuelven los endpoints son las que consume el frontend. Cuando se
implemente sobre el backend real de UParticipa, lo que cambia es de dónde
salen los datos, no su forma.
"""

# ---------------------------------------------------------------------
# PADRÓN
# UParticipa identifica al votante por id_externo. Acá el padrón se
# expresa como id_externo -> elecciones en que está habilitado.
#
# El filtrado por habilitación es del servidor (D-003): el frontend
# nunca decide quién puede votar qué.
# ---------------------------------------------------------------------
PADRON = {
    "PASAPORTE-0001": ["e-01", "e-02", "e-03", "e-04"],
    "PASAPORTE-0002": ["e-02"],
    "PASAPORTE-0003": [],          # autenticado pero sin elecciones
}

# ---------------------------------------------------------------------
# ELECCIONES
# ---------------------------------------------------------------------
ELECCIONES = {
    "e-01": {
        "id": "e-01",
        "nombre": "Votación 1 [Tipo de elección]",
        "tipo": "eleccion",
        "estado": "en_curso",
        "desde": "11/05/2026",
        "hasta": "12/05/2026 a las 20:00 hrs.",
        "claustro": 37577,
        "respuestas": 0,
        "participacion": 0.0,
        "seleccion": "simple",
        "max_selecciones": 1,
        "preguntas": [
            {
                "id": "p1",
                "enunciado": "Seleccionar la opción de su preferencia",
                "opciones": [
                    {"id": "A-1", "codigo": "A-1", "nombre": "Opción A", "lista": "Lista 1"},
                    {"id": "B-1", "codigo": "B-1", "nombre": "Opción B", "lista": "Lista 2"},
                    {"id": "B-2", "codigo": "B-2", "nombre": "Opción C", "lista": "Lista 2"},
                    {"id": "C-1", "codigo": "C-1", "nombre": "Opción D", "lista": None},
                    {"id": "D-1", "codigo": "D-1", "nombre": "Opción E", "lista": None},
                    {"id": "E-1", "codigo": "E-1", "nombre": "Opción F", "lista": None},
                    {"id": "blanco", "codigo": None, "nombre": "Voto en blanco", "lista": None},
                    {"id": "nulo", "codigo": None, "nombre": "Voto nulo", "lista": None},
                ],
            }
        ],
    },
    "e-02": {
        "id": "e-02",
        "nombre": "Votación 2 [Tipo de consulta]",
        "tipo": "consulta",
        "estado": "en_curso",
        "desde": "20/06/2026",
        "hasta": "30/06/2026 a las 18:00 hrs.",
        "claustro": 41025,
        "respuestas": 0,
        "participacion": 0.0,
        "seleccion": "simple",
        "max_selecciones": 1,
        "preguntas": [
            {
                "id": "p1",
                "enunciado": "Seleccionar la opción de su preferencia",
                "opciones": [
                    {"id": "si", "codigo": None, "nombre": "Apruebo", "lista": None},
                    {"id": "no", "codigo": None, "nombre": "Rechazo", "lista": None},
                    {"id": "blanco", "codigo": None, "nombre": "Voto en blanco", "lista": None},
                ],
            }
        ],
    },
    "e-03": {
        "id": "e-03",
        "nombre": "Votación 3 [Tipo de elección]",
        "tipo": "eleccion",
        "estado": "finalizada",
        "desde": "11/05/2026",
        "hasta": "12/05/2026 a las 20:00 hrs.",
        "claustro": 6264,
        "respuestas": 2587,
        "participacion": 41.3,
        "seleccion": "simple",
        "max_selecciones": 1,
        "preguntas": [],
    },
    "e-04": {
        "id": "e-04",
        "nombre": "Votación 4 [Tipo de plebiscito]",
        "tipo": "plebiscito",
        "estado": "finalizada",
        "desde": "29/10/2025",
        "hasta": "31/10/2025 a las 18:00 hrs.",
        "claustro": 6583,
        "respuestas": 1364,
        "participacion": 20.7,
        "seleccion": "simple",
        "max_selecciones": 1,
        "preguntas": [],
    },
}

# ---------------------------------------------------------------------
# VOTOS EMITIDOS
# (id_externo, id_eleccion) -> código de papeleta
#
# El valor guardado es el código de papeleta, NO la opción elegida: el
# servidor no puede saber qué votó nadie. Que exista la entrada solo
# indica que esa persona ya emitió un voto.
# ---------------------------------------------------------------------
VOTOS = {}

# Urna: total de papeletas registradas por elección.
URNA_TOTAL = {"e-01": 0, "e-02": 0, "e-03": 287, "e-04": 1364}