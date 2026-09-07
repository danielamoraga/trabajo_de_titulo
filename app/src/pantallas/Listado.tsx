/**
 * Listado de elecciones (RF02, RF02.1, RF03.1).
 *
 * La lista llega YA FILTRADA por habilitación desde el servidor: el
 * frontend no decide quién puede votar qué (D-003).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ErrorApi } from "../api/cliente";
import { ruta } from "../api/sesion";
import type { ResumenEleccion } from "../api/tipos";
import { migas } from "../chrome/montar";
import { Avisos } from "../componentes/Avisos";
import { useAvisos } from "../componentes/useAvisos";
import {
  DatosResponsive, Espera, PillVoto, Porcentaje, numero,
} from "../componentes/ucampus";

const ETIQUETA = {
  en_curso: "Abierta",
  finalizada: "Finalizada",
  en_pausa: "En pausa",
} as const;

/**
 * Destino según el estado (RF03.1): las abiertas van a la papeleta, las
 * finalizadas a resultados. Las pausadas no son navegables.
 */
function destino(e: ResumenEleccion): string | null {
  if (e.estado === "en_curso") return ruta("/cabina", { id: e.id });
  if (e.estado === "finalizada")
    return ruta("/resultados", { id: e.id, vista: "resultados" });
  return null;
}

function Fila({ eleccion, n }: { eleccion: ResumenEleccion; n: number }) {
  const url = destino(eleccion);
  return (
    <tr className={n % 2 ? "even" : "odd"}>
      <td className="number">{n + 1}</td>
      <td className="string responsive-main">
        <h1>
          {url ? <Link to={url}>{eleccion.nombre}</Link> : eleccion.nombre}{" "}
          <PillVoto yaVoto={eleccion.ya_voto} />
        </h1>
        <h2>
          Desde el {eleccion.desde} hasta el {eleccion.hasta}
        </h2>
        <DatosResponsive
          filas={[{ etiqueta: "Claustro", valor: numero(eleccion.claustro) }]}
        />
      </td>
      <td className="number responsive no-movil">{numero(eleccion.claustro)}</td>
      <td className="center">
        <Porcentaje valor={eleccion.respuestas} pct={eleccion.participacion} />
      </td>
      <td className="string center">{ETIQUETA[eleccion.estado]}</td>
    </tr>
  );
}

export function Listado() {
  const [elecciones, setElecciones] = useState<ResumenEleccion[] | null>(null);
  const { avisos, avisar, descartar } = useAvisos();

  useEffect(() => {
    migas([{ texto: "UParticipa" }]);
    api
      .elecciones()
      .then((d) => setElecciones(d.elecciones))
      .catch((e: unknown) => {
        setElecciones([]);
        avisar(
          e instanceof ErrorApi ? e.message : "Ocurrió un error inesperado.",
          "merror"
        );
      });
  }, [avisar]);

  return (
    <>
      <Avisos avisos={avisos} onDescartar={descartar} />
      <h1>Votaciones</h1>

      {elecciones === null && <Espera />}

      {/* Estado vacío: autenticado pero sin elecciones habilitadas. Es
          un caso frecuente, no un error. La redacción es la que ya usa
          UParticipa. */}
      {elecciones?.length === 0 && (
        <p>No hay elecciones en curso en este momento.</p>
      )}

      {elecciones !== null && elecciones.length > 0 && (
        // Tabla con id="votaciones" y sin clase, igual que el módulo
        // real. No lleva table.detalle: esa clase es para tablas
        // informativas, no para un listado navegable (D-028).
        <table id="votaciones">
          <colgroup>
            <col className="col0 number" />
            <col className="col1 string responsive-main" />
            <col className="col2 number responsive no-movil" />
            <col className="col3 center" />
            <col className="col4 string center" />
          </colgroup>
          <thead className="sticky">
            <tr className="even">
              <th className="number">Nº</th>
              <th className="string responsive-main">Votación</th>
              <th className="number responsive no-movil">Claustro</th>
              <th className="center">Respuestas</th>
              <th className="string center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {elecciones.map((e, i) => (
              <Fila key={e.id} eleccion={e} n={i} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
