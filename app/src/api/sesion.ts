/**
 * Manejo de la sesión.
 *
 * El token llega en la URL en el paso 10 del flujo y se propaga por la
 * URL en cada navegación interna.
 *
 * No se guarda en localStorage ni en cookie:
 *  - RNF06: el módulo no debe almacenar datos sensibles en el cliente.
 *  - El servicio corre en un iframe de otro dominio, así que una cookie
 *    sería third-party: necesita SameSite=None; Secure y aun así Safari
 *    y Firefox pueden bloquearla (D-027).
 */

/** Parámetros que se conservan al navegar entre pantallas. */
const PERSISTENTES = ["sesion", "theme", "chrome", "v"] as const;

function actuales(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function tokenSesion(): string | null {
  return actuales().get("sesion");
}

export function tema(): string {
  const t = actuales().get("theme");
  const validos = ["focus", "focus-dark", "classic", "classic-dark"];
  return t && validos.includes(t) ? t : "focus";
}

export function conChrome(): boolean {
  return actuales().get("chrome") !== "0";
}

/**
 * Construye una URL interna preservando la sesión.
 *
 * Todo enlace del módulo tiene que pasar por acá. Un href escrito a mano
 * corta la sesión, y el síntoma es un 401 confuso en la pantalla
 * siguiente.
 */
export function ruta(
  camino: string,
  extra: Record<string, string | number | null> = {}
): string {
  const previos = actuales();
  const q = new URLSearchParams();

  for (const clave of PERSISTENTES) {
    const valor = previos.get(clave);
    if (valor !== null) q.set(clave, valor);
  }
  for (const [k, v] of Object.entries(extra)) {
    if (v === null) q.delete(k);
    else q.set(k, String(v));
  }

  const cadena = q.toString();
  return cadena ? `${camino}?${cadena}` : camino;
}
