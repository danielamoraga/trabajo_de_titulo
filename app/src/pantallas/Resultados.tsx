/**
 * Resultados: urna electrónica, estadísticas y verificación
 * (RF10, RNF11).
 *
 * ESTRUCTURA DE NAVEGACIÓN
 * Subpestañas siempre: Resultados / Urna electrónica / Estadísticas /
 * Verificación. Lo que cambia es si además se muestran las pestañas
 * principales (Votar / Resultados):
 *
 *  - CON principales: se llega desde la cabina, con la votación abierta
 *    y sin voto emitido. Hay que poder volver a la papeleta.
 *  - SIN principales: se llega tras votar, o desde una elección
 *    finalizada. "Votar" sería un camino sin destino.
 *
 * En el mock la condición viene por parámetro (&votando=1); en la
 * implementación real se deriva del estado de la elección y de ya_voto,
 * que el backend ya entrega (D-016).
 *
 * "Eventos" queda fuera del alcance del módulo por decisión de diseño,
 * aunque UParticipa la ofrece (D-014).
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ErrorApi } from "../api/cliente";
import { ruta } from "../api/sesion";
import type { DetalleEleccion, PaginaUrna } from "../api/tipos";
import { migas } from "../chrome/montar";
import { Avisos } from "../componentes/Avisos";
import { useAvisos } from "../componentes/useAvisos";
import {
  Boton, DatosResponsive, Espera, Modulo, Objeto, Submodulo, numero,
} from "../componentes/ucampus";

const POR_PAGINA = 50;

const VISTAS = [
  { id: "resultados", etiqueta: "Resultados" },
  { id: "urna", etiqueta: "Urna electrónica" },
  { id: "estadisticas", etiqueta: "Estadísticas" },
  { id: "verificacion", etiqueta: "Verificación" },
] as const;

type IdVista = (typeof VISTAS)[number]["id"];

function Urna({ eleccion }: { eleccion: DetalleEleccion }) {
  const [params] = useSearchParams();
  const pagina = Math.max(1, Number(params.get("pagina")) || 1);

  const [datos, setDatos] = useState<PaginaUrna | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDatos(null);
    // La paginación es del servidor: traer la urna completa para
    // mostrar 50 filas anula el objetivo del RNF11, y en una elección
    // de rectoría son decenas de miles de papeletas (D-006).
    api
      .urna(eleccion.id, pagina, POR_PAGINA)
      .then(setDatos)
      .catch((e: unknown) =>
        setError(
          e instanceof ErrorApi ? e.message : "Ocurrió un error inesperado."
        )
      );
  }, [eleccion.id, pagina]);

  if (error) return <p>{error}</p>;
  if (!datos) return <Espera>Cargando urna...</Espera>;
  if (!datos.total) return <p>La urna aún no registra votos.</p>;

  return (
    <>
      {/* table.detalle: tabla informativa con datos para el usuario,
          que es exactamente este caso (D-028). */}
      <table className="detalle">
        <colgroup>
          <col className="col0 string responsive-main" />
          <col className="col1 center" />
        </colgroup>
        <thead className="sticky">
          <tr className="even">
            <th className="string responsive-main">Código de Papeleta</th>
            <th className="center">Voto Encriptado</th>
          </tr>
        </thead>
        <tbody>
          {datos.filas.map((f, i) => (
            <tr key={f.papeleta} className={i % 2 ? "even" : "odd"}>
              {/* Código completo: es lo que permite comprobar que un
                  voto está en la urna, así que no se trunca (D-020). */}
              <td className="string responsive-main">
                {f.papeleta}
                <DatosResponsive
                  filas={[
                    {
                      etiqueta: "Voto Encriptado",
                      valor: <a href={f.voto_url}>Descargar</a>,
                    },
                  ]}
                />
              </td>
              <td className="center">
                <Boton href={f.voto_url}>Descargar</Boton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginación al estilo de UParticipa: Previo / Siguiente más el
          conteo. Un enlace no tiene estado disabled, así que los
          extremos van como <span class="boton">. */}
      <p>
        <Boton
          href={ruta("/resultados", {
            id: eleccion.id,
            vista: "urna",
            pagina: pagina - 1,
          })}
          activo={pagina > 1}
        >
          Previo
        </Boton>{" "}
        <Boton
          href={ruta("/resultados", {
            id: eleccion.id,
            vista: "urna",
            pagina: pagina + 1,
          })}
          activo={pagina < datos.total_paginas}
        >
          Siguiente
        </Boton>
      </p>
      <p>
        Página {datos.pagina} de {datos.total_paginas} (Mostrando{" "}
        {datos.desde}-{datos.hasta} de {numero(datos.total)} resultados)
      </p>
    </>
  );
}

export function Resultados() {
  const [params] = useSearchParams();
  const id = params.get("id");

  const pedida = params.get("vista");
  // Por defecto la urna: es el destino de quien acaba de votar.
  const vista: IdVista = VISTAS.some((v) => v.id === pedida)
    ? (pedida as IdVista)
    : "urna";

  const [eleccion, setEleccion] = useState<DetalleEleccion | null>(null);
  const { avisos, avisar, descartar } = useAvisos();

  useEffect(() => {
    if (!id) {
      avisar("No se indicó qué elección abrir.", "merror");
      return;
    }
    api
      .eleccion(id)
      .then((e) => {
        setEleccion(e);
        migas([{ texto: "UParticipa", href: ruta("/") }, { texto: e.nombre }]);
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

  const votando =
    params.get("votando") === "1" && eleccion.estado === "en_curso";

  return (
    <>
      <Avisos avisos={avisos} onDescartar={descartar} />
      <Objeto eleccion={eleccion} />

      {/* Modulo devuelve null con la lista vacía, así que cuando no
          corresponde no queda un ul.modulo vacío mostrando su borde
          inferior (D-010). */}
      <Modulo
        items={
          votando
            ? [
                {
                  etiqueta: "Votar",
                  href: ruta("/cabina", { id: eleccion.id }),
                },
                { etiqueta: "Resultados", activa: true },
              ]
            : []
        }
      />

      <Submodulo
        items={VISTAS.map((v) => ({
          etiqueta: v.etiqueta,
          // Cambiar de vista reinicia la paginación.
          href: ruta("/resultados", {
            id: eleccion.id,
            vista: v.id,
            pagina: null,
            ...(votando ? { votando: 1 } : {}),
          }),
          activa: v.id === vista,
        }))}
      />

      {vista === "urna" ? (
        <Urna eleccion={eleccion} />
      ) : (
        // Las otras tres quedan declaradas para que la estructura de
        // navegación sea evaluable, con un marcador explícito en lugar
        // de contenido inventado.
        <p>Pantalla pendiente de implementación.</p>
      )}
    </>
  );
}
