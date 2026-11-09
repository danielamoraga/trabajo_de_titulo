# Contexto: Servicio Externo de UParticipa en UCampus

Documento de contexto para desarrollar, en un repositorio nuevo, el
Servicio Externo que permite entrar a UParticipa desde UCampus. Reúne lo
que se sabe de la plataforma, lo que ya se decidió en el prototipo (mock)
y lo que falta verificar en el ambiente real.

## 1. Qué se está construyendo

- **UCampus** es la plataforma institucional de la Universidad de Chile.
  Permite integrar aplicaciones de terceros como **Servicios Externos**:
  aparecen en su menú lateral y se cargan en un `iframe` dentro de la
  interfaz de UCampus, con la persona ya autenticada.
- **UParticipa** es la plataforma de votaciones de la universidad,
  desarrollada por el CLCERT. Su backend se llama **Psifos** y está
  dividido en `psifos-backend-op` (operativo: login, votación, panel del
  votante) y `psifos-backend-info` (información pública de elecciones).
  Ambos están hechos en FastAPI.
- **Objetivo:** que una persona entre a UParticipa desde UCampus, sin
  volver a autenticarse, y vea y vote en sus elecciones con los estilos
  de UCampus.

## 2. Estado actual en UCampus

- **URL del Servicio Externo** (la "URL acordada" que UCampus llama):
  `https://uparticipa.labs.clcert.cl/ucampus`. Está registrada en UCampus;
  falta levantar el servicio que responda en ella.
- **El módulo ya está creado en UCampus**, con permiso **DEV** solo para
  el equipo de UParticipa, para depurar.
- **Ubicación:** menú lateral izquierdo de UCampus → *Servicios
  Generales* → *UParticipa*.
- El equipo de UCampus pidió que se les avise si falta información o si
  el flujo es otro.

## 3. Flujo de conexión (documentación oficial de UCampus)

Fuente: <https://ucampus.uchile.cl/api/0/externos>.

1. La persona entra a UCampus con sus credenciales.
2. UCampus calcula los servicios a los que tiene acceso según sus grupos.
3. La persona elige el Servicio Externo en el menú lateral.
4. **El servidor de UCampus** hace un GET por HTTPS a la URL acordada con
   un parámetro, por ejemplo `https://uparticipa.labs.clcert.cl/ucampus?ticket=XXX`.
5. **El Servicio Externo** llama a
   `https://ucampus.uchile.cl/b/externos/datos?ticket=XXX` y recibe un
   JSON con los datos de la persona.
6. El Servicio Externo **responde a UCampus en texto plano** con una de
   dos cosas:
   - **Éxito:** una URL, que debería incluir algún identificador de
     sesión. UCampus la carga como `src` del iframe.
   - **Error:** un mensaje de texto, que UCampus le muestra a la persona.
7. El navegador de la persona carga esa URL y desde ahí conversa
   directamente con el Servicio Externo.

Los pasos 4 a 6 son llamadas **entre servidores**: el navegador no las
ve. Por eso una cabecera `Set-Cookie` en la respuesta del paso 6 no le
llega al navegador; la única forma de traspasarle la sesión es a través
de la URL.

### JSON de `/b/externos/datos`

La documentación da los nombres y el significado de los campos, **pero no
sus tipos**, y no hay un JSON real de referencia.

| Campo | Según la documentación |
|---|---|
| `pers_id` | Identificador de la persona, usualmente el RUT |
| `permisos` | Arreglo con los permisos calculados según el grupo |
| `lang` | Idioma: `en` o `es` |
| `theme` | Tema: `focus`, `focus-dark`, `classic`, `classic-dark`, … |
| `css` | URL de los estilos base de UCampus según el tema |
| `time` | Timestamp del mensaje |
| `mod_id` | Identificador del módulo llamado |
| `gru_id` | Datos del grupo o curso, si corresponde |
| `id_externo` | Opcional; corresponde al Pasaporte |
| `session_hash` | Identifica el estado de la persona; cambia si cambian sus grupos o permisos |

### Ejemplo oficial en PHP (resumido)

```php
$json = file_get_contents('https://ucampus.uchile.cl/b/externos/datos?ticket='.$_GET['ticket']);
$datos = json_decode($json, TRUE);
if (time() - $datos['time'] > 60) exit('La información de conexión está caducada.');
session_start();
session_regenerate_id();
header('Set-Cookie: '.session_name().'='.session_id().'; path=/; SameSite=None; secure; HttpOnly');
$_SESSION['datos'] = $datos;
exit('https://URL_A_LA_CUAL_REDIRIGIR_AL_USUARIO?token='.session_id());
```

De aquí salen la tolerancia de 60 s sobre `time`, que la consulta es un
**GET** y que la respuesta es texto plano (`exit(...)`).

### Requisitos técnicos de UCampus

- **HTTPS** obligatorio.
- **CSS:** cada página del servicio debe incluir en el `<head>` la hoja
  que viene en el campo `css`:
  `<link rel="stylesheet" media="all" href="{css}" />`. Redefine títulos,
  listas, tablas y formularios, y agrega clases como `a.boton` (con
  `ok`, `warn`, `wrong`), `table.form`, `table.detalle`, `form.buscar`,
  `ul.modulo` y `ul.submodulo`.
- **Resizer:** cada página debe incluir
  `<script type="text/javascript" src="https://ucampus.uchile.cl/b/externos/resizer.js"></script>`
  para que UCampus ajuste el alto del iframe y no haya doble scroll.
- **Operativos:** definir los grupos y permisos con acceso, y una
  contraparte técnica con correo que reciba alertas si el servicio deja
  de responder.

## 4. Lo que se aprendió inspeccionando la plataforma

Se capturó el HTML de dos Servicios Externos en producción, el
Repositorio Normativo y un formulario de visitas, ambos de ADI:

- **UCampus usa la URL de retorno directamente como `src` del iframe:**
  `<iframe id="externo" src="https://servicios.adi.ing.uchile.cl/p/campus_digital/base_externa?_token=...">`.
- **UCampus copia la ruta y el query del iframe en el hash de su propia
  URL** (`history.replaceState(null, '', '#'+url.pathname+url.search)`,
  con la URL que reporta `resizer.js`). Todo lo que vaya en la URL de
  retorno queda visible en la barra de direcciones de UCampus y al
  alcance de cualquier script de su página, incluido Google Tag Manager.
- **El `css` que reciben los servicios** tiene la forma
  `https://ucampus.uchile.cl/d/css/{theme}.style_externo_v{versión}.css`,
  por ejemplo `focus.style_externo_v34719.css`. Es distinta de la hoja
  que usa la propia página de UCampus (`focus.style_v34719.css`).
- **ADI mantiene la sesión con cookie:** usa `?_token=` solo en la
  primera carga; sus enlaces internos no lo llevan y sí llevan un
  parámetro `csrf`. Es lo que hace el ejemplo en PHP.

## 5. Decisiones del prototipo

El prototipo (un mock en FastAPI) fijó estas decisiones. Entre paréntesis,
la referencia en el registro de decisiones del trabajo de título.

- **El ticket se valida en el backend de UParticipa**, no en un servicio
  intermedio: un intermediario capaz de afirmar identidades sería un
  nuevo ancla de confianza (D-001). UParticipa acepta así dos tipos de
  cliente: OIDC con Cuenta UChile y la sesión de UCampus (D-002).
- **Identidad:** el `id_externo` de UCampus es el mismo valor que
  `Voter.username` en el padrón de Psifos. Confirmado por el
  representante de UParticipa. No se usa `pers_id`.
- **Nombre del parámetro:** se usa `token` en vez de `ticket`, tanto en
  la entrada como en la consulta a `/b/externos/datos`. UCampus lo acepta,
  según el representante de UParticipa (D-030). **Conviene verificarlo en
  el ambiente real** (sección 7).
- **Respuesta de la entrada:** siempre 200, en texto plano: la URL o un
  mensaje de error. Errores contemplados: UCampus no responde, token
  inválido (cualquier respuesta que no sea un 200 con JSON) y token
  caducado (`time` con más de 60 s de antigüedad).
- **Datos guardados:** solo `id_externo`, `css`, `theme` y `lang`. No el
  RUT: lo que no se guarda no se puede filtrar.
- **Sesión en dos tiempos (D-029):**
  1. La URL de retorno lleva un **token de entrada** de un solo uso que
     vence en 60 s, no la sesión, porque esa URL queda expuesta en UCampus.
  2. La primera llamada del frontend, `POST /lista-elecciones/ucampus`
     con `{"token": "..."}` en el cuerpo, invalida el token de entrada y
     responde `{sesion, css, theme, lang, elections}`.
  3. La **sesión de cabina** (15 min) se guarda en memoria y se envía en
     `Authorization: Bearer`. Nunca va en una URL.
  4. **En revisión:** entregar la sesión de cabina como cookie HTTP
     (`HttpOnly`) en vez de como token en memoria.
- **Lista de elecciones:** equivale a `voters_panel` de Psifos
  (`GET /panel-voter`), que usa `crud.get_elections_from_voter`: une
  `Election` con `Voter` por `username`, sin filtrar por estado, y agrega
  `start_date` y `end_date` desde el log de eventos (`voting_started` y
  `voting_stopped`).
- **CORS:** solo el origen del frontend, nunca `*`.

### Rutas del prototipo

| Prototipo | En este servicio |
|---|---|
| `GET /psifos/api/ucampus-entry?token=` | `GET https://uparticipa.labs.clcert.cl/ucampus?token=` (o `?ticket=`) |
| `POST /psifos/api/lista-elecciones/ucampus` | Por definir |

### Riesgo de seguridad, y condición para producción (D-029)

La criptografía de UParticipa protege el **secreto** del voto y la
**integridad** del escrutinio, pero **no la autenticación** del votante:
esa depende de la sesión. Quien obtenga una sesión válida puede votar en
nombre de la persona, y como UParticipa cuenta el último voto, puede
**reemplazar** su voto.

Como UCampus expone la URL del iframe en su propia URL, la credencial
pasa siempre por un lugar expuesto. El token de entrada de un solo uso
reduce el riesgo a una ventana de segundos, pero no lo elimina. **Mientras
UCampus no cambie eso, el módulo no puede pasar a producción para
votaciones vinculantes.**

Complementos: token de UCampus de un solo uso, sesión corta y una CSP
estricta sin scripts de terceros en el frontend.

## 6. Esquemas de Psifos conocidos

Copiados textualmente del código de Psifos.

```python
class ElectionBase(PsifosSchema):
    short_name: str = Field(max_length=100)
    long_name: str = Field(max_length=100)
    description: str | None
    type: ElectionTypeEnum = Field(max_length=100)
    max_weight: int
    randomized_options: bool | None
    voters_login_type: ElectionLoginTypeEnum = Field(max_length=100)
    normalized: bool | None
    grouped_voters: bool | None
    trustee_type: Optional[ElectionTrusteeTypeEnum] = Field(default=None, max_length=100)
    is_public: bool = Field(default=False)

class SimpleElection(ElectionBase):
    id: int
    status: ElectionStatusEnum
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
```

```python
@voter_route.get("/panel-voter", status_code=200, response_model=schemas.PanelResponseBase)
async def voters_panel(
    request: Request,
    username: str = Depends(AuthUser(user_type="voter")),
    session: Session | AsyncSession = Depends(get_session),
):
    results = await crud.get_elections_from_voter(session=session, username=username)
    elections = []
    for election, start_date, end_date in results:
        election.start_date = start_date
        election.end_date = end_date
        elections.append(election)
    return {"elections": elections}
```

Faltan `PanelResponseBase` y los valores de los enums
(`ElectionStatusEnum`, `ElectionTypeEnum`, `ElectionLoginTypeEnum`).

## 7. Qué verificar en el ambiente DEV

El correo a UCampus pedía el ambiente justamente para "conocer los
formatos adecuados y el flujo de operación correcto". Antes de construir
el flujo completo conviene que la primera versión del servicio **registre
lo que UCampus envía y responde**, y usar esos datos para confirmar o
corregir los supuestos:

- [ ] **Qué parámetro envía UCampus** en el paso 4 (`ticket` o `token`),
      con qué método y con qué cabeceras.
- [ ] **Qué parámetro acepta `/b/externos/datos`** (`ticket`, `token` o
      ambos).
- [ ] **El JSON real:** los tipos de cada campo, si `time` está en
      segundos, el formato de `id_externo` y el valor real de `css`.
- [ ] **Si viene `id_externo`.** La documentación lo marca como opcional;
      el módulo debe tener habilitado el Pasaporte.
- [ ] **Qué responde UCampus ante un token inválido** y ante uno ya usado
      (¿es de un solo uso?).
- [ ] **Cómo trata UCampus la respuesta del paso 6:** si la carga en el
      iframe y cómo muestra un mensaje de error.
- [ ] **La exposición en el hash:** confirmar que la URL de retorno
      aparece en la barra de direcciones de UCampus.
- [ ] **Cookies de tercero en el iframe** (`SameSite=None; Secure`) en
      Chrome, Firefox y Safari, si se evalúa la variante con cookie.
- [ ] **CSS y resizer:** que la hoja de `css` cargue y que el iframe se
      redimensione.

**Cuidado con los registros:** el JSON trae el RUT (`pers_id`). Registrar
lo mínimo, solo mientras se depura y solo en el ambiente DEV.

## 8. Plan sugerido para el repositorio nuevo

1. **Sonda:** `GET /ucampus` que registre la request entrante, llame a
   `/b/externos/datos`, registre la respuesta y devuelva en texto plano la
   URL de una página mínima. Esa página incluye el `css` y `resizer.js` y
   muestra en el iframe lo recibido (sin datos sensibles). Sirve para
   completar la sección 7.
2. **Entrada definitiva:** validación de `time`, token de entrada de un
   solo uso y mensajes de error, ajustados a lo observado.
3. **Lista de elecciones** con la sesión de cabina, conectada al padrón
   de Psifos.
4. Después: cabina, envío del voto cifrado y resultados.

Requisitos de despliegue: HTTPS en `uparticipa.labs.clcert.cl`, y
alcanzar `https://ucampus.uchile.cl` desde el servidor.
