/* Código compartido por todas las páginas: llamadas a la API, token CSRF, sesión y cabecera. */
(() => {
  "use strict";

  const HW = { sesion: null, csrf: null };

  // Llamada a la API. Devuelve { ok, estado, datos }; datos es null si la respuesta no fue JSON.
  async function api(url, opciones = {}) {
    const respuesta = await fetch(url, { credentials: "same-origin", cache: "no-store", ...opciones });
    let datos = null;
    try {
      datos = await respuesta.json();
    } catch {
      // Respuesta sin JSON: por ejemplo, el sitio no se abrió desde un servidor con PHP.
    }
    return { ok: respuesta.ok, estado: respuesta.status, datos };
  }

  // Token CSRF: el servidor lo entrega con la sesión y debe viajar en la cabecera de cada petición que modifica datos.
  async function asegurarToken() {
    if (!HW.csrf) {
      const { ok, datos } = await api("api/csrf.php");
      if (!ok || !datos || !datos.csrf_token) throw new Error("No se pudo obtener el token de seguridad.");
      HW.csrf = datos.csrf_token;
    }
    return HW.csrf;
  }

  // Envía POST / PUT / DELETE con JSON y el token CSRF; si el token venció lo renueva y reintenta una vez.
  async function enviar(url, cuerpo, metodo = "POST", reintento = true) {
    const token = await asegurarToken();
    const opciones = { method: metodo, headers: { "X-CSRF-Token": token } };
    if (cuerpo !== undefined) {
      opciones.headers["Content-Type"] = "application/json";
      opciones.body = JSON.stringify(cuerpo);
    }
    const respuesta = await api(url, opciones);
    const tokenVencido = respuesta.estado === 403 && respuesta.datos &&
      String(respuesta.datos.mensaje || "").startsWith("La solicitud no es válida");
    if (tokenVencido && reintento) {
      HW.csrf = null;
      return enviar(url, cuerpo, metodo, false);
    }
    return respuesta;
  }

  // Crea un elemento con texto seguro: textContent nunca interpreta HTML (previene XSS).
  function crear(etiqueta, texto, clase) {
    const nodo = document.createElement(etiqueta);
    if (texto !== undefined) nodo.textContent = texto;
    if (clase) nodo.className = clase;
    return nodo;
  }

  function mensaje(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = tipo ? `mensaje ${tipo}` : "mensaje";
  }

  // ---- Sesión: se le pregunta al servidor al cargar cada página (endpoint privado api/perfil.php).
  async function cargarSesion() {
    try {
      const { ok, datos } = await api("api/perfil.php");
      if (ok && datos && datos.estado === "exito") {
        HW.sesion = datos.data;
        HW.csrf = datos.csrf_token;
      } else {
        HW.sesion = null;
      }
    } catch {
      HW.sesion = null;
    }
  }

  // La cabecera cambia según la sesión: visitantes ven Ingresar/Registrarme; usuarios, su nombre y Salir.
  function dibujarCabecera() {
    const zona = document.getElementById("nav-usuario");
    const enlaceAdmin = document.getElementById("nav-admin");
    if (enlaceAdmin) enlaceAdmin.hidden = !(HW.sesion && HW.sesion.rol === "admin");
    if (!zona) return;
    zona.replaceChildren();
    if (HW.sesion) {
      zona.append(crear("span", "Hola, ", "saludo"));
      zona.lastChild.append(crear("strong", HW.sesion.nombre));
      const salir = crear("button", "Salir", "boton boton-chico boton-borde");
      salir.type = "button";
      salir.addEventListener("click", cerrarSesion);
      zona.append(salir);
    } else {
      const ingresar = crear("a", "Ingresar", "boton boton-chico boton-borde");
      ingresar.href = "login.html";
      const registrar = crear("a", "Registrarme", "boton boton-chico");
      registrar.href = "registro.html";
      zona.append(ingresar, registrar);
    }
  }

  async function cerrarSesion() {
    try {
      await enviar("api/logout.php", {});
    } catch (error) {
      console.error("No se pudo cerrar la sesión en el servidor:", error);
    }
    HW.sesion = null;
    HW.csrf = null;
    if (document.body.dataset.requiere) {
      location.href = "index.html"; // páginas privadas: se vuelve al inicio
      return;
    }
    dibujarCabecera();
    document.dispatchEvent(new CustomEvent("hw-sesion"));
  }

  HW.api = api;
  HW.enviar = enviar;
  HW.crear = crear;
  HW.mensaje = mensaje;
  HW.dibujarCabecera = dibujarCabecera;
  HW.listo = cargarSesion().then(() => {
    const preparar = () => dibujarCabecera();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", preparar);
    else preparar();
  });
  window.HW = HW;
})();
