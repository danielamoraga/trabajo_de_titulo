/**
 * Papeleta pendiente de encriptar, entre la cabina y el encriptado.
 *
 * Vive en memoria del módulo, no en sessionStorage ni en la URL.
 *
 * Un parámetro de query queda en el historial del navegador, en los logs
 * del servidor y en la cabecera Referer, o sea que filtraría el voto
 * (D-005). sessionStorage lo persiste en disco.
 *
 * Con navegación SPA el módulo no se recarga entre las dos pantallas, así
 * que una variable alcanza. Si la persona recarga, se pierde — y eso es
 * correcto: no debe quedar rastro de una selección que nunca se emitió.
 */

export interface Papeleta {
  idEleccion: string;
  opciones: string[];
}

let pendiente: Papeleta | null = null;

export function guardarPapeleta(p: Papeleta): void {
  pendiente = p;
}

export function tomarPapeleta(idEleccion: string): Papeleta | null {
  if (!pendiente || pendiente.idEleccion !== idEleccion) return null;
  return pendiente;
}

export function olvidarPapeleta(): void {
  pendiente = null;
}
