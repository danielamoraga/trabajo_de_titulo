/**
 * Cliente HTTP del backend de UParticipa.
 */

import type {
  DetalleEleccion,
  Listado,
  PaginaUrna,
  VotoEmitido,
} from "./tipos";
import { tokenSesion } from "./sesion";

const BASE = import.meta.env.VITE_API ?? "http://127.0.0.1:8001";

/** Error con el estado HTTP, para que la pantalla elija el mensaje. */
export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    /** 0 significa que no hubo respuesta: backend caído o CORS. */
    readonly estado: number
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const sesion = tokenSesion();
  if (!sesion) {
    throw new ErrorApi(
      "No hay una sesión activa. Vuelva a ingresar al módulo desde UCampus.",
      401
    );
  }

  let r: Response;
  try {
    r = await fetch(BASE + ruta, {
      ...opciones,
      headers: {
        "X-Sesion": sesion,
        ...(opciones.body ? { "Content-Type": "application/json" } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    // Un fetch que falla sin respuesta suele ser el backend caído o CORS
    // mal configurado. Conviene distinguirlo de un error del servidor,
    // porque el diagnóstico es completamente distinto.
    throw new ErrorApi("No fue posible conectar con el servidor de votación.", 0);
  }

  if (r.status === 401) {
    throw new ErrorApi("Su sesión expiró. Vuelva a ingresar al módulo.", 401);
  }

  if (!r.ok) {
    let detalle = `Error ${r.status}`;
    try {
      const cuerpo = (await r.json()) as { detail?: string };
      if (cuerpo.detail) detalle = cuerpo.detail;
    } catch {
      /* sin JSON: queda el mensaje genérico */
    }
    throw new ErrorApi(detalle, r.status);
  }

  return (await r.json()) as T;
}

export const api = {
  /** Listado ya filtrado por habilitación (RF02, D-003). */
  elecciones: () => pedir<Listado>("/api/externo/elecciones"),

  eleccion: (id: string) =>
    pedir<DetalleEleccion>(`/api/externo/eleccion/${encodeURIComponent(id)}`),

  urna: (id: string, pagina = 1, porPagina = 50) =>
    pedir<PaginaUrna>(
      `/api/externo/eleccion/${encodeURIComponent(id)}/urna` +
        `?pagina=${pagina}&por_pagina=${porPagina}`
    ),

  /**
   * Envía el voto YA ENCRIPTADO.
   *
   * La firma no acepta la opción elegida a propósito: el encriptado
   * ocurre en el cliente y el servidor nunca ve el voto en claro
   * (D-004). El tipo hace que sea imposible mandarla por accidente.
   */
  votar: (id: string, votoEncriptado: string, prueba: string | null = null) =>
    pedir<VotoEmitido>(
      `/api/externo/eleccion/${encodeURIComponent(id)}/voto`,
      {
        method: "POST",
        body: JSON.stringify({ voto_encriptado: votoEncriptado, prueba }),
      }
    ),
};
