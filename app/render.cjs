/**
 * Prueba de render de la app React contra el backend.
 *
 * Carga el build (dist/) en jsdom y verifica el DOM resultante.
 *
 * Dos parches del entorno, que no afectan al navegador real:
 *  - jsdom no implementa fetch: se inyecta el de Node en beforeParse.
 *  - la hoja de UCampus y el resizer no se pueden descargar acá, y no
 *    hacen falta: esta prueba mira el DOM, no el estilo.
 */

const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");

function consola() {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/Could not load|ERR_|fetch|resizer|\.css/i.test(e.message)) {
      console.log("    [error]", e.message.split("\n")[0]);
    }
  });
  return vc;
}

async function abrir(camino, espera = 1500) {
  // Se sirve prueba.html, que carga un bundle IIFE en vez del módulo ES
  // del build real: jsdom no ejecuta <script type="module">. Es una
  // limitación del entorno de prueba, no del navegador.
  const url =
    `http://127.0.0.1:8000${camino}` +
    (camino.includes("?") ? "&" : "?") +
    "iife=1";
  const dom = await JSDOM.fromURL(url, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: consola(),
    beforeParse(window) {
      window.fetch = (u, o) => globalThis.fetch(u, o);
    },
  });
  await new Promise((r) => setTimeout(r, espera));
  return dom;
}

const q = (d, s) => d.window.document.querySelector(s);
const qa = (d, s) => [...d.window.document.querySelectorAll(s)];
const txt = (d, s) => (q(d, s) || {}).textContent;

let ok = 0,
  fallas = 0;
function check(n, cond, extra = "") {
  if (cond) {
    ok++;
    console.log("  OK   " + n);
  } else {
    fallas++;
    console.log("  FALLA " + n + "  " + extra);
  }
}

(async () => {
  const s = fs.readFileSync("/tmp/sesion.txt", "utf8").trim();

  console.log("\n== / (listado) ==");
  let d = await abrir(`/?sesion=${s}`);
  check("chrome montado", !!q(d, "#header-content-wrapper"));
  check("menu con 4 bloques", qa(d, "#menu #modulos > div").length === 4, qa(d, "#menu #modulos > div").length);
  check("footer con 4 temas", qa(d, "#footer .themes li").length === 4);
  const mi = q(d, "#servicios li#uparticipa a");
  check("UParticipa del menu -> listado", mi && mi.getAttribute("href").includes("sesion="), mi && mi.getAttribute("href"));
  check("breadcrumb", txt(d, "#navbar li") === "UParticipa", txt(d, "#navbar li"));
  check("React monto en #body", !!q(d, "#body table#votaciones"));
  check("4 filas", qa(d, "#body tbody tr").length === 4, qa(d, "#body tbody tr").length);
  check("div.porcentaje", !!q(d, "#body div.porcentaje"));
  check("pill solo en finalizadas", qa(d, "#body tbody div.pill").length === 2, qa(d, "#body tbody div.pill").length);
  const hrefs = qa(d, "#body tbody a").map((a) => a.getAttribute("href"));
  check("abiertas -> /cabina", hrefs.some((h) => h.startsWith("/cabina")), hrefs[0]);
  check("finalizadas -> /resultados", hrefs.some((h) => h.startsWith("/resultados")));
  check("sesion propagada", hrefs.length > 0 && hrefs.every((h) => h.includes("sesion=")));
  d.window.close();

  console.log("\n== /?chrome=0 ==");
  d = await abrir(`/?sesion=${s}&chrome=0`);
  check("sin chrome", !q(d, "#header-content-wrapper"));
  check("con contenido", !!q(d, "#body table#votaciones"));
  d.window.close();

  console.log("\n== /cabina ==");
  d = await abrir(`/cabina?sesion=${s}&id=e-01`);
  check("div.objeto", !!q(d, "#body div.objeto h1"));
  const pill = q(d, "#body .objeto div.pill");
  check("pill Abierta verde", pill && pill.className.includes("ok"), pill && pill.className);
  check("2 pestanas principales", qa(d, "#body ul.modulo li").length === 2, qa(d, "#body ul.modulo li").length);
  check("sin Urna en 1er nivel", !qa(d, "#body ul.modulo li").some((li) => li.textContent.includes("Urna")));
  check("8 opciones", qa(d, '#body input[name="opcion"]').length === 8, qa(d, '#body input[name="opcion"]').length);
  check("ninguna premarcada", qa(d, "#body input:checked").length === 0);
  check("boton Votar", !!q(d, "#body a.boton"));
  check("sin estilos inline salvo porcentaje", qa(d, "#body [style]").length === 0, qa(d, "#body [style]").length);
  d.window.close();

  console.log("\n== /cabina (interaccion) ==");
  d = await abrir(`/cabina?sesion=${s}&id=e-01`);
  // Votar sin marcar nada debe producir #merror
  q(d, "#body a.boton").dispatchEvent(new d.window.MouseEvent("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  check("votar sin marcar -> #merror", !!q(d, "#mensajes #merror"), q(d, "#mensajes").innerHTML.slice(0, 50));
  // Marcar una opción y verificar que queda seleccionada
  const radio = q(d, '#body input[name="opcion"]');
  radio.click();
  await new Promise((r) => setTimeout(r, 300));
  check("marcar una opcion funciona", qa(d, "#body input:checked").length === 1, qa(d, "#body input:checked").length);
  d.window.close();

  console.log("\n== /resultados (urna) ==");
  d = await abrir(`/resultados?sesion=${s}&id=e-03&vista=urna`, 2200);
  check("4 subpestanas", qa(d, "#body ul.submodulo li").length === 4, qa(d, "#body ul.submodulo li").length);
  check("sin Eventos", !qa(d, "#body ul.submodulo li").some((li) => li.textContent.includes("Eventos")));
  const sel = q(d, "#body ul.submodulo li.sel");
  check("urna seleccionada", sel && sel.textContent.includes("Urna"), sel && sel.textContent);
  check("SIN ul.modulo vacio", qa(d, "#body ul.modulo").length === 0, qa(d, "#body ul.modulo").length);
  check("table.detalle", !!q(d, "#body table.detalle"));
  check("50 filas", qa(d, "#body table.detalle tbody tr").length === 50, qa(d, "#body table.detalle tbody tr").length);
  // Se lee el primer nodo de texto y no textContent: la celda también
  // contiene el bloque .responsive-data, que se concatena sin espacios.
  const celda = q(d, "#body table.detalle tbody td");
  const codigo = celda && celda.childNodes[0].textContent.trim();
  check("codigo completo (43)", codigo && codigo.length === 43, codigo && codigo.length);
  const desact = q(d, "#body span.boton");
  check("Previo desactivado en pag 1", desact && desact.textContent === "Previo", desact && desact.textContent);
  d.window.close();

  console.log("\n== /resultados?votando=1 ==");
  d = await abrir(`/resultados?sesion=${s}&id=e-01&vista=resultados&votando=1`);
  check("aparecen principales", qa(d, "#body ul.modulo li").length === 2, qa(d, "#body ul.modulo li").length);
  const votar = q(d, "#body ul.modulo a");
  check("Votar -> /cabina", votar && votar.getAttribute("href").startsWith("/cabina"));
  check("votando se preserva en subpestanas", qa(d, "#body ul.submodulo a").every((a) => a.getAttribute("href").includes("votando=1")));
  d.window.close();

  console.log("\n== manejo de errores ==");
  d = await abrir(`/cabina?sesion=token-malo&id=e-01`);
  check("sesion invalida -> #merror", !!q(d, "#mensajes #merror"));
  d.window.close();

  d = await abrir(`/cabina?sesion=${s}`);
  check("sin id -> #merror", !!q(d, "#mensajes #merror"));
  d.window.close();

  d = await abrir(`/encriptado?sesion=${s}&id=e-01`);
  check("encriptado sin papeleta -> #merror", !!q(d, "#mensajes #merror"));
  check("ofrece volver al listado", !!q(d, "#body a.boton"));
  d.window.close();

  console.log(`\n${ok} ok, ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(2);
});
