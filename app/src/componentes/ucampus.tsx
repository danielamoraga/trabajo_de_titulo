/**
 * Componentes de UCampus como componentes de React.
 *
 * Ninguno define estilos: todo sale de la hoja institucional (D-007).
 * El proyecto tiene CERO CSS propio y ningún framework CSS.
 *
 * Las estructuras se derivaron inspeccionando el DOM de módulos reales y
 * la hoja focus.style_v34708.css, no de la documentación pública, que
 * solo enumera seis clases (D-008).
 */

import type { ReactNode } from "react";
import type { EstadoEleccion, ResumenEleccion } from "../api/tipos";

export function numero(n: number): string {
  return n.toLocaleString("es-CL");
}

/* ------------------------------------------------------------------ */
/* Encabezado                                                          */
/* ------------------------------------------------------------------ */

const ETIQUETA_ESTADO: Record<EstadoEleccion, string> = {
  en_curso: "Abierta",
  finalizada: "Finalizada",
  en_pausa: "En pausa",
};

/**
 * Pill de estado.
 *
 * "Abierta" usa el modificador ok (verde, #dff0d8). "Finalizada" va SIN
 * modificador, que la hoja base renderiza como texto gris plano —
 * confirmado contra el DOM real: <div class="pill ">Finalizada</div>.
 */
export function PillEstado({ estado }: { estado: EstadoEleccion }) {
  const clase = estado === "en_curso" ? "pill ok" : "pill ";
  return <div className={clase}>{ETIQUETA_ESTADO[estado]}</div>;
}

/**
 * Pill de participación del votante.
 * null significa "no informar": el listado no la muestra en elecciones
 * abiertas (D-022, sigue abierta).
 */
export function PillVoto({ yaVoto }: { yaVoto: boolean | null | undefined }) {
  if (yaVoto === null || yaVoto === undefined) return null;
  return yaVoto ? (
    <div className="pill ok">
      <i className="fa-solid fa-check" /> Respondida
    </div>
  ) : (
    <div className="pill wrong">
      <i className="fa-solid fa-x" /> Sin Responder
    </div>
  );
}

/**
 * div.objeto > h1 (nombre + pill) + h2 (fechas).
 *
 * El wrapper .objeto es lo que da el título en negrita y las fechas en
 * gris pequeño. Sin él, h1/h2 caen al estilo genérico de página.
 */
export function Objeto({ eleccion }: { eleccion: ResumenEleccion }) {
  return (
    <div className="objeto">
      <h1>
        {eleccion.nombre} <PillEstado estado={eleccion.estado} />
      </h1>
      <h2>
        Desde el {eleccion.desde} hasta el {eleccion.hasta}
      </h2>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pestañas                                                            */
/* ------------------------------------------------------------------ */

export interface Pestana {
  etiqueta: string;
  href?: string;
  activa?: boolean;
}

/**
 * ul.modulo y ul.submodulo. "sel" es la convención de elemento activo,
 * confirmada en el menú lateral y en el selector de temas del footer.
 *
 * IMPORTANTE: cuando no hay pestañas que mostrar, este componente
 * devuelve null en vez de un <ul> vacío. Un ul.modulo sin hijos igual
 * ocupa espacio y muestra su borde inferior, porque el atributo
 * [hidden] pierde contra el display que le asigna la hoja institucional
 * (D-010).
 */
function Pestanas({ clase, items }: { clase: string; items: Pestana[] }) {
  if (!items.length) return null;
  return (
    <ul className={clase}>
      {items.map((p) => (
        <li key={p.etiqueta} className={p.activa ? "sel" : undefined}>
          <a href={p.href ?? "#"}>{p.etiqueta}</a>
        </li>
      ))}
    </ul>
  );
}

export const Modulo = (props: { items: Pestana[] }) => (
  <Pestanas clase="modulo" items={props.items} />
);

export const Submodulo = (props: { items: Pestana[] }) => (
  <Pestanas clase="submodulo" items={props.items} />
);

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

/**
 * .espera es el componente de carga de la plataforma; trae el spinner y
 * el gris del texto sin CSS propio. En el DOM real aparece como
 * <div id="loading" class="espera">Cargando...</div>.
 */
export function Espera({ children = "Cargando..." }: { children?: ReactNode }) {
  return <div className="espera">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Barra de porcentaje                                                 */
/* ------------------------------------------------------------------ */

/**
 * Umbrales del semáforo de participación, inferidos de dos módulos:
 * wrong bajo 50, warn entre 50 y 78, ok sobre 78.
 *
 * Los resultados por opción NO usan este semáforo: usan "info" (azul
 * neutro). La plataforma ya distingue los dos casos, así que el semáforo
 * es solo para participación agregada (D-021).
 */
function claseBarra(pct: number): string {
  if (pct >= 78) return "ok";
  if (pct >= 50) return "warn";
  return "wrong";
}

/**
 * div.porcentaje. El orden de los nodos importa:
 * span(valor) → span.tooltip(pct) → div.inner > div.bar
 *
 * La clase "bar" no tiene reglas propias en la hoja base; el color lo da
 * "div.porcentaje div.ok|warn|wrong|info". Se conserva por fidelidad al
 * DOM real.
 */
export function Porcentaje({
  valor,
  pct,
  neutro = false,
}: {
  valor: number;
  pct: number;
  neutro?: boolean;
}) {
  const clase = neutro ? "info" : claseBarra(pct);
  return (
    <div className="porcentaje" style={{ width: "100%" }}>
      <span>{numero(valor)}</span>
      <span className="tooltip">{Math.round(pct)}%</span>
      <div className="inner">
        <div className={`bar ${clase}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Responsive                                                          */
/* ------------------------------------------------------------------ */

/**
 * Patrón responsive de UCampus: el dato de una columna oculta en móvil
 * se DUPLICA dentro de .responsive-data. No son media queries propias.
 */
export function DatosResponsive({
  filas,
}: {
  filas: { etiqueta: string; valor: ReactNode }[];
}) {
  return (
    <div className="responsive-data only-movil no-print">
      {filas.map((f) => (
        <div className="responsive-row " key={f.etiqueta}>
          <span className="responsive-label">{f.etiqueta}</span> {f.valor}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Botones                                                             */
/* ------------------------------------------------------------------ */

/**
 * a.boton, con modificadores opcionales ok / warn / wrong.
 *
 * Un a.boton es un <a>: no tiene estado disabled. Para un botón
 * inactivo se usa <span class="boton">, que conserva la apariencia sin
 * ser navegable.
 */
export function Boton({
  children,
  href,
  onClick,
  variante,
  activo = true,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variante?: "ok" | "warn" | "wrong";
  activo?: boolean;
}) {
  const clase = `boton${variante ? " " + variante : ""}`;

  if (!activo) {
    return (
      <span className={clase} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <a
      className={clase}
      href={href ?? "#"}
      onClick={
        onClick
          ? (ev) => {
              ev.preventDefault();
              onClick();
            }
          : undefined
      }
    >
      {children}
    </a>
  );
}
