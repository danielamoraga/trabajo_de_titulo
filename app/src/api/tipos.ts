/**
 * Tipos del contrato, derivados del OpenAPI del backend.
 *
 * esquema.d.ts se GENERA, no se edita a mano:
 *
 *     npm run tipos          (con el backend corriendo en :8001)
 *
 * Así el contrato lo verifica el compilador. Si el backend cambia un
 * campo y el frontend no se adapta, `npm run build` falla — que es
 * exactamente lo que se busca cuando el backend lo mantiene otro equipo.
 */

import type { components } from "./esquema";

type E = components["schemas"];

export type Usuario = E["Usuario"];
export type ResumenEleccion = E["ResumenEleccion"];
export type Listado = E["Listado"];
export type DetalleEleccion = E["DetalleEleccion"];
export type Pregunta = E["Pregunta"];
export type Opcion = E["Opcion"];
export type PaginaUrna = E["PaginaUrna"];
export type FilaUrna = E["FilaUrna"];
export type VotoEmitido = E["VotoEmitido"];

export type EstadoEleccion = ResumenEleccion["estado"];
export type Accion = ResumenEleccion["acciones"][number];