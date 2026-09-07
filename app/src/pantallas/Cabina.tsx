/**
 * Cabina de votación (RF03, RF04, RF11).
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ErrorApi } from "../api/cliente";
import { ruta } from "../api/sesion";
import type { DetalleEleccion, Opcion } from "../api/tipos";
import { guardarPapeleta } from "../api/votoPendiente";
import { migas } from "../chrome/montar";
import { Avisos } from "../componentes/Avisos";
import { useAvisos } from "../componentes/useAvisos";
import { Boton, Espera, Modulo, Objeto } from "../componentes/ucampus";

/** Etiqueta de una opción: código en negrita, nombre y lista en cursiva. */
function Etiqueta({ opcion }: { opcion: Opcion }) {
  return (
    <>
      {opcion.codigo && <strong>{opcion.codigo} </strong>}
      {opcion.nombre}
      {opcion.lista ? (
        <em> ({opcion.lista})</em>
      ) : opcion.codigo ? (
        <em> (fuera de lista)</em>
      ) : null}
    </>
  );
}

export function Cabina() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const navegar = useNavigate();

  const [eleccion, setEleccion] = useState<DetalleEleccion | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const { avisos, avisar, limpiar, descartar } = useAvisos();

  useEffect(() => {
    if (!id) {
      avisar("No se indicó qué elección abrir.", "merror");
      return;
    }
    api
      .eleccion(id)
      .then((e) => {
        setEleccion(e);
        migas([
          { texto: "UParticipa", href: ruta("/") },
          { texto: e.nombre },
        ]);
        // RF11.1: advertir a quien ya votó y vuelve a entrar.
        if (e.ya_voto) {
          avisar(
            "Usted ya emitió un voto en esta elección. Si vota de nuevo, " +
              "su voto anterior será reemplazado en la urna.",
            "maviso"
          );
        }
      })
      .catch((e: unknown) =>
        avisar(
          e instanceof ErrorApi ? e.message : "Ocurrió un error inesperado.",
          "merror"
        )
      );
  }, [id, avisar]);

  if (!eleccion) {
    return (
      <>
        <Avisos avisos={avisos} onDescartar={descartar} />
        {id && <Espera />}
      </>
    );
  }

  if (eleccion.estado !== "en_curso") {
    // No hay papeleta que mostrar. En vez de dejar la pantalla vacía se
    // ofrece el camino que sí existe.
    return (
      <>
        <Avisos avisos={avisos} onDescartar={descartar} />
        <Objeto eleccion={eleccion} />
        <p>Esta elección no está recibiendo votos.</p>
        <p>
          <Boton href={ruta("/resultados", { id: eleccion.id, vista: "resultados" })}>
            Ver resultados
          </Boton>
        </p>
      </>
    );
  }

  // Se captura en una const: dentro de los closures TypeScript pierde el
  // narrowing de un valor de useState, porque podría cambiar entre el
  // guard y la llamada.
  const el = eleccion;
  const pregunta = el.preguntas[0];
  const multiple = el.seleccion === "multiple";

  function alternar(idOpcion: string) {
    setMarcadas((previas) => {
      if (!multiple) return [idOpcion];
      return previas.includes(idOpcion)
        ? previas.filter((x) => x !== idOpcion)
        : [...previas, idOpcion];
    });
  }

  function votar() {
    limpiar();

    if (!marcadas.length) {
      avisar("Debe seleccionar una opción antes de votar.", "merror");
      return;
    }
    if (marcadas.length > el.max_selecciones) {
      avisar(
        `Puede seleccionar como máximo ${el.max_selecciones} opción(es).`,
        "merror"
      );
      return;
    }

    // La papeleta queda en memoria del módulo, no en la URL ni en
    // sessionStorage (D-005). Con navegación SPA no se recarga la
    // página, así que sobrevive el cambio de pantalla.
    guardarPapeleta({ idEleccion: el.id, opciones: marcadas });
    navegar(ruta("/encriptado", { id: el.id }));
  }

  return (
    <>
      <Avisos avisos={avisos} onDescartar={descartar} />
      <Objeto eleccion={eleccion} />

      {/* Pestañas principales: solo Votar y Resultados. "Urna
          electrónica" no vive en este nivel; es una vista dentro de
          Resultados (D-015). Resultados queda navegable con la elección
          abierta porque el RF10.1 pide estadísticas en vivo. */}
      <Modulo
        items={[
          { etiqueta: "Votar", activa: true },
          {
            etiqueta: "Resultados",
            href: ruta("/resultados", {
              id: eleccion.id,
              vista: "resultados",
              votando: 1,
            }),
          },
        ]}
      />

      <form onSubmit={(e) => e.preventDefault()}>
        <p>{pregunta?.enunciado}</p>

        {/* Una opción por línea, sin <ul> para no arrastrar los
            marcadores de lista.

            Ninguna opción viene premarcada (D-018): premarcar sesga el
            voto de quien no lee con atención, y hace imposible
            distinguir "no respondió" de "eligió la primera opción".

            El orden es el que entrega el servidor y no se reordena
            (D-019). */}
        <div>
          {pregunta?.opciones.map((o) => (
            <span key={o.id}>
              <label>
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name="opcion"
                  value={o.id}
                  checked={marcadas.includes(o.id)}
                  onChange={() => alternar(o.id)}
                />{" "}
                <Etiqueta opcion={o} />
              </label>
              <br />
            </span>
          ))}
        </div>

        <p>
          <Boton onClick={votar}>Votar</Boton>
        </p>
      </form>
    </>
  );
}
