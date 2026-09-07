"""
Simulación de UCampus, solo para desarrollo.

Cubre los dos puntos del flujo en que UCampus participa:

  - Paso 4: emite un ticket y llama al Servicio Externo.
  - Pasos 5-6: valida ese ticket y devuelve el JSON del usuario.

En producción esto no existe: lo provee UCampus. Está acá para poder
recorrer el flujo completo sin depender del ambiente de testing.
"""

import secrets
import time

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/ucampus-fake", tags=["UCampus (simulado)"])

# ticket -> datos del usuario. Los tickets son de un solo uso.
_TICKETS = {}

# Perfiles disponibles para probar los distintos caminos.
PERFILES = {
    # Habilitado en cuatro elecciones.
    "completo": {
        "pers_id": "11111111-1",
        "id_externo": "PASAPORTE-0001",
    },
    # Habilitado en una sola.
    "parcial": {
        "pers_id": "22222222-2",
        "id_externo": "PASAPORTE-0002",
    },
    # Autenticado pero sin elecciones: estado vacío del listado.
    "sin_elecciones": {
        "pers_id": "33333333-3",
        "id_externo": "PASAPORTE-0003",
    },
    # SIN id_externo. La doc de UCampus marca ese campo como OPCIONAL,
    # así que este caso es real y no un invento: si el módulo no tiene
    # el Pasaporte habilitado, el JSON llega sin él y UParticipa no
    # puede identificar al votante.
    # Es el "ERROR por JSON inválido" del paso 8.
    "sin_id_externo": {
        "pers_id": "44444444-4",
    },
}


@router.post("/emitir-ticket")
def emitir_ticket(perfil: str = "completo"):
    """Paso 4 (primera mitad): UCampus genera un ticket temporal."""
    if perfil not in PERFILES:
        raise HTTPException(400, f"Perfil desconocido. Opciones: {list(PERFILES)}")

    ticket = secrets.token_urlsafe(24)

    datos = {
        "permisos": ["votar"],
        "lang": "es",
        "theme": "focus",
        "css": "https://ucampus.uchile.cl/d/css/focus.style_v34708.css",
        "time": int(time.time()),
        "mod_id": "uparticipa",
        "gru_id": None,
        # session_hash cambia si cambian los grupos o permisos del
        # usuario. Sirve para detectar que su contexto se alteró a
        # mitad de sesión.
        "session_hash": secrets.token_hex(8),
    }
    datos.update(PERFILES[perfil])

    _TICKETS[ticket] = datos
    return {"ticket": ticket, "perfil": perfil}


@router.get("/validar")
def validar(ticket: str):
    """
    Pasos 5-6: el Servicio Externo consulta con el ticket y UCampus
    devuelve el JSON del usuario.

    El ticket se consume: un segundo intento falla. Es lo que se espera
    de un token temporal, y evita que un ticket filtrado (queda en
    logs y en el Referer) sirva para abrir una sesión ajena.
    """
    datos = _TICKETS.pop(ticket, None)
    if datos is None:
        raise HTTPException(404, "Ticket inválido o ya utilizado")
    return datos