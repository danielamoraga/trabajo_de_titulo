# Backend mock — Servicio Externo UParticipa en UCampus

Implementa el flujo del diagrama de secuencia con respuestas mockeadas.
No hay criptografía, ni base de datos, ni padrón real: el objetivo es
**fijar el contrato** para poder desarrollar el frontend en paralelo y
tener algo concreto que discutir con el CLCERT sobre qué extender.

## Correr

En Arch (y por lo tanto en Omarchy) el Python del sistema está marcado
como *externally managed*, así que `pip install` directo falla incluso
teniendo pip. Cualquiera de estas tres opciones sirve.

**Atajo:** `./run.sh` detecta qué hay disponible y usa la mejor
opción, creando un `.venv` si no encuentra nada.

### uv (recomendado)

```bash
sudo pacman -S uv
uv run uvicorn main:app --port 8001 --reload
```

Resuelve las dependencias desde `pyproject.toml` en un entorno propio y
cacheado. No toca el Python del sistema ni hay que activar nada.

### venv

`venv` ya viene en el paquete `python` de Arch.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

Dentro del venv sí hay pip y sí deja instalar. Para salir, `deactivate`.

### Paquetes del sistema

```bash
sudo pacman -S python-fastapi python-uvicorn python-httpx
uvicorn main:app --port 8001 --reload
```

Evita el venv, pero las versiones son las que empaqueta Arch y quedan
mezcladas con el sistema.

---

Documentación interactiva en <http://127.0.0.1:8001/docs>.

Las pruebas recorren el flujo completo:

```bash
uv run python prueba.py          # con uv
.venv/bin/python prueba.py       # con venv
```

Son 27 verificaciones. Ojo: corren contra un servidor con estado en
memoria, así que hay que **reiniciar el servidor** entre corridas o los
casos de "primer voto" fallan por contaminación.

## Recorrer el flujo a mano

```bash
# Paso 4: UCampus emite un ticket
TICKET=$(curl -s -X POST "http://127.0.0.1:8001/ucampus-fake/emitir-ticket?perfil=completo" | jq -r .ticket)

# Pasos 4-8: entrada del Servicio Externo. Devuelve TEXTO PLANO.
curl -s "http://127.0.0.1:8001/externo?ticket=$TICKET"
# -> http://localhost:8000/mock-completo.html?sesion=XXXX

# Con ese token, la API del módulo
curl -s "http://127.0.0.1:8001/api/externo/elecciones?sesion=XXXX" | jq
```

## Perfiles de prueba

| Perfil | Para qué |
|---|---|
| `completo` | Habilitado en las cuatro elecciones |
| `parcial` | Habilitado en una: verifica el filtrado |
| `sin_elecciones` | Autenticado sin elecciones: estado vacío del listado |
| `sin_id_externo` | JSON sin `id_externo`: el error del paso 8 |

## Endpoints

### Flujo UCampus

- `GET /externo?ticket=XXX` — paso 4. Valida el ticket contra UCampus,
  extrae `id_externo`, crea la sesión y devuelve la URL de retorno.

  **La respuesta es texto plano, no JSON.** La doc de UCampus define dos
  respuestas posibles: una URL (y UCampus redirige) o un mensaje de error
  (y UCampus lo muestra). Devolver JSON rompe la integración aunque el
  contenido sea correcto.

### API del módulo

Todas requieren sesión, por cabecera `X-Sesion` o por `?sesion=`.

- `GET /api/externo/elecciones` — listado ya filtrado por habilitación.
- `GET /api/externo/eleccion/{id}` — detalle con preguntas y opciones.
- `GET /api/externo/eleccion/{id}/urna?pagina=&por_pagina=` — urna paginada.
- `POST /api/externo/eleccion/{id}/voto` — recibe el voto ya encriptado.

## Decisiones que este mock materializa

**El filtrado es del servidor.** `GET /elecciones` devuelve solo las
elecciones habilitadas. Este endpoint no existe hoy en UParticipa: el
filtrado ocurre al intentar entrar a una elección concreta. Es la
extensión principal que hay que pedirle al backend real (D-003).

**Las acciones las decide el servidor.** Cada elección trae un arreglo
`acciones`. El frontend no deriva permisos del estado.

**Toda ruta por elección revalida la habilitación.** No basta con que el
listado haya filtrado: alguien puede llamar el endpoint con un id ajeno.
Responde 404 y no 403 a propósito, porque un 403 confirmaría que la
elección existe.

**El endpoint del voto no recibe la opción elegida.** Solo el voto ya
encriptado. Si acá llegara un identificador de opción, el sistema
perdería la propiedad que lo justifica (D-004).

**El ticket es de un solo uso y tiene ventana de validez.** Se consume al
validarlo, y se rechaza si el campo `time` del JSON está fuera de una
tolerancia de 60 s. Un ticket queda en logs de servidor y en la cabecera
`Referer`; sin esas dos medidas, uno filtrado sirve para abrir una sesión
ajena.

**La sesión va en la URL, no en cookie.** El diagrama dice "cookie de
sesión", pero el servicio corre en un iframe de otro dominio: una cookie
sería *third-party*, necesita `SameSite=None; Secure` y aun así Safari y
Firefox pueden bloquearla, tumbando el flujo sin dar un error claro. El
precedente de la plataforma va en la misma dirección: el Repositorio
Normativo, que ya es un Servicio Externo en producción, recibe su sesión
como `?_token=...` en la URL de retorno (D-027).

**`id_externo` es opcional en el ticket.** La doc de UCampus lo marca así
("corresponde al Pasaporte"). Si el módulo no lo tiene habilitado, el
JSON llega sin él y no hay con qué identificar al votante en el padrón.
No se usa `pers_id` (el RUT) como fallback: eso implicaría que el padrón
de UParticipa esté indexado por RUT, que es otra decisión y otro dato
sensible. Hay que confirmar con el equipo de UCampus que el Pasaporte
quede habilitado para el módulo.

## Lo que este mock NO hace, y en el real es esencial

- **Verificar la prueba de conocimiento cero** antes de aceptar una
  papeleta. Acá solo se comprueba que el campo venga.
- **Persistir.** Todo vive en diccionarios en memoria: se reinicia el
  proceso y se pierde. Las sesiones deberían ir a un almacén con
  expiración.
- **Validar `session_hash`.** Se guarda pero no se usa. Cambia si cambian
  los grupos o permisos del usuario; habría que decidir qué pasa si eso
  ocurre a mitad de una votación.
- **Generar el certificado de votación** (RF09). El endpoint devuelve una
  URL que no existe.
- **Aislar el estado entre pruebas.** `prueba.py` corre contra un
  servidor con estado global; si se ejecuta dos veces sin reiniciar, los
  casos de "primer voto" fallan por contaminación.