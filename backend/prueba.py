import httpx, sys

B = "http://127.0.0.1:8001"
ok = fallos = 0

def check(nombre, cond, extra=""):
    global ok, fallos
    if cond:
        ok += 1; print(f"  OK   {nombre}")
    else:
        fallos += 1; print(f"  FALLA {nombre} {extra}")

def flujo(perfil):
    t = httpx.post(f"{B}/ucampus-fake/emitir-ticket", params={"perfil": perfil}).json()["ticket"]
    r = httpx.get(f"{B}/externo", params={"ticket": t})
    return r

print("\n== Paso 4-8: entrada desde UCampus ==")
r = flujo("completo")
check("respuesta es texto plano", r.headers["content-type"].startswith("text/plain"), r.headers["content-type"])
check("devuelve una URL", r.text.startswith("http"), r.text[:60])
sesion = r.text.split("sesion=")[1]

print("\n== Camino de error: sin id_externo ==")
r = flujo("sin_id_externo")
check("no devuelve URL", not r.text.startswith("http"))
check("mensaje legible", "identificador" in r.text, r.text[:70])

print("\n== Ticket de un solo uso ==")
t = httpx.post(f"{B}/ucampus-fake/emitir-ticket").json()["ticket"]
httpx.get(f"{B}/externo", params={"ticket": t})
r2 = httpx.get(f"{B}/externo", params={"ticket": t})
check("segundo uso rechazado", not r2.text.startswith("http"), r2.text[:60])

print("\n== Sesión ==")
r = httpx.get(f"{B}/api/externo/elecciones")
check("sin token -> 401", r.status_code == 401, r.status_code)
r = httpx.get(f"{B}/api/externo/elecciones", params={"sesion": "inventado"})
check("token falso -> 401", r.status_code == 401, r.status_code)

print("\n== Listado filtrado (D-003) ==")
d = httpx.get(f"{B}/api/externo/elecciones", params={"sesion": sesion}).json()
check("4 elecciones para 'completo'", len(d["elecciones"]) == 4, len(d["elecciones"]))
check("ya_voto=None en curso", d["elecciones"][0]["ya_voto"] is None)
check("acciones vienen del servidor", "votar" in d["elecciones"][0]["acciones"])

s2 = flujo("parcial").text.split("sesion=")[1]
d2 = httpx.get(f"{B}/api/externo/elecciones", params={"sesion": s2}).json()
check("1 eleccion para 'parcial'", len(d2["elecciones"]) == 1, len(d2["elecciones"]))

s3 = flujo("sin_elecciones").text.split("sesion=")[1]
d3 = httpx.get(f"{B}/api/externo/elecciones", params={"sesion": s3}).json()
check("0 elecciones -> estado vacio", d3["elecciones"] == [])

print("\n== Habilitación por elección ==")
r = httpx.get(f"{B}/api/externo/eleccion/e-01", params={"sesion": s2})
check("e-01 no habilitada para 'parcial' -> 404", r.status_code == 404, r.status_code)
r = httpx.get(f"{B}/api/externo/eleccion/e-99", params={"sesion": sesion})
check("eleccion inexistente -> 404", r.status_code == 404, r.status_code)

print("\n== Papeleta ==")
det = httpx.get(f"{B}/api/externo/eleccion/e-01", params={"sesion": sesion}).json()
check("8 opciones", len(det["preguntas"][0]["opciones"]) == 8, len(det["preguntas"][0]["opciones"]))
check("ya_voto False", det["ya_voto"] is False)

print("\n== Emitir voto ==")
r = httpx.post(f"{B}/api/externo/eleccion/e-01/voto", params={"sesion": sesion}, json={})
check("sin voto_encriptado -> 400", r.status_code == 400, r.status_code)
r = httpx.post(f"{B}/api/externo/eleccion/e-01/voto", params={"sesion": sesion},
               json={"voto_encriptado": "AAAA=="})
check("voto aceptado", r.status_code == 200, r.text[:80])
v = r.json()
check("devuelve papeleta de 43 chars", len(v["papeleta"]) == 43, len(v["papeleta"]))
check("no reemplaza la primera vez", v["reemplaza_voto_anterior"] is False)
r = httpx.post(f"{B}/api/externo/eleccion/e-01/voto", params={"sesion": sesion},
               json={"voto_encriptado": "BBBB=="}).json()
check("segundo voto reemplaza (RF11.2)", r["reemplaza_voto_anterior"] is True)

r = httpx.post(f"{B}/api/externo/eleccion/e-03/voto", params={"sesion": sesion},
               json={"voto_encriptado": "X"})
check("eleccion finalizada -> 409", r.status_code == 409, r.status_code)

print("\n== Urna paginada (RNF11) ==")
u = httpx.get(f"{B}/api/externo/eleccion/e-03/urna", params={"sesion": sesion}).json()
check("287 registros, 6 paginas", u["total"] == 287 and u["total_paginas"] == 6, (u["total"], u["total_paginas"]))
check("primera pagina 50 filas", len(u["filas"]) == 50, len(u["filas"]))
u6 = httpx.get(f"{B}/api/externo/eleccion/e-03/urna", params={"sesion": sesion, "pagina": 6}).json()
check("ultima pagina 37 filas", len(u6["filas"]) == 37, len(u6["filas"]))
codigos = {f["papeleta"] for f in u["filas"]}
check("codigos unicos y completos", len(codigos) == 50 and all(len(c) == 43 for c in codigos))
r = httpx.get(f"{B}/api/externo/eleccion/e-03/urna", params={"sesion": sesion, "por_pagina": 5000})
check("por_pagina acotado -> 422", r.status_code == 422, r.status_code)

print(f"\n{ok} ok, {fallos} fallas")
sys.exit(1 if fallos else 0)