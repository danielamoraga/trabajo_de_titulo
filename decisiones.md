# Bitácora de decisiones

Registro de decisiones de diseño e implementación del Servicio Externo de
UParticipa en UCampus. Cada entrada anota el contexto, las alternativas
consideradas, lo decidido y las consecuencias.

El objetivo es que las alternativas descartadas queden escritas: la
decisión final se puede reconstruir leyendo el código, pero lo que se
evaluó y se dejó de lado no.

**Convención de estado:** `firme` (decidido y verificado), `provisorio`
(decidido con información incompleta), `abierto` (pendiente de resolver).

---

## Arquitectura

### D-001 — Validación del ticket en el backend de UParticipa
**Estado:** firme

*Contexto.* El flujo de Servicios Externos de UCampus exige una
validación server-to-server: UCampus llama a una URL acordada con
`?ticket=XXX`, y el servicio debe consultar de vuelta a UCampus para
obtener los datos del usuario. Esto no se puede resolver desde un
frontend estático.

*Alternativas.*
1. Un BFF intermedio que valide el ticket y luego le afirme a UParticipa
   la identidad del votante.
2. Extender el backend de UParticipa para que acepte el ticket de
   UCampus como fuente de identidad, en paralelo a OIDC.

*Decisión.* La 2.

*Razón.* Un BFF con capacidad de afirmar identidades introduce un nuevo
ancla de confianza en un sistema cuyo propósito es no depender de la buena
fe de un administrador. Si ese servicio puede declarar "este es el
votante X", el padrón queda a su merced y se pierde la propiedad que
justifica usar UParticipa en vez de UCampus.

*Consecuencias.* Mayor acoplamiento con el repositorio de UParticipa;
los despliegues hay que coordinarlos con el CLCERT.

*Pendiente.* Verificar que el identificador coincida. UCampus entrega
`pers_id` (habitualmente el RUT) y UParticipa identifica al votante con
el claim que le entrega Cuenta Uchile vía OIDC. Si no son el mismo
identificador, hay un problema de mapeo de identidad que conviene
descubrir temprano.

### D-002 — Dos tipos de cliente en el backend de UParticipa
**Estado:** firme

*Contexto.* El cliente web actual de UParticipa requiere la redirección a
Cuenta Uchile por OpenID Connect. El Servicio Externo llega con la
autenticación ya resuelta por el sistema de tickets.

*Decisión.* El backend distingue dos tipos de cliente y omite el flujo
OIDC para el que viene de UCampus.

*Razón.* Ambos contextos usan la misma cuenta institucional, así que la
identidad es equiparable. Redirigir a Cuenta Uchile a alguien que ya está
autenticado en UCampus rompe la integración *seamless*, que es el
objetivo del trabajo.

### D-003 — Filtrado anticipado de elecciones
**Estado:** firme

*Contexto.* Hoy UParticipa trata cada elección como un proceso
independiente: el filtrado de habilitación ocurre al intentar entrar a
una elección concreta.

*Decisión.* El backend expone las elecciones ya filtradas por
habilitación, antes de renderizar la interfaz.

*Razón.* El listado (RF02) necesita mostrar solo las elecciones en que la
persona puede participar. Consultar elección por elección para armar el
listado no escala y expondría la existencia de elecciones ajenas.

*Consecuencia.* El frontend no decide habilitación: solo muestra lo que
el backend le entrega. La lógica de padrón queda en un solo lugar.

### D-004 — Encriptado en el cliente, con Web Worker
**Estado:** firme

*Contexto.* El encriptado del voto ocurre en el navegador — el servidor
nunca ve el voto en claro. El RNF09 pide feedback visual para que el
sistema no se perciba bloqueado.

*Decisión.* Reutilizar la librería criptográfica de UParticipa (no
reimplementarla) y ejecutarla en un Web Worker.

*Razón.* Si la operación corre en el hilo principal, el navegador se
congela de verdad y el indicador de carga se detiene justo cuando más se
necesita. El RNF09 no se resuelve con CSS: es una restricción de
arquitectura disfrazada de requerimiento de usabilidad.

*Consecuencia.* La integración de la librería debe poder correr fuera del
hilo principal, lo que condiciona cómo se empaqueta.

### D-005 — El voto no viaja por la URL
**Estado:** firme

*Contexto.* En el mock, la opción seleccionada pasa de la cabina al
encriptado como parámetro de query.

*Decisión.* En la implementación real el voto queda en memoria y se
encripta antes de salir del cliente.

*Razón.* Un parámetro de URL queda en el historial del navegador, en los
logs del servidor y en la cabecera `Referer`. Sería una filtración del
secreto del voto por una comodidad de implementación.

### D-006 — Paginación del lado del servidor
**Estado:** firme

*Contexto.* El RNF11 pide que la urna pagine para mantener las requests
livianas. El mock pagina en el cliente.

*Decisión.* El endpoint recibe `pagina` / `por_pagina` y devuelve solo el
tramo más el total.

*Razón.* Traer la urna completa para mostrar 50 registros anula el
objetivo. En una elección de rectoría son decenas de miles de papeletas.

---

## Integración visual

### D-007 — CSS institucional por sobre CSS propio
**Estado:** firme

*Contexto.* Los mockups iniciales replicaron la apariencia de UCampus con
CSS propio y una paleta de colores hardcodeada.

*Alternativas.*
1. Mantener CSS propio que imite la plataforma.
2. Cargar la hoja institucional y escribir CSS propio solo para lo que no
   exista.

*Decisión.* La 2, con una regla de trabajo: toda regla propia necesita un
comentario que indique qué componente institucional se intentó primero y
por qué no alcanzó. Si no se puede escribir ese comentario, la regla no
va.

*Razón.* El RNF02 exige adaptación a los cuatro temas del usuario. Una
paleta hardcodeada se rompe en los temas oscuros y obliga a mantener en
paralelo decisiones visuales que son de UCampus.

*Resultado.* El módulo terminó con **cero CSS propio**. Cada componente
que parecía faltar existía en la hoja base y solo había que encontrarlo.

### D-008 — Los componentes se derivan del DOM real, no de la documentación
**Estado:** firme

*Contexto.* La documentación de Servicios Externos enumera seis clases
(`a.boton`, `table.form`, `table.detalle`, `form.buscar`, `ul.modulo`,
`ul.submodulo`). La plataforma usa bastante más.

*Decisión.* Los componentes se obtienen inspeccionando el DOM de módulos
existentes y la hoja de estilos, no de la documentación pública.

*Componentes encontrados fuera de la doc.* `div.objeto` (encabezado con
título y subtítulo), `div.pill` con `ok`/`warn`/`wrong`/`info`,
`div.porcentaje` con `div.inner` y barra, `.espera` (indicador de carga),
`#mensajes` con ids de severidad, `.responsive-data` / `.only-movil` /
`.no-movil` (patrón responsive), convención `sel` para el elemento
activo.

*Consecuencias.* Dependencia de convenciones no documentadas, que pueden
cambiar entre versiones. Mitigación: registrar de qué módulo y de qué
versión (`v34708`) se extrajo cada componente.

### D-009 — Severidad de los avisos por ID, no por clase
**Estado:** firme

*Contexto.* Se necesitaba un aviso verde para la confirmación de voto
emitido. Un `#maviso` capturado no traía clase de severidad, y por un
tiempo se asumió que la plataforma solo ofrecía el aviso beige, lo que
obligaba a CSS propio.

*Hallazgo.* La severidad va en el **id** del div. `kernel.mensaje()` lee
el primer carácter del texto y elige el contenedor:

| Prefijo | ID | Color |
|---|---|---|
| `-` | `#merror` | rojo |
| `+` | `#mexito` | verde |
| `*` | `#minfo` | azul |
| (ninguno) | `#maviso` | beige |

`#mexito` usa exactamente la misma paleta que `div.pill.ok`
(`#dff0d8` / `#d6e9c6` / `#3c763d`).

*Decisión.* Usar los ids nativos y eliminar el CSS propio que se había
escrito para el verde.

*Nota.* Que sea un id y no una clase implica un solo bloque por tipo:
varios mensajes del mismo tipo se acumulan como `<li>` del mismo `<ul>`.

### D-010 — No ocultar con el atributo `hidden`
**Estado:** firme

*Contexto.* Las pestañas principales de la pantalla de resultados se
mostraban condicionalmente con `<ul class="modulo" hidden>`. Aparecía una
línea gris suelta sobre las subpestañas.

*Causa.* `hidden` equivale a `display:none` con la especificidad más
baja, así que cualquier `display` que la hoja institucional le asigne a
`ul.modulo` lo pisa. La lista vacía ocupaba espacio y mostraba su borde
inferior.

*Decisión.* Los elementos condicionales no se ocultan: no se renderizan.
Se usa un contenedor neutro (`<div>` sin clases) que el JS rellena.

*Alcance.* Aplica a cualquier componente institucional mostrado
condicionalmente: `table.detalle`, `ul.submodulo`, etc.

### D-011 — Adaptación a temas por transparencia y opacidad
**Estado:** firme

*Contexto.* Durante un tiempo hizo falta CSS propio para un fondo verde y
un texto gris.

*Decisión.* Para fondos y bordes, color semitransparente (se mezcla con
el fondo del tema); para texto atenuado, `opacity` sobre el color
heredado. Nunca un hex fijo.

*Razón.* Un color claro sólido se rompe en `focus-dark` y
`classic-dark`. Excepción: el color de un **texto** necesita contraste
fijo, porque un texto translúcido sobre fondo oscuro queda ilegible.

*Nota.* Ambas reglas terminaron eliminadas al encontrar los componentes
nativos (D-009 y `.espera`), pero el patrón sigue siendo el correcto si
aparece un caso genuino.

### D-012 — Provisión del icono del módulo
**Estado:** abierto

*Contexto.* El icono del menú lateral es un asset servido por UCampus
(`/d/images/servicios/`), fuera del control del servicio externo.

*Decisión.* Entregar el SVG de UParticipa al equipo de UCampus como parte
del registro del módulo, junto con grupos, permisos y contraparte
técnica.

*Problema.* El logo disponible en el sitio de UParticipa es un PNG
(`uparticipa-logo-uchile-white.png`), un wordmark horizontal blanco de
140 px pensado para una navbar oscura. El icono de UCampus es cuadrado de
~32 px y debe funcionar en los cuatro temas: un logo blanco desaparece en
`classic`. Se necesita una variante distinta, no una conversión.

*Pendiente.* Pedir el SVG original al CLCERT o definir una marca reducida
que funcione a 32 px sobre fondo claro y oscuro.

---

## Alcance y flujo

### D-013 — Alcance: solo el flujo del votante
**Estado:** provisorio

*Decisión.* El módulo cubre el flujo del votante: ver elecciones
habilitadas, votar, consultar urna, estadísticas, resultados y
verificación. **No** cubre la creación ni la administración de
elecciones, que siguen en UParticipa.

*Razón.* La brecha identificada es de acceso y adopción por parte de los
votantes, no de administración. Quien crea una elección es un perfil
acotado que ya usa UParticipa.

*Pendiente.* Confirmarlo por escrito: en producción es la primera
pregunta que va a aparecer.

### D-014 — "Eventos" queda fuera del alcance
**Estado:** firme

*Contexto.* La urna de UParticipa ofrece cinco vistas: Resultados, Urna
electrónica, Estadísticas, Eventos y Verificación.

*Decisión.* El módulo incorpora cuatro. "Eventos" se excluye
deliberadamente.

*Nota.* "Resultados" también queda fuera de las subpestañas cuando ya es
pestaña principal, pero por una razón distinta: se duplicaría. Conviene
no confundir "no aplica" con "decidimos no incluirlo".

### D-015 — Jerarquía de pestañas en dos niveles
**Estado:** firme

*Contexto.* El mockup inicial ponía Votar, Urna electrónica y Resultados
como pestañas principales al mismo nivel.

*Decisión.* Primer nivel: **Votar** y **Resultados**. Dentro de
Resultados: Resultados, Urna electrónica, Estadísticas, Verificación.

*Razón.* El primer nivel distingue entre emitir el voto y consultar el
proceso. La urna, las estadísticas y la verificación son todas formas de
consultar, así que cuelgan del segundo nivel. El orden interno pone el
resultado primero y detrás la evidencia que permite comprobarlo, que es
la propuesta de valor de UParticipa.

*Nota.* "Resultados" queda navegable con la elección abierta, porque el
RF10.1 pide estadísticas en vivo: hay algo que consultar antes del
cierre.

### D-016 — Pestañas principales según si la papeleta sigue disponible
**Estado:** firme

*Contexto.* Se llega a la pantalla de resultados desde dos situaciones
distintas: desde la cabina con la votación abierta y sin voto emitido, o
después de votar (o con la elección cerrada).

*Decisión.* Las pestañas principales se muestran solo en el primer caso.
En el segundo, "Votar" sería un camino sin destino.

*Implementación.* En el mock se resuelve con un parámetro (`&votando=1`)
en un solo archivo, en vez de dos HTML, porque la diferencia es una fila
de pestañas y duplicar el archivo obligaría a mantener las cuatro
subpestañas en dos lugares. En la implementación real la condición se
deriva del estado de la elección y de `ya_voto`, que el backend ya
entrega.

### D-017 — Sin pestañas durante el encriptado
**Estado:** firme

*Decisión.* La pantalla de encriptado no muestra pestañas.

*Razón.* Es un paso intermedio de un flujo en curso. Salir a otra vista a
mitad de camino deja a la persona sin saber si su voto se emitió. Las
pestañas vuelven en la confirmación. (Confirmado después por la
referencia visual.)

### D-018 — Papeleta sin preselección
**Estado:** firme

*Contexto.* El mockup traía la primera opción marcada por defecto.

*Decisión.* La papeleta arranca sin ninguna opción marcada y valida antes
de continuar.

*Razón.* Dos motivos. Una opción premarcada sesga el voto de quien no lee
con atención. Y hace imposible distinguir "no respondió" de "eligió la
primera opción", lo que importa cuando el resultado se audita.

### D-019 — Orden de las opciones definido por el backend
**Estado:** firme

*Decisión.* El frontend muestra las opciones en el orden en que las
entrega el backend y no las reordena.

*Razón.* UParticipa ofrece ver los resultados "como se mostraron al
votar", así que ese orden es parte del proceso electoral y no una
preferencia de presentación.

### D-020 — Código de papeleta completo
**Estado:** firme

*Contexto.* El mockup mostraba el Código de Papeleta truncado con "...".

*Decisión.* Se muestra completo (43 caracteres), como en la urna de
UParticipa.

*Razón.* Ese código es lo que le permite a una persona comprobar que su
voto está en la urna. Truncarlo sin dar acceso al valor completo rompería
la verificabilidad por una decisión de layout — y la verificabilidad es
el argumento central de UParticipa frente a UCampus.

### D-021 — Semáforo de participación
**Estado:** abierto

*Contexto.* El listado de UCampus colorea la barra de participación con
`wrong` / `warn` / `ok` según umbrales (aproximadamente 50 % y 78 %,
inferidos de dos módulos).

*Tensión.* Pintar de rojo una elección con 20 % de participación es un
juicio editorial sobre el proceso, no un dato.

*Hallazgo que ayuda.* La plataforma ya distingue los dos casos: los
resultados por opción usan `div.porcentaje div.info` (azul neutro), no el
semáforo. O sea que `wrong`/`warn`/`ok` es para participación agregada e
`info` para resultados por opción.

*Estado actual.* Se replica el semáforo en el listado para no divergir de
la plataforma. Queda por decidir si corresponde en un contexto electoral.

### D-022 — Pill de "ya voté" en elecciones abiertas
**Estado:** abierto

*Contexto.* El mockup del listado no muestra la pill
"Respondida"/"Sin responder" en las elecciones abiertas, solo en las
finalizadas. Se respetó con `ya_voto: null`.

*Tensión.* El RF11 pide avisar a quien ya votó y vuelve a entrar a la
papeleta. Si el listado no lo indica, ese aviso llega recién al abrir la
cabina.

*A resolver.* Si la omisión es deliberada (no señalizar participación
mientras la urna está abierta, lo que tiene sentido desde el secreto del
voto) o conviene mostrar la pill también en curso.

### D-023 — Advertencia de no cerrar la página durante el encriptado
**Estado:** abierto

*Contexto.* Si la persona cierra la pestaña durante el encriptado, el
voto no llegó a la urna y no queda registro parcial.

*Estado actual.* No se incluye, por fidelidad a la referencia visual.

*A resolver.* Probarlo en la sesión de validación con usuarios: es
información que se necesita en ese momento exacto, pero también puede
generar ansiedad innecesaria.

---

## Restricciones técnicas verificadas

### D-024 — El chrome de UCampus no se hereda
**Estado:** firme

*Contexto.* El servicio corre en un iframe de otro dominio.

*Hallazgo.* Ni `kernel.js` ni jQuery están disponibles. Todo lo que en
UCampus resuelve `kernel` hay que reimplementarlo: el toggler del menú,
`menuToggle`, el descarte de `#maviso`, `kernel.mensaje`.

*Consecuencia para el mock completo.* El mock que replica el chrome
(header, menú, footer) reimplementa ese comportamiento en vanilla. Es un
artefacto de presentación, no el desplegable: el servicio real solo
produce el contenido de `#body`.

### D-025 — Fuentes e imágenes se resuelven solas
**Estado:** provisorio

*Hallazgo.* La hoja base trae FontAwesome 6 completo con sus
`@font-face`, y `.espera` usa `../images/loading.gif`. Ambas son rutas
relativas a la hoja, que se sirve desde `ucampus.uchile.cl/d/css/`, así
que resuelven correctamente desde el iframe.

*Riesgo.* Las fuentes son el único recurso que el navegador pide siempre
en modo CORS, evaluado contra el origen del documento. Si UCampus no
responde con `Access-Control-Allow-Origin` en `/d/font/`, los iconos no
aparecen — sin error visible, solo iconos ausentes.

*Verificación.* Si los iconos se ven sirviendo desde `localhost` con la
hoja remota, CORS está resuelto. Si no, es una petición al equipo de
UCampus.

### D-026 — El resizer hace polling
**Estado:** firme

*Hallazgo.* `resizer.js` se re-ejecuta cada segundo indefinidamente
(`setTimeout`, 500 ms mientras el ancho es 0, 1000 ms después) y notifica
al padre solo cuando la altura cambió. No usa `postMessage`: mide la
posición de un iframe centinela inyectado al final del `<body>` y navega
ese iframe a `/b/externos/_resizer?height=...&width=...`.

*Consecuencias.*
1. **No hay que notificar nada.** Paginar la urna, cambiar de subpestaña
   o pasar de "encriptando" a "éxito" se ajustan solos en ≤1 s. El precio
   es hasta un segundo con scroll interno o un hueco en blanco.
2. **Nunca hacer `document.body.appendChild`.** La altura se calcula
   hasta el iframe centinela, que está al final del `body`: cualquier
   cosa insertada después queda fuera de la medición.
3. **No empaquetar `resizer.js` en un bundle.** Usa `u_width` sin
   declararla (global implícito). Si el build la mete en un módulo ES o
   en un contexto `"use strict"`, lanza `ReferenceError` y se rompe el
   ajuste de altura. Debe quedar como `<script src>` externo.
4. Los anchors internos (`<a href="#id">`) ya están soportados: el script
   intercepta el clic y le manda el scroll al padre.

### D-027 — Cookies de sesión en iframe de tercero
**Estado:** abierto

*Contexto.* El servicio corre en un dominio distinto al de UCampus, así
que una cookie de sesión es *third-party*.

*Riesgo.* Necesita `SameSite=None; Secure`, y aun así Safari y Firefox
pueden bloquearla. Esto puede tumbar el flujo completo.

*Alternativa.* Session id en el path de la URL de retorno (que es lo que
hace el Repositorio Normativo con `?_token=`) y token en memoria.

*Prioridad.* Es lo primero que hay que probar en el ambiente de testing.

### D-028 — `table.detalle` solo para tablas informativas
**Estado:** firme

*Contexto.* El listado usa `<table id="votaciones">` sin clase; la urna
usa `<table class="detalle">`. Se dudó si era una inconsistencia.

*Resolución.* No lo es. La documentación define `table.detalle` como
"tabla informativa con datos para el usuario", que describe la urna y no
un listado navegable. Ambas se ven correctamente.

*Nota.* `table.detalle` declara `border-radius:.5em`, pero la hoja base
también declara `table{border-collapse:collapse}` globalmente, y
`border-radius` no aplica a tablas con bordes colapsados. Es una regla
muerta en la propia hoja de UCampus: las tablas del módulo real tampoco
se ven redondeadas.


### D-029 — Un módulo por pantalla, chrome y componentes compartidos
**Estado:** firme

*Contexto.* Los cinco mocks iniciales eran HTML monolíticos con el
chrome de UCampus (header, menú de ~70 ítems, footer) duplicado en cada
uno, más una copia del `MOCK` de datos y de los helpers de render.

*Alternativas.*
1. Seguir con archivos independientes y sincronizarlos a mano.
2. Extraer lo compartido a módulos ES: cliente de API, componentes y
   chrome.

*Decisión.* La 2. Los HTML quedaron como cáscaras de ~10 líneas que
cargan un módulo.

*Razón.* Con cinco pantallas la duplicación ya obligaba a editar el
mismo menú cinco veces, y varias correcciones (las clases `active`, el
patrón responsive, el aviso `#maviso`) tuvieron que aplicarse archivo por
archivo, con el riesgo de que quedaran desincronizados. Bajó de 2.735 a
1.447 líneas.

*Consecuencia.* El chrome quedó en un único archivo dev-only
(`chrome.js`), lo que además hace explícito el límite del alcance: con
`?chrome=0` se ve exactamente lo que produce el Servicio Externo y nada
más.

### D-030 — La sesión viaja por la URL, propagada por `enlace()`
**Estado:** firme

*Contexto.* El token de sesión llega en la URL en el paso 10 del flujo,
pero al navegar entre pantallas se perdería.

*Alternativas.* Guardarlo en `localStorage`, en una cookie, o
propagarlo por la URL en cada enlace interno.

*Decisión.* Propagarlo por la URL, con un helper `enlace()` que lo
agrega siempre.

*Razón.* El RNF06 prohíbe almacenar datos sensibles en el cliente, y una
cookie sería *third-party* dentro del iframe (D-027).

*Consecuencia.* Todo enlace interno tiene que pasar por `enlace()`. Si
alguien escribe un `href` a mano, la sesión se corta. Es un costo real
de mantenimiento a cambio de no depender de almacenamiento del
navegador.

### D-031 — CORS restringido por origen, nunca `*`
**Estado:** firme

*Contexto.* El frontend se sirve en `:8000` y el backend en `:8001`, así
que para el navegador son orígenes distintos.

*Decisión.* Lista explícita de orígenes permitidos, y solo las cabeceras
que se usan (`X-Sesion`, `Content-Type`).

*Razón.* Con `allow_credentials` el navegador rechaza `*`; y aunque la
sesión viaje por cabecera, abrir el origen permitiría que un sitio
arbitrario consulte la API con la sesión de quien esté logueado. En
producción el origen es el dominio del Servicio Externo y va en
configuración.

### D-032 — Verificación del frontend con jsdom
**Estado:** provisorio

*Contexto.* Hacía falta comprobar que las pantallas renderizan
correctamente contra el backend, no solo que el JS parsea.

*Decisión.* Prueba con jsdom que carga las cuatro pantallas y verifica
el DOM resultante (33 verificaciones).

*Dos limitaciones del entorno que hubo que rodear.* jsdom no soporta
`<script type="module">`, así que los módulos se bundlean con esbuild
antes de cargarlos; y jsdom no implementa `fetch`, así que se inyecta el
de Node en `beforeParse`. Ninguna de las dos afecta al navegador real.

*Pendiente.* Un navegador real (Playwright) verificaría además el
estilo, el comportamiento del resizer y los cuatro temas, que es
justamente lo que jsdom no puede ver.


### D-033 — Stack: React + Vite + TypeScript
**Estado:** firme

*Contexto.* Los mocks estaban en JS con módulos ES y `innerHTML`. El
flujo tiene bastante estado (sesión, elección, papeleta, encriptando,
error, reintento) y va a crecer con la revisión del voto y las pantallas
de error.

*Decisión.* React + Vite + TypeScript, con React Router para la
navegación.

*Razón.* Dos ganancias concretas más allá de la comodidad. La navegación
SPA permite que la papeleta viaje **en memoria** entre la cabina y el
encriptado, sin pasar por la URL ni por `sessionStorage` (D-034). Y
TypeScript convierte el contrato en algo que verifica el compilador
(D-035).

*Consecuencia.* En producción las rutas del módulo (`/cabina`,
`/resultados`) no son archivos, así que el servidor del Servicio Externo
necesita fallback a `index.html`.

### D-034 — La papeleta viaja en memoria del módulo
**Estado:** firme

*Contexto.* Entre la cabina y el encriptado hay que pasar la selección.
En la versión anterior, con páginas separadas, se usó `sessionStorage`.

*Alternativas.* Parámetro de query, `sessionStorage`, o una variable de
módulo aprovechando que la navegación es SPA.

*Decisión.* Variable de módulo (`api/votoPendiente.ts`).

*Razón.* Un parámetro de query queda en el historial del navegador, en
los logs del servidor y en la cabecera `Referer`, o sea que filtraría el
voto (D-005). `sessionStorage` lo persiste en disco. Con navegación SPA
el módulo no se recarga entre las dos pantallas, así que una variable
alcanza.

*Consecuencia deseable.* Si la persona recarga, la selección se pierde y
la pantalla informa que no hay voto pendiente. Es correcto: no debe
quedar rastro de una selección que nunca se emitió.

### D-035 — Modelos Pydantic en el backend, tipos generados en el frontend
**Estado:** firme

*Contexto.* Los endpoints devolvían `dict` pelado, así que el
`/openapi.json` tenía los esquemas de respuesta vacíos y no servía para
generar tipos.

*Decisión.* Declarar el contrato como modelos Pydantic
(`backend/modelos.py`) y generar los tipos de TypeScript desde el
OpenAPI con `openapi-typescript` (`npm run tipos`).

*Razón.* Tres cosas a la vez: FastAPI valida la respuesta antes de
enviarla, el frontend obtiene tipos que el compilador verifica, y el
`/docs` se convierte en la especificación que se le entrega al CLCERT.
Importa porque el backend real lo va a mantener otro equipo: si cambian
un campo, `npm run build` falla en vez de romperse en silencio en el
navegador.

*Efecto lateral encontrado.* Con el modelo, un cuerpo sin
`voto_encriptado` pasó a devolver 422 (validación de Pydantic) en vez de
llegar al chequeo manual de 400. Se aprovechó para separar dos errores
que conviene no confundir: **422** es un cuerpo mal formado (error del
cliente al construir la petición) y **400** es una papeleta bien formada
que el servidor rechaza — que en el backend real es donde falla la
verificación de la prueba de conocimiento cero, el caso del RF07.1
"voto no validado criptográficamente".

### D-036 — Sin framework CSS
**Estado:** firme

*Contexto.* La intención inicial era usar Tailwind o Bulma. Bulma en
particular es lo que usa el frontend actual de UParticipa.

*Decisión.* Ningún framework CSS. El proyecto tiene cero CSS propio.

*Razón.* Tres problemas, en orden de gravedad:
1. **El RNF02.** Los colores de cualquier framework son fijos, y el
   módulo debe adaptarse a los cuatro temas de UCampus. Eso solo funciona
   si los colores vienen de la hoja institucional. Ya se verificó que
   todos los componentes necesarios están ahí.
2. **El preflight de Tailwind** resetea `h1`, `h2`, `table`, `ul` y
   `form`, que son exactamente los elementos que la hoja de UCampus
   redefine. Cargar las dos es una pelea de especificidad.
3. **Bulma es CSS global y opinado** sobre `.button`, `.table`,
   `.title`, `.navbar`: colisiona de frente.

*Nota.* Que UParticipa use Bulma no es argumento para este módulo: el
objetivo es verse como UCampus, no como UParticipa. Es el punto de la
integración *seamless*.

*Si más adelante hacen falta utilidades:* Tailwind con
`preflight: false`, solo para layout donde UCampus no ofrece nada
(spacing, flex, grid), nunca para colores, tipografía ni componentes.

---

## Correcciones registradas

Casos en que una decisión se tomó con información incompleta y se
corrigió al inspeccionar la plataforma. Se dejan anotados porque
muestran el método: inferir de la documentación resultó menos fiable que
inspeccionar el DOM y la hoja de estilos.

| # | Se asumió | Realidad | Fuente que lo corrigió |
|---|---|---|---|
| 1 | `.pill.ok`/`.pill.wrong` podían colisionar con el sistema de UCampus | Son componentes nativos; el mockup había acertado | DOM de `fcfm_votaciones` |
| 2 | Los avisos usaban clases de severidad `ok`/`warn`/`wrong` | La severidad va en el id (`#mexito`, `#merror`, `#minfo`) | `kernel.mensaje()` en `jquery.javascript` |
| 3 | `class="active"` era el estado por defecto de los contenedores del menú | Es el estado del menú alternado; se generalizó desde la única captura que lo traía | Dos capturas posteriores |
| 4 | Las pestañas Urna y Resultados debían ir deshabilitadas con la elección abierta | El RF10.1 pide estadísticas en vivo: sí hay algo que consultar | Los propios requerimientos |
| 5 | El aviso no debía poder descartarse durante el encriptado | El aviso no es el indicador de progreso, el spinner lo es; descartarlo no aborta nada | Estructura real de `#maviso` |
| 6 | `ul.paginar` era el paginador de UCampus | Venía de dentro del iframe del Repositorio Normativo, o sea del servicio externo de ADI | Origen del DOM capturado |
| 7 | El encabezado eran `h1`/`h2` sueltos | Van envueltos en `div.objeto`, que es lo que da negrita y gris | DOM de `uchile_votaciones/resultado` |
| 8 | Truncar el código de papeleta era aceptable | UParticipa lo muestra completo; truncarlo rompía la verificabilidad | Urna real de UParticipa |

---

## Pendientes de captura o verificación

- DOM real de una cabina de votación de UCampus (`ul.modulo` y la
  papeleta siguen apoyados en la documentación, no en inspección).
- Cómo marca UCampus una votación **abierta** en el listado: todas las
  capturas disponibles están finalizadas.
- Si UCampus tiene un componente de paginación propio.
- CORS de `/d/font/` para las fuentes (D-025).
- Cookies de tercero en el iframe (D-027).
- Coincidencia de identificadores entre `pers_id` y el claim de OIDC
  (D-001). Parcialmente resuelto: UParticipa usa `id_externo`, que
  UCampus entrega en el ticket — pero la doc lo marca como **opcional**,
  así que hay que confirmar con el equipo de UCampus que el Pasaporte
  quede habilitado para el módulo.
- Verificación en un navegador real: estilos, resizer y los cuatro temas
  (D-032).