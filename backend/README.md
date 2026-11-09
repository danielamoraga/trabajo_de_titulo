# Backend mock — UParticipa como Servicio Externo de UCampus

Se construye paso a paso, siguiendo el flujo. Cada paso se confirma antes
de implementarse; lo no confirmado queda marcado como SUPUESTO o
PENDIENTE en el código.

## Levantar el servidor

Requiere [uv](https://docs.astral.sh/uv/) (`sudo pacman -S uv`), que
instala las dependencias en un `.venv` propio sin tocar el Python del
sistema.

```bash
cd backend
uv run uvicorn main:app --port 8001 --reload
```

Con `--reload` el servidor se reinicia solo al editar el código. Se
detiene con `Ctrl+C`.

## Documentación interactiva

FastAPI genera automáticamente una especificación **OpenAPI** a partir de
las rutas y los esquemas Pydantic, y la muestra en dos vistas:

| URL | Qué es |
|---|---|
| <http://127.0.0.1:8001/docs> | **Swagger UI**: interactiva, cada ruta tiene un botón *Try it out* |
| <http://127.0.0.1:8001/redoc> | **ReDoc**: la misma información como documento de lectura |
| <http://127.0.0.1:8001/openapi.json> | La especificación en bruto |

La raíz (<http://127.0.0.1:8001/>) responde 404: no hay ninguna ruta ahí.

Los textos salen del código: el título de `FastAPI(title=...)` en
`main.py`, los grupos del `tags=[...]` de cada router, la descripción de
cada ruta de su docstring y la de cada campo de `Field(description=...)`
en `esquemas.py`.

Esta especificación es la que sirve como documento para el CLCERT y para
generar los tipos del frontend.

## Pruebas automáticas

```bash
cd backend
uv run pytest -v
```

No necesitan el servidor levantado: la llamada de la API a UCampus se
redirige al UCampus simulado dentro del mismo proceso.

## Componentes

Orden sugerido de lectura, siguiendo el flujo:

| Archivo | Rol en el diagrama |
|---|---|
| `config.py` | URLs y constantes |
| `esquemas.py` | Esquemas de datos (UCampus, sesión, UParticipa) |
| `ucampus_fake.py` | UCampus UChile (simulado, solo desarrollo) |
| `entrada.py` | API UParticipa: entrada desde UCampus |
| `lista.py` | API UParticipa: lista de elecciones |
| `sesion.py` | API UParticipa: validación de la sesión de cabina |
| `bdd.py` | BDD UParticipa (en memoria): tokens, sesiones, elecciones y padrón |
| `main.py` | Une las piezas |
| `tests/` | Un caso del flujo por prueba |

## Flujo

```
UCampus ──> GET  /psifos/api/ucampus-entry?token=AAA          (token de UCampus)
API     ──> GET  /b/externos/datos?token=AAA  ──> JSON de la persona
API     ──> texto plano: <frontend>/?token=BBB                (token de entrada, expuesto)
frontend ─> POST /psifos/api/lista-elecciones/ucampus {"token": "BBB"}
        <── {sesion, css, theme, lang, elections}             (BBB queda invalidado)
frontend ─> Authorization: Bearer <sesion>                    (cabina, voto...)
```

Dos tokens distintos (D-029):

- **Token de entrada:** va en la URL de retorno, que UCampus expone en el
  hash de su propia URL. Es de un solo uso y vence a los 60 s.
- **Sesión de cabina:** se crea al usar el token de entrada, dura 15 min
  y nunca va en una URL.

## Paso 1 — Entrada desde UCampus

### Probar desde el navegador

En <http://127.0.0.1:8001/docs>:

1. `POST /ucampus-fake/emitir-token` → *Try it out* → *Execute*. Copiar
   el `token` de la respuesta.
2. `GET /psifos/api/ucampus-entry` → pegar el token → *Execute*. La
   respuesta es la URL del frontend con el token de entrada en `?token=`.
3. Opcional: `GET /b/externos/datos` con el token del punto 1 muestra el
   JSON que "UCampus" le entrega a la API.

### Probar desde la terminal

Con el servidor corriendo, en otra terminal:

```bash
# Caso normal -> http://localhost:5173/?token=...
TOKEN=$(curl -s -X POST localhost:8001/ucampus-fake/emitir-token | jq -r .token)
curl -s "localhost:8001/psifos/api/ucampus-entry?token=$TOKEN"; echo

# JSON que "UCampus" devuelve para ese token
curl -s "localhost:8001/b/externos/datos?token=$TOKEN" | jq

# Token inválido
curl -s "localhost:8001/psifos/api/ucampus-entry?token=inventado"; echo

# Token caducado (emitido hace 120 s)
TOKEN=$(curl -s -X POST "localhost:8001/ucampus-fake/emitir-token?antiguedad=120" | jq -r .token)
curl -s "localhost:8001/psifos/api/ucampus-entry?token=$TOKEN"; echo
```

Para el caso "UCampus no responde", levantar el servidor apuntando a una
dirección inexistente y llamar a la entrada con cualquier token:

```bash
URL_DATOS_UCAMPUS=http://127.0.0.1:9999/nada uv run uvicorn main:app --port 8001
```

### Qué hace

- `GET /psifos/api/ucampus-entry?token=` es la "URL acordada" con
  UCampus. Propuesta de endpoint nuevo para Psifos.
- Obtiene los datos con un GET a `/b/externos/datos?token=` (misma ruta
  que UCampus real; la documentación llama `ticket` al parámetro).
- Responde siempre 200 en texto plano: la URL del frontend con el token
  de entrada, o un mensaje de error (UCampus no responde, token inválido,
  token caducado por más de 60 s).
- Se guarda solo `id_externo`, `css`, `theme` y `lang`. No el RUT.

## Paso 2 — Lista de elecciones y sesión de cabina

### Probar desde el navegador

En <http://127.0.0.1:8001/docs>, después del paso 1:

1. Copiar el token de entrada de la URL de retorno (lo que va después de
   `token=`).
2. `POST /psifos/api/lista-elecciones/ucampus` → *Try it out* → cuerpo
   `{"token": "..."}` → *Execute*. La respuesta trae la `sesion`, el
   `css`, el `theme`, el `lang` y las `elections`.
3. *Execute* de nuevo con el mismo token: responde 401, porque es de un
   solo uso.
4. Opcional: obtener un token de entrada nuevo, esperar más de 60 s y
   usarlo: responde 401, porque venció.
5. Para ver otro padrón, en el paso 1 emitir el token con `id_externo`
   `votante02` (una elección) o `votante03` (ninguna).

### Probar desde la terminal

```bash
TOKEN=$(curl -s -X POST localhost:8001/ucampus-fake/emitir-token | jq -r .token)
URL=$(curl -s "localhost:8001/psifos/api/ucampus-entry?token=$TOKEN")
ENTRADA=${URL#*token=}

# Lista -> {"sesion": ..., "css": ..., "theme": ..., "lang": ..., "elections": [...]}
curl -s -X POST localhost:8001/psifos/api/lista-elecciones/ucampus \
  -H 'Content-Type: application/json' -d "{\"token\": \"$ENTRADA\"}" | jq

# Segundo intento con el mismo token -> 401
curl -s -X POST localhost:8001/psifos/api/lista-elecciones/ucampus \
  -H 'Content-Type: application/json' -d "{\"token\": \"$ENTRADA\"}" | jq
```

Todavía no hay rutas que requieran la sesión de cabina; la primera será
la cabina. Su validación está probada en `tests/test_lista.py`.

### Qué hace

- `POST /psifos/api/lista-elecciones/ucampus` con `{"token": "..."}` en
  el cuerpo (nunca en el query, para que no quede en una URL ni en los
  logs).
- El token de entrada es de un solo uso (se borra al primer intento) y
  vence a los 60 s. Si no sirve: 401 "El token de acceso no es válido."
- Devuelve las elecciones en cuyo padrón figura la persona, en cualquier
  estado, como `get_elections_from_voter` de Psifos (`Voter.username ==
  id_externo`). Cada elección tiene los campos de `SimpleElection`.
- Crea la sesión de cabina (15 min). Se acepta **solo** en la cabecera
  `Authorization: Bearer`. Falte, no exista o haya vencido: 401 "La
  sesión no es válida."
- CORS: solo el origen de `URL_FRONTEND`, sin credenciales.

### Datos de prueba

| id_externo | Padrón |
|---|---|
| `votante01` | `votacion-1` (abierta), `votacion-2` (no iniciada), `votacion-3` (terminada) |
| `votante02` | `votacion-1` |
| `votante03` | ninguno |

## Pendientes

- Cómo se entrega la sesión de cabina: token en memoria (hoy) o cookie
  HTTP.
- `PanelResponseBase` de Psifos: confirmar que cada elección tiene la
  forma de `SimpleElection`.
- Valores reales de los enums de Psifos (`status`, `type`,
  `voters_login_type`, `trustee_type`); hoy son ejemplos.
- Fechas programadas de apertura y cierre: Psifos solo tiene las reales
  (del log), así que una elección abierta no tiene `end_date`.
- Volver a pedir la lista con la sesión de cabina (hoy solo se puede con
  el token de entrada, una vez). Recargar la página obliga a reingresar
  desde UCampus.
- Token de UCampus de un solo uso (requisito de seguridad, por
  implementar).
- Sesión de cabina fija o por inactividad (hoy: 15 min fijos).
- Qué responde UCampus real ante un token inválido.
- Tipos reales del JSON de UCampus (no hay un JSON real de referencia).
- Duración del token de entrada (hoy: 60 s, provisional).
- Que UCampus deje de exponer la URL del iframe en su propia URL:
  condición para producción (D-029).
