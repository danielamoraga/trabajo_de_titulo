#!/usr/bin/env bash
# Levanta el mock del backend con lo que haya disponible en el sistema.
#
# Orden de preferencia:
#   1. uv        — no toca el Python del sistema
#   2. venv      — .venv local, viene en el paquete "python" de Arch
#   3. sistema   — si las dependencias ya están instaladas por pacman
set -euo pipefail
cd "$(dirname "$0")"

PUERTO="${PUERTO:-8001}"

if command -v uv >/dev/null 2>&1; then
    echo "-> uv"
    exec uv run uvicorn main:app --port "$PUERTO" --reload
fi

if [ -d .venv ]; then
    echo "-> .venv existente"
    exec .venv/bin/uvicorn main:app --port "$PUERTO" --reload
fi

if python -c "import fastapi, uvicorn, httpx" 2>/dev/null; then
    echo "-> dependencias del sistema"
    exec uvicorn main:app --port "$PUERTO" --reload
fi

echo "-> creando .venv"
python -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt
exec .venv/bin/uvicorn main:app --port "$PUERTO" --reload