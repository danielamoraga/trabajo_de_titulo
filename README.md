# Integración de UParticipa en UCampus

Servicio Externo de UCampus que permite participar en procesos
electorales de [UParticipa](https://participa.uchile.cl/) desde la
interfaz institucional, sin salir de UCampus.

Trabajo de Título — Ingeniería Civil en Computación, FCFM, Universidad
de Chile.

## El problema

UCampus y U-Cursos tienen módulos de votación integrados a la plataforma
institucional, pero sin garantías criptográficas: el secreto del voto y
la integridad del escrutinio dependen de la confianza en el
administrador del sistema, sin verificación independiente.

UParticipa, desarrollado por el CLCERT, sí ofrece esas garantías —
secreto del voto, integridad del resultado y verificabilidad pública —
pero opera como plataforma separada, y eso limitó su adopción en las
elecciones del estamento estudiantil.

Este módulo cierra la brecha: la interfaz y la navegación son de
UCampus, el motor electoral es UParticipa.

## Estado

Prototipo funcional con backend mockeado. El flujo se recorre de punta a
punta: listado de elecciones habilitadas → papeleta → encriptado →
confirmación → urna electrónica.

Lo que **no** está implementado todavía:

- La criptografía. `encriptar()` es un marcador de posición; hay que
  integrar la librería de UParticipa en un Web Worker.
- La persistencia. El backend guarda todo en memoria.
- Estadísticas, verificación y el certificado de votación.

## Estructura

```
decisiones.md      bitácora de decisiones de diseño e implementación
app/               frontend — React + Vite + TypeScript
backend/           mock del backend de UParticipa — FastAPI
frontend/          versión vanilla previa (referencia histórica)
```

`decisiones.md` es el documento central del proyecto. Registra cada
decisión con sus alternativas descartadas, y una sección de correcciones
donde queda anotado cada caso en que una suposición fue desmentida al
inspeccionar la plataforma.

## Levantar el proyecto

Hacen falta dos servidores.

### 1. Backend

```bash
cd backend
./run.sh                    # detecta uv, .venv o paquetes del sistema
```

Queda en `http://127.0.0.1:8001`, con la documentación interactiva en
`/docs`.

En Arch (y por lo tanto en Omarchy) el Python del sistema está marcado
como *externally managed*, así que `pip install` directo falla. `run.sh`
lo resuelve; el README del backend explica las tres alternativas.

### 2. Frontend

```bash
cd app
npm install
npm run dev                 # http://localhost:5173
```

Antes de abrirlo, agregar `"http://localhost:5173"` a
`ORIGENES_PERMITIDOS` en `backend/main.py`. El backend solo permite el
puerto 8000 por defecto, y sin ese cambio el navegador bloquea las
peticiones por CORS — el síntoma es la pantalla vacía con un aviso rojo.

### 3. Obtener una sesión

Ninguna pantalla carga datos sin sesión, y la sesión solo se obtiene
pasando por el flujo de UCampus. Eso es deliberado: es el mecanismo que
se está implementando.

```bash
TICKET=$(curl -s -X POST 'http://127.0.0.1:8001/ucampus-fake/emitir-ticket?perfil=completo' | jq -r .ticket)
curl -s "http://127.0.0.1:8001/externo?ticket=$TICKET"
```

La segunda llamada imprime una URL con `?sesion=...`. Con ese token:

```
http://localhost:5173/?sesion=<token>
```

El ticket es de un solo uso y vence a los 60 segundos; si te demoras,
generá otro. La sesión dura 30 minutos.

### Parámetros de desarrollo

| Parámetro | Para qué |
|---|---|
| `?sesion=` | Token de sesión |
| `?theme=` | `focus`, `focus-dark`, `classic`, `classic-dark` |
| `?chrome=0` | Muestra **solo** lo que produce el Servicio Externo |

`?chrome=0` es el más útil para entender el alcance del módulo: todo lo
demás —header, menú lateral, footer— lo renderiza UCampus por fuera del
iframe.

## Probar

```bash
cd backend && python3 prueba.py     # 28 verificaciones del flujo y la API

cd app
npm run build
python3 servir_dist.py 8000
node render.cjs                     # 39 verificaciones sobre el DOM
```

`render.cjs` necesita un token en `/tmp/sesion.txt`.

## Cómo funciona la integración

UCampus provee un mecanismo llamado **Servicios Externos**: una
aplicación de terceros que se carga en un iframe dentro de la interfaz
institucional, con la sesión del usuario ya resuelta.

```
1-3.  El votante entra a UCampus y elige UParticipa en el menú
4.    UCampus llama al backend de UParticipa con ?ticket=XXX
5-6.  El backend valida ese ticket contra UCampus y recibe el JSON
      con los datos del usuario
7.    Extrae id_externo y le asocia una sesión
8.    Responde —en texto plano— la URL a la que redirigir
9-10. UCampus redirige al votante, que carga el módulo con los
      estilos de UCampus
```

Tres detalles que condicionan todo lo demás:

**El paso 8 responde texto plano, no JSON.** La documentación de UCampus
define dos respuestas posibles: una URL, o un mensaje de error que
UCampus le muestra a la persona. Devolver JSON rompe la integración
aunque el contenido sea correcto.

**La validación del ticket ocurre en el backend de UParticipa**, no en
un servicio intermedio. Un BFF con capacidad de afirmar identidades
introduciría un nuevo ancla de confianza en un sistema cuyo propósito es
justamente no depender de la buena fe de un administrador (D-001).

**El encriptado del voto ocurre en el cliente.** El servidor nunca ve el
voto en claro. Eso tiene una consecuencia de arquitectura poco obvia:
tiene que correr en un Web Worker, porque en el hilo principal el
navegador se congela y el indicador de carga se detiene justo cuando más
se necesita (D-004).

## Integración visual

El módulo tiene **cero CSS propio**. Todos los componentes salen de la
hoja de estilos institucional, que se carga con la URL que viene en el
ticket y depende del tema activo del usuario.

Eso no fue una restricción autoimpuesta sino un hallazgo: los
componentes que parecían faltar —`div.objeto`, `div.pill`,
`div.porcentaje`, `.espera`, los avisos de `#mensajes`— ya existen en la
hoja base. La documentación pública de Servicios Externos solo enumera
seis clases, así que los componentes se derivaron inspeccionando el DOM
de módulos reales y la propia hoja de estilos (D-008).

Tampoco se usa framework CSS. El RNF02 exige adaptación a los cuatro
temas de UCampus, y los colores de cualquier framework son fijos; además
el *preflight* de Tailwind resetea exactamente los elementos que UCampus
redefine (D-036).

## Pendientes de coordinación

Cosas que no se resuelven escribiendo código:

- **Habilitar `id_externo`** (el Pasaporte) para el módulo. La
  documentación de UCampus lo marca como campo *opcional*, y UParticipa
  identifica al votante justamente por ahí. Sin él no hay forma de
  ubicar a la persona en el padrón (D-001).
- **Entregar el SVG del logo** al equipo de UCampus como parte del
  registro del módulo. El icono del menú lo sirve UCampus, no el
  servicio externo. El asset disponible es un PNG blanco horizontal,
  inservible como icono cuadrado de 32 px en temas claros (D-012).
- **Definir grupos, permisos y contraparte técnica**, que son los
  requisitos operativos del registro.
- **Verificar CORS en `/d/font/`**. Las fuentes son el único recurso que
  el navegador pide siempre en modo CORS, evaluado contra el origen del
  documento. Si UCampus no lo permite, los iconos no aparecen — sin
  error visible (D-025).
- **Probar cookies de tercero en el ambiente de testing.** Es el riesgo
  con más capacidad de tumbar el flujo completo (D-027).

## Créditos

UParticipa es un proyecto de la Prorrectoría de la Universidad de Chile,
desarrollado por el Laboratorio de Criptografía Aplicada y
Ciberseguridad (CLCERT).

UCampus es desarrollado por el Centro Tecnológico Ucampus de la FCFM.