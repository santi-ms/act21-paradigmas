/* Página de inicio de sesión: envía las credenciales a api/login.php. */
(() => {
  "use strict";

  const form = document.getElementById("form-login");
  const mensaje = document.getElementById("mensaje");
  const nombre = document.getElementById("nombre");
  const clave = document.getElementById("clave");

  function error(campo, texto) {
    campo.setAttribute("aria-invalid", "true");
    campo.focus();
    HW.mensaje(mensaje, texto, "error");
  }

  form.addEventListener("input", e => e.target.removeAttribute("aria-invalid"));

  // Si ya hay una sesión activa no tiene sentido mostrar el formulario.
  HW.listo.then(() => {
    if (HW.sesion) location.href = "index.html";
  });

  form.addEventListener("submit", async evento => {
    evento.preventDefault();
    const usuario = nombre.value.trim();
    if (usuario === "") return error(nombre, "Ingresá tu nombre de usuario.");
    if (clave.value === "") return error(clave, "Ingresá tu contraseña.");

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    HW.mensaje(mensaje, "Verificando…", "info");
    try {
      const { ok, datos } = await HW.enviar("api/login.php", { nombre: usuario, password: clave.value });
      if (!datos) {
        HW.mensaje(mensaje, "No se pudo conectar con el servidor. Abrí el sitio desde un servidor con PHP y MySQL (XAMPP).", "error");
        return;
      }
      if (!ok || datos.estado !== "exito") {
        clave.value = "";
        // Mensaje genérico: no revela si el usuario existe. También muestra el bloqueo por intentos (429).
        error(clave, datos.mensaje || "Usuario o contraseña incorrectos.");
        return;
      }
      HW.csrf = datos.csrf_token; // el servidor entrega un token nuevo al autenticar
      location.href = datos.usuario.rol === "admin" ? "admin.html" : "index.html";
    } catch (e) {
      console.error(e);
      HW.mensaje(mensaje, "No se pudo conectar con el servidor.", "error");
    } finally {
      boton.disabled = false;
    }
  });
})();
