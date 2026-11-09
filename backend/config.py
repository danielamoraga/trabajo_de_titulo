"""
Configuración del mock. En producción todo esto sale del entorno.
"""

import os
from urllib.parse import urlsplit

# Paso 5: URL de UCampus que entrega los datos de la persona. En producción
# es https://ucampus.uchile.cl/b/externos/datos; en el mock apunta al
# UCampus simulado, que expone la misma ruta.
URL_DATOS_UCAMPUS = os.getenv(
    "URL_DATOS_UCAMPUS", "http://127.0.0.1:8001/b/externos/datos"
)

# URL del frontend (UParticipa-UCampus) que UCampus carga en el iframe.
URL_FRONTEND = os.getenv("URL_FRONTEND", "http://localhost:5173/")

# Origen del frontend, el único habilitado por CORS. Nunca "*".
_url = urlsplit(URL_FRONTEND)
ORIGEN_FRONTEND = f"{_url.scheme}://{_url.netloc}"

# Antigüedad máxima del campo "time" del JSON de UCampus. Viene del ejemplo
# oficial en PHP de UCampus (externo.php), no del texto de la documentación.
TOLERANCIA_UCAMPUS_SEG = 60

# Validez del token de entrada de la URL de retorno (D-029). Tiene que
# alcanzar para que el iframe cargue el frontend. Valor provisional.
DURACION_TOKEN_ENTRADA_SEG = 60

# PENDIENTE: decidir si la sesión de cabina vence en forma fija o por
# inactividad. Por ahora es fija: vence 15 minutos después de crearse.
DURACION_SESION_SEG = 15 * 60
