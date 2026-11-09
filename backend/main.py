"""
Mock del backend de UParticipa como Servicio Externo de UCampus.

    uv run uvicorn main:app --port 8001 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
import entrada
import lista
import ucampus_fake

app = FastAPI(title="UParticipa — Servicio Externo UCampus (mock)", version="0.1.0")

# El frontend y la API son orígenes distintos. Solo se habilita el del
# frontend, nunca "*". Sin cookies: la sesión va en Authorization (D-029).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.ORIGEN_FRONTEND],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(entrada.router)
app.include_router(lista.router)
app.include_router(ucampus_fake.router)
