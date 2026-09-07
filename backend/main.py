"""
Mock del backend de UParticipa para el Servicio Externo de UCampus.

Implementa el flujo del diagrama de secuencia. Los pasos que aparecen
como "API UParticipa" son estos endpoints; los de "UCampus UChile" los
simula ucampus_fake.

    4. UCampus  -> GET /externo?ticket=XXX
    5-6. este backend consulta a UCampus y recibe el JSON del usuario
    7. extrae id_externo y le asocia una sesión
    8. responde con la URL de la sesión, o un mensaje de error
    9-10. UCampus redirige al votante a esa URL

Todo lo que sirve está mockeado: no hay criptografía, ni base de datos,
ni padrón real. El objetivo es fijar el CONTRATO para poder desarrollar
el frontend en paralelo y para tener algo concreto que discutir con el
CLCERT sobre qué hay que extender.
"""

import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import PlainTextResponse

import datos
import ucampus_fake

app = FastAPI(
    title="UParticipa — Servicio Externo UCampus (mock)",
    description=__doc__,
    version="0.1.0",
)
app.include_router(ucampus_fake.router)

# En producción salen de configuración, no del código.
URL_VALIDACION_UCAMPUS = "http://127.0.0.1:8001/ucampus-fake/validar"
URL_BASE_FRONTEND = "http://localhost:8000"

# Ventana de validez del ticket. La doc de UCampus entrega un campo
# "time" con el timestamp del mensaje; sin un límite, un ticket
# interceptado sirve indefinidamente.
TOLERANCIA_TICKET_SEG = 60

# Duración de la sesión del votante.
DURACION_SESION_SEG = 30 * 60


# =====================================================================
# SESIONES
# En producción esto va a un almacén con expiración (Redis o la BDD de
# UParticipa), no a un diccionario en memoria.
# =====================================================================
_SESIONES = {}


def crear_sesion(usuario: dict) -> str:
    token = secrets.token_urlsafe(32)
    _SESIONES[token] = {
        "id_externo": usuario["id_externo"],
        "pers_id": usuario.get("pers_id"),
        "theme": usuario.get("theme", "focus"),
        "lang": usuario.get("lang", "es"),
        "css": usuario.get("css"),
        "session_hash": usuario.get("session_hash"),
        "expira": time.time() + DURACION_SESION_SEG,
    }
    return token


def sesion_actual(
    x_sesion: str | None = Header(default=None, alias="X-Sesion"),
    sesion: str | None = Query(default=None),
) -> dict:
    """
    El token se acepta por cabecera o por query string.

    NO se usa cookie. El servicio corre en un iframe de otro dominio, así
    que una cookie de sesión sería third-party: necesita
    SameSite=None; Secure y aun así Safari y Firefox pueden bloquearla,
    lo que tumbaría el flujo completo sin dar un error claro.

    El diagrama de secuencia dice "cookie de sesión". El precedente de
    la plataforma apunta a lo contrario: el Repositorio Normativo, que
    ya es un Servicio Externo en producción, recibe su sesión como
    ?_token=... en la URL de retorno. Se sigue ese precedente.
    Ver D-027 en decisiones.md.
    """
    token = x_sesion or sesion
    if not token:
        raise HTTPException(401, "Falta el token de sesión")

    s = _SESIONES.get(token)
    if s is None:
        raise HTTPException(401, "Sesión inválida")
    if s["expira"] < time.time():
        del _SESIONES[token]
        raise HTTPException(401, "Sesión expirada")

    return s


# =====================================================================
# PASO 4-8 — ENTRADA DESDE UCAMPUS
# =====================================================================
@app.get("/externo", response_class=PlainTextResponse, tags=["Flujo UCampus"])
async def entrada_externo(ticket: str):
    """
    Punto de entrada que UCampus llama con ?ticket=XXX.

    IMPORTANTE: la respuesta es TEXTO PLANO, no JSON. La doc de UCampus
    define dos respuestas posibles:
      - una URL, y UCampus redirige al votante ahí;
      - un mensaje de error, y UCampus se lo muestra.
    Devolver JSON acá rompe la integración aunque el contenido sea
    correcto.
    """
    # Pasos 5-6: validar el ticket contra UCampus.
    try:
        async with httpx.AsyncClient(timeout=10) as cliente:
            r = await cliente.get(URL_VALIDACION_UCAMPUS, params={"ticket": ticket})
    except httpx.RequestError:
        return "No fue posible validar la sesión con UCampus. Intente nuevamente."

    if r.status_code != 200:
        return "El ticket de acceso no es válido o ya fue utilizado."

    usuario = r.json()

    # Frescura del ticket: evita reutilizar uno viejo que haya quedado
    # en logs o en la cabecera Referer.
    emitido = usuario.get("time")
    if emitido is None or abs(time.time() - emitido) > TOLERANCIA_TICKET_SEG:
        return "El ticket de acceso expiró. Vuelva a ingresar al módulo."

    # Paso 7: extraer id_externo.
    #
    # La doc marca id_externo como OPCIONAL. Si el Pasaporte no está
    # habilitado para el módulo, el JSON llega sin él y UParticipa no
    # tiene con qué identificar al votante en su padrón. No hay
    # fallback razonable: usar pers_id (el RUT) implicaría que el padrón
    # de UParticipa esté indexado por RUT, que es otra decisión y otro
    # dato sensible.
    id_externo = usuario.get("id_externo")
    if not id_externo:
        return (
            "Su cuenta no tiene habilitado el identificador necesario para "
            "votar. Contacte a la mesa de ayuda de UParticipa."
        )

    # Paso 7 (segunda mitad): asociar la sesión.
    token = crear_sesion(usuario)

    # Paso 8: devolver la URL a la que UCampus debe redirigir.
    query = urlencode({"sesion": token})
    return f"{URL_BASE_FRONTEND}/mock-completo.html?{query}"


# =====================================================================
# API DEL MÓDULO
# =====================================================================
api = APIRouter(prefix="/api/externo", tags=["API del módulo"])


def _resumen(eleccion: dict, id_externo: str) -> dict:
    """Proyección de una elección para el listado."""
    ya_voto = (id_externo, eleccion["id"]) in datos.VOTOS

    if eleccion["estado"] == "en_curso":
        acciones = ["votar", "urna", "estadisticas"]
    elif eleccion["estado"] == "finalizada":
        acciones = ["resultados", "urna", "estadisticas", "verificacion"]
    else:
        acciones = []

    return {
        "id": eleccion["id"],
        "nombre": eleccion["nombre"],
        "tipo": eleccion["tipo"],
        "estado": eleccion["estado"],
        "desde": eleccion["desde"],
        "hasta": eleccion["hasta"],
        "claustro": eleccion["claustro"],
        "respuestas": eleccion["respuestas"],
        "participacion": eleccion["participacion"],
        # None significa "no informar". El listado no muestra la pill en
        # elecciones abiertas (ver D-022, que sigue abierta).
        "ya_voto": ya_voto if eleccion["estado"] == "finalizada" else None,
        # Las acciones las decide el servidor, no el frontend: así la
        # lógica de habilitación queda en un solo lugar.
        "acciones": acciones,
    }


@api.get("/elecciones")
def listar_elecciones(s: dict = Depends(sesion_actual)):
    """
    Listado ya filtrado por habilitación (RF02, D-003).

    Este es el endpoint que hoy no existe en UParticipa: el filtrado
    ocurre al intentar entrar a una elección concreta, no antes.
    """
    habilitadas = datos.PADRON.get(s["id_externo"], [])

    return {
        "usuario": {
            "id_externo": s["id_externo"],
            "theme": s["theme"],
            "lang": s["lang"],
        },
        "elecciones": [
            _resumen(datos.ELECCIONES[e], s["id_externo"])
            for e in habilitadas
            if e in datos.ELECCIONES
        ],
    }


def _verificar_habilitacion(id_eleccion: str, s: dict) -> dict:
    """
    Toda ruta por elección revalida la habilitación.

    No basta con que el listado haya filtrado: alguien puede llamar al
    endpoint con un id que no le corresponde. El 404 (en vez de 403) es
    deliberado — un 403 confirmaría que la elección existe.
    """
    if id_eleccion not in datos.PADRON.get(s["id_externo"], []):
        raise HTTPException(404, "Elección no encontrada")
    eleccion = datos.ELECCIONES.get(id_eleccion)
    if eleccion is None:
        raise HTTPException(404, "Elección no encontrada")
    return eleccion


@api.get("/eleccion/{id_eleccion}")
def detalle_eleccion(id_eleccion: str, s: dict = Depends(sesion_actual)):
    """Detalle con preguntas y opciones, para armar la papeleta (RF03, RF04)."""
    eleccion = _verificar_habilitacion(id_eleccion, s)

    detalle = _resumen(eleccion, s["id_externo"])
    detalle["seleccion"] = eleccion["seleccion"]
    detalle["max_selecciones"] = eleccion["max_selecciones"]
    # El orden de las opciones es el que entrega el servidor y no se
    # reordena en el cliente (D-019).
    detalle["preguntas"] = eleccion["preguntas"]
    # Para RF11: quien ya votó y vuelve a entrar debe ser advertido.
    detalle["ya_voto"] = (s["id_externo"], id_eleccion) in datos.VOTOS
    return detalle


@api.get("/eleccion/{id_eleccion}/urna")
def urna(
    id_eleccion: str,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(50, ge=1, le=200),
    s: dict = Depends(sesion_actual),
):
    """
    Urna paginada (RF10, RNF11).

    La paginación es del servidor: traer la urna completa para mostrar
    50 filas anula el objetivo, y en una elección de rectoría son
    decenas de miles de papeletas (D-006).
    """
    _verificar_habilitacion(id_eleccion, s)

    total = datos.URNA_TOTAL.get(id_eleccion, 0)
    desde = (pagina - 1) * por_pagina
    hasta = min(desde + por_pagina, total)

    filas = [
        {
            # Código de papeleta completo: es lo que permite comprobar
            # que un voto está en la urna, así que no se trunca (D-020).
            "papeleta": _codigo_falso(id_eleccion, n),
            "voto_url": f"/api/externo/eleccion/{id_eleccion}/voto/{n}",
        }
        for n in range(desde, hasta)
    ]

    return {
        "pagina": pagina,
        "por_pagina": por_pagina,
        "total": total,
        "total_paginas": max(1, -(-total // por_pagina)),
        "desde": desde + 1 if total else 0,
        "hasta": hasta,
        "filas": filas,
    }


def _codigo_falso(id_eleccion: str, n: int) -> str:
    """Código de papeleta reproducible, solo para el mock."""
    abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    x = (hash((id_eleccion, n)) ^ 0x9E3779B9) & 0xFFFFFFFF
    out = []
    for _ in range(43):
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= x >> 17
        x ^= (x << 5) & 0xFFFFFFFF
        x &= 0xFFFFFFFF
        out.append(abc[x % len(abc)])
    return "".join(out)


@api.post("/eleccion/{id_eleccion}/voto")
def emitir_voto(
    id_eleccion: str,
    cuerpo: dict,
    s: dict = Depends(sesion_actual),
):
    """
    Recepción del voto ya encriptado.

    El cuerpo esperado es {"voto_encriptado": "...", "prueba": "..."}.

    Lo que NO recibe este endpoint es la opción elegida. El encriptado
    ocurre en el cliente y el servidor nunca ve el voto en claro
    (D-004); si acá llegara un identificador de opción, el sistema
    perdería la propiedad que lo justifica.

    En el backend real este endpoint verifica la prueba de conocimiento
    cero antes de aceptar la papeleta. Acá solo se comprueba que el
    campo venga.
    """
    eleccion = _verificar_habilitacion(id_eleccion, s)

    if eleccion["estado"] != "en_curso":
        raise HTTPException(409, "La elección no está recibiendo votos")

    if not cuerpo.get("voto_encriptado"):
        raise HTTPException(400, "Falta el voto encriptado")

    # Guardar el voto reemplaza el anterior si existía: UParticipa
    # permite volver a votar y el último voto es el que cuenta
    # (RF11.2).
    reemplaza = (s["id_externo"], id_eleccion) in datos.VOTOS
    n = datos.URNA_TOTAL.get(id_eleccion, 0)
    papeleta = _codigo_falso(id_eleccion, n)
    if not reemplaza:
        datos.URNA_TOTAL[id_eleccion] = n + 1
    datos.VOTOS[(s["id_externo"], id_eleccion)] = papeleta

    return {
        "papeleta": papeleta,
        "reemplaza_voto_anterior": reemplaza,
        "certificado_url": f"/api/externo/eleccion/{id_eleccion}/certificado",
    }


app.include_router(api)