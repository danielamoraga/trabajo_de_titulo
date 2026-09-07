/**
 * Chrome de UCampus — SOLO DESARROLLO Y PRESENTACIÓN.
 *
 * El Servicio Externo real NO produce nada de esto: header, menú lateral
 * y footer los renderiza UCampus por fuera del iframe, y el módulo solo
 * entrega el contenido de #body.
 *
 * Existe para mostrar el módulo en su contexto en el informe y en las
 * sesiones de validación, y para probar los cuatro temas sin depender
 * del ticket. Con ?chrome=0 se ve exactamente lo que produce el servicio.
 *
 * Se monta con innerHTML y fuera de React a propósito: es markup ajeno,
 * estático, que React no debe controlar ni re-renderizar. React se monta
 * después dentro de #body.
 *
 * Ni kernel.js ni jQuery están disponibles en el iframe, así que el
 * comportamiento del menú y del footer está reimplementado (D-024).
 */

import { conChrome, ruta, tema } from "../api/sesion";

const ARRIBA = `<div id="header-content-wrapper">

<h1 id="header" role="heading"><a href="#"><span>Ucampus Uchile :: </span></a></h1>

<h2 id="titulo">Ucampus Uchile</h2>

<a id="toggler" href="#" aria-label="Abrir y Cerrar el Menú"></a>

<div id="content-wrapper">

<div id="menu">

<ul id="contenedor_opciones">

  <li class="pwa only-movil">
    <a href="#" class="permalink"><i class="fa-regular fa-share-nodes"></i> <span class="tooltip">Compartir</span></a>
    <a href="#"><i class="fa-regular fa-rotate-right"></i> <span class="tooltip">Recargar</span></a>
  </li>

  <li id="widget_perfil" class="usuario">
    <a class="perfil" href="#">
      <h1><img src="https://ucampus.uchile.cl/d/images/servicios/defecto_v34708.png" class="photo foto chica" alt="Foto de persona"> Usuario Votante</h1>
    </a>
  </li>

  <li class="contact">
    <a href="#" class="contactar"><span>Contacto</span></a>
  </li>

  <li class="logout">
    <a href="#" class="salir"><span>Salir</span></a>
  </li>

</ul>

<div id="modulos" class=" ">

  <div id="favoritos" class="pinned">
    <h1>Favoritos</h1>
    <ul id="favs">
      <li class="fcfm_bia ">
        <a href="#"><h1><img src="https://ucampus.uchile.cl/d/images/servicios/bia_v34708.svg" alt="" class="icono"> Boletines - FCFM</h1></a>
      </li>
      <li class="fcfm_ia ">
        <a href="#"><h1><img src="https://ucampus.uchile.cl/d/images/servicios/defecto_v34708.png" alt="" class="icono"> Inscripción Académica - FCFM</h1></a>
      </li>
      <li class="fcfm_titulacion2 ">
        <a href="#"><h1><img src="https://ucampus.uchile.cl/d/images/servicios/defecto_v34708.png" alt="" class="icono"> Títulos y Grados - FCFM</h1></a>
      </li>
      <!--
        El icono del módulo NO lo controla el servicio externo: el menú
        lateral lo renderiza UCampus. En producción hay que entregarle
        el SVG al equipo de UCampus como parte del registro del módulo.
        Esto es requisito operativo, no de código.
      -->
      <li class="uparticipa sel">
        <a href="mock-completo.html"><h1><img src="uparticipa.png" alt="" class="icono"> UParticipa</h1></a>
      </li>
      <li class="uchile_votaciones ">
        <a href="#"><h1><img src="https://ucampus.uchile.cl/d/images/servicios/defecto_v34708.png" alt="" class="icono"> Votaciones</h1></a>
      </li>
      <li class="fcfm_votaciones ">
        <a href="#"><h1><img src="https://ucampus.uchile.cl/d/images/servicios/votaciones_v34708.svg" alt="" class="icono"> Votaciones - FCFM</h1></a>
      </li>
    </ul>
  </div>

  <div id="servicios" class="pinned active">
    <h1>Servicios</h1>
    <ul>
      <li id="forms" class=" forms"><a href="#">Formularios</a></li>
      <li id="visor_repositorio_normativo" class=" visor_repositorio_normativo"><a href="#">Repositorio Normativo Contraloría Universitaria</a></li>
      <li id="uparticipa" class="sel uparticipa"><a href="mock-completo.html">UParticipa</a></li>
      <li id="uchile_votaciones" class=" uchile_votaciones"><a href="#">Votaciones</a></li>
      <li id="workflow" class=" workflow"><a href="#">Workflow</a></li>
    </ul>
  </div>

  <div id="fcfm" class="bloque active">
    <h1><a href="#" class="toggle" data-bloque="fcfm">FCFM</a></h1>
    <ul>
      <li id="fcfm_bia" class=" fcfm_bia"><a href="#">Boletines</a></li>
      <li id="fcfm_bolsa_trabajo" class=" fcfm_bolsa_trabajo"><a href="#">Bolsa de Empleos</a></li>
      <li id="fcfm_catalogo" class=" fcfm_catalogo"><a href="#">Catálogo de Cursos</a></li>
      <li id="fcfm_certificados2" class=" fcfm_certificados2"><a href="#">Certificados</a></li>
      <li id="fcfm_ext_certificados" class=" fcfm_ext_certificados"><a href="#">Certificados Complementarios</a></li>
      <li id="concursos" class=" concursos"><a href="#">Concursos Estudiantiles</a></li>
      <li id="fcfm_actas_consejo_escuela" class=" fcfm_actas_consejo_escuela"><a href="#">Consejos de Escuela</a></li>
      <li id="fcfm_actas_consejo" class=" fcfm_actas_consejo"><a href="#">Consejos de Facultad</a></li>
      <li id="fcfm_encuestas_acreditacion" class=" fcfm_encuestas_acreditacion"><a href="#">Encuestas Acreditación</a></li>
      <li id="fcfm_encuestas" class=" fcfm_encuestas"><a href="#">Encuestas Docentes</a></li>
      <li id="fcfm_eventos" class=" fcfm_eventos"><a href="#">Eventos</a></li>
      <li id="fcfm_formulario_visitas" class=" fcfm_formulario_visitas"><a href="#">Formulario Visitas</a></li>
      <li id="fcfm_grupos_organizados" class=" fcfm_grupos_organizados"><a href="#">Grupos Organizados</a></li>
      <li id="fcfm_ia" class=" fcfm_ia"><a href="#">Inscripción Académica</a></li>
      <li id="fcfm_memorias" class=" fcfm_memorias"><a href="#">Memorias y Trabajos de Título</a></li>
      <li id="fcfm_intercambio" class=" fcfm_intercambio"><a href="#">Movilidad Internacional</a></li>
      <li id="fcfm_postulaciones" class=" fcfm_postulaciones"><a href="#">Postulaciones Docentes</a></li>
      <li id="fcfm_practicas" class=" fcfm_practicas"><a href="#">Prácticas</a></li>
      <li id="fcfm_programas_cursos" class=" fcfm_programas_cursos"><a href="#">Programas de Cursos</a></li>
      <li id="fcfm_reservas" class=" fcfm_reservas"><a href="#">Reserva de Espacios</a></li>
      <li id="fcfm_semestre_verano" class=" fcfm_semestre_verano"><a href="#">Semestre de Verano</a></li>
      <li id="fcfm_titulacion2" class=" fcfm_titulacion2"><a href="#">Títulos y Grados</a></li>
      <li id="fcfm_unidades_becarias" class=" fcfm_unidades_becarias"><a href="#">Unidades Becarias</a></li>
      <li id="fcfm_votaciones" class=" fcfm_votaciones"><a href="#">Votaciones</a></li>
    </ul>
  </div>

  <div id="otros_catalogos" class="bloque ">
    <h1><a href="#" class="toggle" data-bloque="otros_catalogos">Otros Catálogos</a></h1>
    <ul>
      <li id="artes_catalogo" class=" artes_catalogo"><a href="#">Artes</a></li>
      <li id="bachillerato_catalogo" class=" bachillerato_catalogo"><a href="#">Bachillerato</a></li>
      <li id="ciencias_catalogo" class=" ciencias_catalogo"><a href="#">Ciencias</a></li>
      <li id="agronomia_catalogo" class=" agronomia_catalogo"><a href="#">Ciencias Agronómicas</a></li>
      <li id="rrii_catalogo" class=" rrii_catalogo"><a href="#">DRI</a></li>
      <li id="derecho_catalogo" class=" derecho_catalogo"><a href="#">Derecho</a></li>
      <li id="facso_catalogo" class=" facso_catalogo"><a href="#">FACSO</a></li>
      <li id="fau_catalogo" class=" fau_catalogo"><a href="#">FAU</a></li>
      <li id="icei_catalogo" class=" icei_catalogo"><a href="#">FCEI</a></li>
      <li id="filosofia_catalogo" class=" filosofia_catalogo"><a href="#">Filosofía</a></li>
      <li id="forestal_catalogo" class=" forestal_catalogo"><a href="#">Forestal</a></li>
      <li id="inap_catalogo" class=" inap_catalogo"><a href="#">Gobierno</a></li>
      <li id="iei_catalogo" class=" iei_catalogo"><a href="#">IEI</a></li>
      <li id="inta_catalogo" class=" inta_catalogo"><a href="#">INTA</a></li>
      <li id="ie_catalogo" class=" ie_catalogo"><a href="#">Instituto de Educación</a></li>
      <li id="medicina_catalogo" class=" medicina_catalogo"><a href="#">Medicina</a></li>
      <li id="odontologia_catalogo" class=" odontologia_catalogo"><a href="#">Odontología</a></li>
      <li id="faciqyf_catalogo" class=" faciqyf_catalogo"><a href="#">QyF</a></li>
      <li id="veterinaria_catalogo" class=" veterinaria_catalogo"><a href="#">Veterinaria</a></li>
    </ul>
  </div>

</div><!-- /#modulos -->
</div><!-- /#menu -->

<div id="navigation-wrapper">

<div id="navigation" class="">

<h1 class="modulo">UParticipa</h1>

<ul id="navbar">
  <li>UParticipa</li>
</ul>

`;

const ABAJO = `</div><!-- /#navigation -->

<div id="footer" role="contentinfo">

<ul>
  <li class="conf theme"><a href="#" data-conf="theme"><i class="fa-regular fa-paint-roller"></i> Tema</a>
    <ul class="themes">
      <li class="sel" data-theme="focus"><a href="?theme=focus">Focus</a></li>
      <li data-theme="focus-dark"><a href="?theme=focus-dark">Focus Dark</a></li>
      <li data-theme="classic"><a href="?theme=classic">Claro</a></li>
      <li data-theme="classic-dark"><a href="?theme=classic-dark">Oscuro</a></li>
    </ul>
  </li>
  <li class="conf lang"><a href="#" data-conf="lang"><i class="fa-regular fa-language"></i> Idioma</a>
    <ul class="langs">
      <li class="sel"><a href="?lang=es">Español</a></li>
      <li><a href="?lang=en">English</a></li>
    </ul>
  </li>
</ul>

<ul>
  <li class="guia_telefonica"><a href="#">Guía Telefónica</a></li>
  <li><a href="#">Políticas de Uso</a></li>
  <li><a href="#">Privacidad</a></li>
  <li><a href="#"><i class="fa-regular fa-universal-access"></i> Accesibilidad</a></li>
  <li class="brand"><a href="#" id="ucampus" target="_blank"><span>Centro Tecnológico Ucampus</span></a></li>
</ul>

</div><!-- /#footer -->

</div><!-- /#navigation-wrapper -->
</div><!-- /#content-wrapper -->
</div><!-- /#header-content-wrapper -->`;

export interface Miga {
  texto: string;
  href?: string;
}

function urlConTema(t: string): string {
  const q = new URLSearchParams(window.location.search);
  q.set("theme", t);
  return "?" + q.toString();
}

/**
 * Inyecta la hoja institucional.
 *
 * En producción la URL viene en el campo "css" del ticket. Acá se
 * construye a partir del tema únicamente para poder probarlos; la
 * versión (34708) cambia con cada release de UCampus, así que armar
 * esta URL a mano es deuda técnica.
 */
function cargarEstilos(): void {
  const q = new URLSearchParams(window.location.search);
  const version = q.get("v") ?? "34708";
  const css =
    q.get("css") ??
    `https://ucampus.uchile.cl/d/css/${tema()}.style_v${version}.css`;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.media = "all";
  link.href = css;
  document.head.appendChild(link);
}

/**
 * Prepara el documento y devuelve el nodo donde React debe montarse.
 *
 * Con chrome, ese nodo es el #body institucional; sin chrome, un #body
 * mínimo. La aplicación no necesita saber cuál de los dos está activo.
 */
export function montar(): HTMLElement {
  cargarEstilos();

  const t = tema();
  const clases = `fcfm uparticipa ${t}`;

  if (!conChrome()) {
    document.body.innerHTML =
      `<div id="mensajes" role="status"></div>` +
      `<div id="body" role="main" class="${clases}"></div>`;
    return document.getElementById("body") as HTMLElement;
  }

  document.documentElement.className =
    "js no-touch cssanimations csstransforms csstransitions fontface " +
    "generatedcontent svg inlinesvg";
  document.body.className = "logeado";
  document.body.dataset["dev"] = "logeado";

  document.body.innerHTML =
    ARRIBA +
    `<h1 class="modulo">UParticipa</h1>` +
    `<ul id="navbar"></ul>` +
    `<div id="mensajes" role="status"></div>` +
    `<div id="body" role="main" class="${clases}"></div>` +
    ABAJO;

  // ---- comportamiento que en UCampus resuelve kernel.js ----

  document.querySelectorAll("#footer .themes li").forEach((li) => {
    const el = li as HTMLElement;
    const suTema = el.dataset["theme"];
    el.classList.toggle("sel", suTema === t);
    const a = el.querySelector("a");
    if (a && suTema) a.setAttribute("href", urlConTema(suTema));
  });

  // Desplegar bloques del menú (kernel.menuToggle).
  document.querySelectorAll("#menu .toggle").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = (a as HTMLElement).dataset["bloque"];
      if (id) document.getElementById(id)?.classList.toggle("active");
    });
  });

  // Submenús de tema e idioma del footer.
  document.querySelectorAll("#footer .conf > a").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      (a.parentNode as HTMLElement).classList.toggle("active");
    });
  });

  // Toggle del menú (kernel.toggler): la clase "active" aparece
  // simultáneamente en los cuatro contenedores.
  document.getElementById("toggler")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    for (const id of ["toggler", "menu", "navigation-wrapper", "navigation"]) {
      document.getElementById(id)?.classList.toggle("active");
    }
  });

  // "UParticipa" del menú lateral siempre lleva al listado.
  const alListado = ruta("/");
  document
    .querySelectorAll("#favs li.uparticipa a, #servicios li#uparticipa a")
    .forEach((a) => a.setAttribute("href", alListado));

  return document.getElementById("body") as HTMLElement;
}

/**
 * Actualiza el breadcrumb (#navbar), que vive fuera del árbol de React.
 */
export function migas(items: Miga[]): void {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;
  navbar.innerHTML = items
    .map((m) =>
      m.href
        ? `<li><a href="${m.href}">${m.texto}</a></li>`
        : `<li>${m.texto}</li>`
    )
    .join("");
}