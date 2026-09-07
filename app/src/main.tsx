/**
 * Punto de entrada.
 *
 * Orden importante: primero se monta el chrome (que crea #body y
 * #mensajes en el DOM), y solo después React se monta dentro de #body.
 * El chrome es markup ajeno y estático que React no debe controlar.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { montar } from "./chrome/montar";
import { Cabina } from "./pantallas/Cabina";
import { Encriptado } from "./pantallas/Encriptado";
import { Listado } from "./pantallas/Listado";
import { Resultados } from "./pantallas/Resultados";

const destino = montar();

createRoot(destino).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Listado />} />
        <Route path="/cabina" element={<Cabina />} />
        <Route path="/encriptado" element={<Encriptado />} />
        <Route path="/resultados" element={<Resultados />} />
        {/* Cualquier otra ruta cae al listado, que es la entrada del
            módulo. */}
        <Route path="*" element={<Listado />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
