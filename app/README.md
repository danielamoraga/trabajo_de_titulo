# Servicio Externo UParticipa — React + Vite + TypeScript

## Correr

```bash
# terminal 1 — backend
cd ../backend && ./run.sh

# terminal 2 — frontend
npm install
npm run dev          # http://localhost:5173
```

Para entrar hay que pasar por el flujo de UCampus, que es lo que entrega
la sesión:

```bash
TICKET=$(curl -s -X POST 'http://127.0.0.1:8001/ucampus-fake/emitir-ticket?perfil=completo' | jq -r .ticket)
curl -s "http://127.0.0.1:8001/externo?ticket=$TICKET"
# -> http://localhost:8000/index.html?sesion=XXXX
```

En desarrollo el puerto es 5173, así que hay que abrir
`http://localhost:5173/?sesion=XXXX` con ese token.

> El backend tiene `http://localhost:8000` en `ORIGENES_PERMITIDOS`.
> Para usar `npm run dev` hay que agregar `http://localhost:5173`, o
> servir el build en 8000 con `python3 servir_dist.py`.

### Parámetros de desarrollo

| Parámetro | Para qué |
|---|---|
| `?sesion=` | Token de sesión. Sin él ninguna pantalla carga datos. |
| `?theme=` | `focus`, `focus-dark`, `classic`, `classic-dark` |
| `?chrome=0` | Muestra **solo** lo que produce el Servicio Externo |
| `?v=34708` | Versión de assets de UCampus |

`?chrome=0` es el importante para entender el alcance: todo lo demás
—header, menú lateral, footer— lo renderiza UCampus por fuera del iframe.

## Estructura

```
index.html                plantilla (sin CSS: se inyecta en runtime)
src/
  main.tsx                monta el chrome y después React
  api/
    esquema.d.ts          GENERADO desde el OpenAPI — no editar
    tipos.ts              alias legibles de esquema.d.ts
    cliente.ts            cliente HTTP tipado
    sesion.ts             token de sesión y construcción de rutas
    votoPendiente.ts      papeleta entre cabina y encriptado (en memoria)
  chrome/montar.ts        header/menú/footer — SOLO desarrollo
  componentes/
    ucampus.tsx           componentes de la plataforma
    Avisos.tsx            #mensajes vía portal
    useAvisos.ts          estado de avisos y mensajes del RF07.1
  pantallas/              Listado, Cabina, Encriptado, Resultados
```

## Tipos generados desde el OpenAPI

```bash
npm run tipos      # con el backend corriendo en :8001
```

Los modelos Pydantic del backend producen el esquema OpenAPI, y de ahí
salen los tipos de TypeScript. **El contrato lo verifica el compilador**:
si el backend cambia un campo y el frontend no se adapta, `npm run build`
falla. Eso importa porque el backend lo va a mantener el CLCERT.

## Sin CSS propio ni framework CSS

El proyecto tiene **cero CSS**. Todos los componentes salen de la hoja
institucional de UCampus, que se inyecta en runtime con la URL del tema
del usuario (en producción, con el valor del campo `css` del ticket).

No se usa Tailwind ni Bulma a propósito:

- El *preflight* de Tailwind resetea `h1`, `h2`, `table`, `ul` y `form`,
  que son exactamente los elementos que la hoja de UCampus redefine.
  Cargar las dos es una pelea de especificidad y se pierden `div.objeto`,
  `table.detalle`, `ul.modulo`.
- Bulma es peor para este caso: es CSS global y opinado sobre `.button`,
  `.table`, `.title`, `.navbar`, y colisiona de frente.
- **El RNF02 es el argumento de fondo:** los colores de cualquier
  framework son fijos, y el módulo tiene que adaptarse a los cuatro
  temas. Eso solo funciona si los colores vienen de la hoja
  institucional.

Los únicos `style` en línea son los anchos de `div.porcentaje`, que en el
DOM real de UCampus también van inline porque son datos, no estilo.

## Tres restricciones del iframe que condicionan el código

**`resizer.js` va como `<script src>` en el HTML, nunca bundleado.** Usa
`u_width` sin declararla (global implícito); dentro de un módulo ES, que
es `"use strict"`, lanza `ReferenceError` y se rompe el ajuste de altura
(D-026).

**Nada de portales a `document.body`.** El resizer mide hasta un iframe
centinela que inyecta al final del `body`, así que lo que se monte ahí
queda fuera de la medición. `Avisos.tsx` usa `createPortal` hacia
`#mensajes`, que está **antes** del centinela y sí se mide.

**El `<link>` del CSS se inyecta en runtime**, porque su URL depende del
tema y viene en el ticket. En producción el servidor puede inyectarlo
directo en el HTML al validar el ticket, y ahorra un round-trip.

## Probar

```bash
npm run build
python3 servir_dist.py 8000          # con fallback a index.html

# en otra terminal, con una sesión en /tmp/sesion.txt
node render.cjs                      # 39 verificaciones sobre el DOM
```

Dos parches del entorno de prueba, que no afectan al navegador:

- **jsdom no ejecuta `<script type="module">`**, así que la prueba carga
  un bundle IIFE generado con esbuild. `servir_dist.py` lo sirve cuando
  la URL trae `?iife=1`, conservando la ruta para que React Router la
  resuelva.
- **jsdom no implementa `fetch`**, así que se inyecta el de Node en
  `beforeParse`.

Lo que jsdom **no** puede verificar es el estilo. Que los componentes
sean los correctos está probado; que se *vean* bien en los cuatro temas
requiere un navegador real.

## Detalles de implementación que conviene conocer

**La papeleta no toca disco ni URL.** Entre la cabina y el encriptado
viaja por una variable de módulo (`votoPendiente.ts`). Un parámetro de
query queda en el historial, en los logs y en el `Referer` (D-005); y
`sessionStorage` lo persiste. Con navegación SPA el módulo no se recarga,
así que una variable alcanza. Si la persona recarga, se pierde — y eso es
correcto: no debe quedar rastro de una selección que nunca se emitió.

**El encriptado tiene guard contra doble envío.** React 18 en modo
estricto monta dos veces en desarrollo; sin el `useRef` el voto se
enviaría dos veces, que en una elección es un problema real.

**Los componentes de pestañas devuelven `null` con la lista vacía**, en
vez de renderizar un `<ul>` vacío. Un `ul.modulo` sin hijos igual ocupa
espacio y muestra su borde inferior, porque `[hidden]` pierde contra el
`display` que le asigna la hoja institucional (D-010).

## Pendientes

- `encriptar()` en `pantallas/Encriptado.tsx` es un marcador de
  posición. Debe reemplazarse por la librería criptográfica de
  UParticipa, corriendo en un **Web Worker**: en el hilo principal el
  navegador se congela y el indicador de carga se detiene justo cuando
  más se necesita (D-004).
- Estadísticas y verificación están declaradas como subpestañas pero sin
  contenido.
- El gráfico de participación requiere una decisión: UCampus usa Google
  Charts desde `gstatic.com` más su propio `templatelib.chart()`, y
  ninguno está disponible en el iframe.
- El logo del módulo. Ver D-012: el asset disponible es un PNG blanco
  horizontal, inservible como icono cuadrado de 32 px en temas claros.
- En producción, el HTML lo debe generar el servidor al validar el
  ticket, para inyectar el `<link>` del CSS y el token de sesión sin
  pasar por la URL del navegador.