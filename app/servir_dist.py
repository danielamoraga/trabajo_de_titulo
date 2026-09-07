#!/usr/bin/env python3
"""
Servidor estático con fallback a index.html, para probar el build.

El fallback hace falta porque las rutas del módulo (/cabina,
/resultados) no son archivos: las resuelve React Router en el cliente.
En producción lo hace el servidor del Servicio Externo, que además
inyecta el <link> del CSS con la URL del ticket.
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).parent / "dist"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(RAIZ), **kw)

    def do_GET(self):
        partes = self.path.split("?", 1)
        ruta = partes[0].lstrip("/")
        query = partes[1] if len(partes) > 1 else ""

        # ?iife=1 sirve prueba.html (bundle IIFE) en lugar de index.html,
        # conservando la ruta para que React Router la resuelva. jsdom no
        # ejecuta <script type="module">, así que la prueba automatizada
        # necesita un bundle clásico. Solo para desarrollo.
        indice = "prueba.html" if "iife=1" in query else "index.html"

        if not ruta or not (RAIZ / ruta).exists():
            self.path = f"/{indice}" + (f"?{query}" if query else "")
        return super().do_GET()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"dist/ en http://127.0.0.1:{puerto}")
    ThreadingHTTPServer(("127.0.0.1", puerto), Handler).serve_forever()
