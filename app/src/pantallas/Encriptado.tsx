/**
 * Encriptado del voto (RF05, RNF09, RNF10) y confirmación (RF08, RF09).
 *
 * NOTA ARQUITECTÓNICA, no cosmética.
 *
 * El encriptado ocurre EN EL CLIENTE: es el punto de todo el sistema,
 * el servidor nunca ve el voto en claro. Se reutiliza la librería
 * criptográfica de UParticipa; no se reimplementa (D-004).
 *
 * De ahí un problema concreto con el RNF09: si la operación corre en el
 * hilo principal, el navegador se congela y el indicador de carga se
 * detiene justo cuando más se necesita. El feedback visual no se arregla
 * con CSS, se arregla moviendo el cómputo a un Web Worker.
 *
 * encriptar() de abajo es un marcador de posición.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ErrorApi } from "../api/cliente";
import { ruta } from "../api/sesion";
import type { DetalleEleccion, VotoEmitido } from "../api/tipos";
import { olvidarPapeleta, tomarPapeleta } from "../api/votoPendiente";
import { migas } from "../chrome/montar";
import { Avisos } from "../componentes/Avisos";
import { mensajeError, useAvisos } from "../componentes/useAvisos";
import { Boton, Espera, Objeto } from "../componentes/ucampus";

/** Demora simulada, solo para el mock. */
const DEMORA_MOCK_MS = 2500;

/**
 * Marcador de posición de la librería criptográfica.
 *
 * Lo importante del contrato es lo que NO hace: las opciones entran acá
 * y no vuelven a salir en claro.
 */
async function encriptar(opciones: string[]): Promise<string> {
  await new Promise((r) => setTimeout(r, DEMORA_MOCK_MS));
  const semilla = opciones.join(",") + Date.now();
  let h = 0;
  for (const c of semilla) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return btoa(`${h}:${Math.random().toString(36).slice(2)}`) + "==";
}

type Estado =
  | { fase: "cargando" }
  | { fase: "sin-papeleta" }
  | { fase: "encriptando"; eleccion: DetalleEleccion }
  | { fase: "listo"; eleccion: DetalleEleccion; voto: VotoEmitido }
  | { fase: "error"; eleccion: DetalleEleccion | null };

export function Encriptado() {
  const [params] = useSearchParams();
  const id = params.get("id");

  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const { avisos, avisar, limpiar, descartar } = useAvisos();

  // React 18 en modo estricto monta dos veces en desarrollo. Sin este
  // guard el voto se enviaría dos veces, que en una elección es un
  // problema real y no una molestia de desarrollo.
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;

    if (!id) {
      avisar("No se indicó qué elección abrir.", "merror");
      setEstado({ fase: "error", eleccion: null });
      return;
    }

    const papeleta = tomarPapeleta(id);
    if (!papeleta) {
      // Se llegó acá sin pasar por la papeleta: recarga, enlace directo
      // o vuelta atrás del navegador. No hay nada que encriptar.
      avisar("No hay un voto pendiente de enviar.", "merror");
      setEstado({ fase: "sin-papeleta" });
      return;
    }

    (async () => {
      let eleccion: DetalleEleccion;
      try {
        eleccion = await api.eleccion(id);
      } catch (e) {
        avisar(
          e instanceof ErrorApi ? e.message : "Ocurrió un error inesperado.",
          "merror"
        );
        setEstado({ fase: "error", eleccion: null });
        return;
      }

      migas([{ texto: "UParticipa", href: ruta("/") }, { texto: eleccion.nombre }]);
      setEstado({ fase: "encriptando", eleccion });
      avisar("Proceso de encriptación de voto iniciado.", "maviso");

      try {
        const cifrado = await encriptar(papeleta.opciones);
        const voto = await api.votar(eleccion.id, cifrado);

        // El voto ya salió: no debe quedar rastro de la selección.
        olvidarPapeleta();

        limpiar();
        avisar("Su proceso de votación ha finalizado correctamente.", "mexito");
        setEstado({ fase: "listo", eleccion, voto });
      } catch (e) {
        limpiar();
        const httpEstado = e instanceof ErrorApi ? e.estado : null;
        avisar(
          mensajeError(
            httpEstado,
            e instanceof ErrorApi ? e.message : "Ocurrió un error inesperado."
          ),
          "merror"
        );
        // La papeleta se conserva para poder reintentar sin volver a
        // llenarla.
        setEstado({ fase: "error", eleccion });
      }
    })();
  }, [id, avisar, limpiar]);

  return (
    <>
      <Avisos avisos={avisos} onDescartar={descartar} />

      {estado.fase === "cargando" && <Espera />}

      {estado.fase === "sin-papeleta" && (
        <p>
          <Boton href={ruta("/")}>Volver al listado</Boton>
        </p>
      )}

      {estado.fase !== "cargando" && estado.fase !== "sin-papeleta" && estado.eleccion && (
        <Objeto eleccion={estado.eleccion} />
      )}

      {/* Sin pestañas en esta pantalla: es un paso intermedio de un flujo
          en curso, y salir a otra vista a mitad de camino deja a la
          persona sin saber si su voto se emitió (D-017). */}

      {estado.fase === "encriptando" && <Espera>Encriptando su voto...</Espera>}

      {estado.fase === "listo" && (
        <>
          <p>Su voto fue encriptado y recibido por la urna electrónica.</p>
          <p>
            Código de papeleta: <code>{estado.voto.papeleta}</code>
          </p>
          {/* Los tres sin modificador (azul). ok/warn/wrong señalizan
              consecuencia, y acá las tres acciones son igual de seguras
              y opcionales: el voto ya está emitido. */}
          <p>
            <Boton href={ruta("/")}>Volver al listado</Boton>{" "}
            <Boton href="#">Descargar certificado</Boton>{" "}
            <Boton
              href={ruta("/resultados", {
                id: estado.eleccion.id,
                vista: "urna",
              })}
            >
              Ver urna electrónica
            </Boton>
          </p>
        </>
      )}

      {estado.fase === "error" && estado.eleccion && (
        <p>
          <Boton href={ruta("/cabina", { id: estado.eleccion.id })}>
            Volver a la papeleta
          </Boton>
        </p>
      )}
    </>
  );
}
