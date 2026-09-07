import { useCallback, useState } from "react";
import type { Aviso, Severidad } from "./Avisos";

/** Estado de los avisos de una pantalla. */
export function useAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, severidad: Severidad = "maviso") => {
    setAvisos((previos) => [...previos, { texto, severidad }]);
  }, []);

  const limpiar = useCallback(() => setAvisos([]), []);

  const descartar = useCallback((severidad: Severidad) => {
    setAvisos((previos) => previos.filter((a) => a.severidad !== severidad));
  }, []);

  return { avisos, avisar, limpiar, descartar };
}

/**
 * Traduce un estado HTTP al mensaje del RF07.1.
 *
 * Los códigos los define el backend; el frontend los traduce a algo que
 * una persona pueda entender y accionar.
 */
export function mensajeError(estado: number | null, respaldo: string): string {
  switch (estado) {
    case 0:
      return "No fue posible comunicarse con el servidor. Su voto no fue emitido.";
    case 401:
      return "Su sesión expiró y el voto no fue emitido. Vuelva a ingresar al módulo.";
    case 400:
      return "El voto no pudo ser validado criptográficamente.";
    case 409:
      return "La elección ya no está recibiendo votos.";
    case 422:
      return "La solicitud no tiene el formato esperado.";
    default:
      return respaldo;
  }
}