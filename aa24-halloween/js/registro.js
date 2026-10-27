/* Página de registro: valida en el navegador y envía el alta a api/registro.php. */
(() => {
  "use strict";

  const form = document.getElementById("form-registro");
  const mensaje = document.getElementById("mensaje");
  const nombre = document.getElementById("nombre");
  const clave = document.getElementById("clave");
  const repetir = document.getElementById("repetir");

  const usuarioValido = /^[\p{L}\p{N}._-]{3,50}$/u;

  function error(campo, texto) {
    campo.setAttribute("aria-invalid", "true");
    campo.focus();
    HW.mensaje(mensaje, texto, "error");
  }

  form.addEventListener("input", e => e.target.removeAttribute("aria-invalid"));

  form.addEventListener("submit", async evento => {
    evento.preventDefault();
    const usuario = nombre.value.trim();
    const password = clave.value;

    // El servidor valida de nuevo: esta validación solo mejora la experiencia.
    if (!usuarioValido.test(usuario)) return error(nombre, "El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion o guion bajo.");
    if (password.length < 10) return error(clave, "La contraseña debe tener al menos 10 caracteres.");
    if (password !== repetir.value) return error(repetir, "Las contraseñas no coinciden.");

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    HW.mensaje(mensaje, "Creando tu cuenta…", "info");
    try {
      const alta = await HW.enviar("api/registro.php", { nombre: usuario, password });
      if (!alta.datos) {
        HW.mensaje(mensaje, "No se pudo conectar con el servidor. Abrí el sitio desde un servidor con PHP y MySQL (XAMPP).", "error");
        return;
      }
      if (!alta.ok) {
        HW.mensaje(mensaje, alta.datos.mensaje || "No se pudo crear la cuenta.", "error");
        return;
      }
      // Cuenta creada: se inicia sesión con las mismas credenciales y se vuelve al inicio.
      const login = await HW.enviar("api/login.php", { nombre: usuario, password });
      if (login.ok && login.datos.estado === "exito") {
        HW.csrf = login.datos.csrf_token;
        location.href = "index.html";
      } else {
        location.href = "login.html";
      }
    } catch (e) {
      console.error(e);
      HW.mensaje(mensaje, "No se pudo conectar con el servidor.", "error");
    } finally {
      boton.disabled = false;
    }
  });
})();
