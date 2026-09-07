/**
 * Avisos de UCampus (#mensajes).
 *
 * La severidad va en el ID del div, no en una clase: kernel.mensaje()
 * lee el primer carácter del texto y elige el contenedor (D-009).
 *
 *   "-" → #merror    "+" → #mexito    "*" → #minfo    sin prefijo → #maviso
 *
 * La hoja base define los cuatro bajo #mensajes con fondo, borde más
 * oscuro y color de texto propios. #mexito usa exactamente la misma
 * paleta que div.pill.ok (#dff0d8 / #d6e9c6 / #3c763d), así que el aviso
 * verde de "voto emitido" no necesita CSS propio.
 *
 * Se renderiza con createPortal hacia #mensajes, que vive en el chrome
 * y por lo tanto fuera del árbol de React. El portal apunta a #mensajes
 * y NO a document.body: el resizer mide hasta un iframe centinela que
 * inyecta al final del body, así que cualquier cosa montada ahí quedaría
 * fuera de la medición de altura (D-026).
 */

import { createPortal } from "react-dom";

export type Severidad = "maviso" | "mexito" | "merror" | "minfo";

export interface Aviso {
  texto: string;
  severidad: Severidad;
}

export function Avisos({
  avisos,
  onDescartar,
}: {
  avisos: Aviso[];
  onDescartar: (severidad: Severidad) => void;
}) {
  const destino = document.getElementById("mensajes");
  if (!destino) return null;

  // Varios avisos de la misma severidad se acumulan como <li> del mismo
  // <ul>, no como divs separados: por eso el contenedor es un id y no
  // una clase.
  const porSeveridad = new Map<Severidad, string[]>();
  for (const a of avisos) {
    const previos = porSeveridad.get(a.severidad) ?? [];
    previos.push(a.texto);
    porSeveridad.set(a.severidad, previos);
  }

  return createPortal(
    <>
      {[...porSeveridad.entries()].map(([severidad, textos]) => (
        <div
          key={severidad}
          id={severidad}
          onClick={() => onDescartar(severidad)}
        >
          {/* El original hace clickeable todo el div para descartarlo. */}
          <a className="close" href="#" onClick={(e) => e.preventDefault()}>
            x
          </a>
          <ul>
            {textos.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ))}
    </>,
    destino
  );
}
