import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Un solo archivo JS y uno CSS, con nombres fijos.
    //
    // El Servicio Externo se sirve desde una URL acordada con UCampus y
    // el HTML lo genera el servidor al validar el ticket (tiene que
    // inyectar el <link> del CSS institucional). Nombres con hash
    // obligarían a leer el manifest de Vite en cada request.
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  server: {
    port: 5173,
  },
});
