/* Administración: CRUD de disfraces mediante la API REST (GET, POST, PUT y DELETE). */
(() => {
  "use strict";

  const FOTO_MAX = 1048576; // 1 MB, igual que en el servidor
  const TIPOS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  const panel = document.getElementById("panel");
  const sinAcceso = document.getElementById("sin-acceso");
  const textoSinAcceso = document.getElementById("texto-sin-acceso");
  const mensaje = document.getElementById("mensaje");
  const form = document.getElementById("form-disfraz");
  const titulo = document.getElementById("titulo-form");
  const nombre = document.getElementById("nombre");
  const descripcion = document.getElementById("descripcion");
  const foto = document.getElementById("foto");
  const vistaPrevia = document.getElementById("vista-previa");
  const quitar = document.getElementById("quitar");
  const quitarFoto = document.getElementById("quitar-foto");
  const cancelar = document.getElementById("cancelar");
  const guardar = document.getElementById("guardar");
  const tabla = document.getElementById("tabla");

  let editandoId = null;     // null = alta; número = modificación
  let fotoBase64 = null;     // imagen elegida, ya codificada
  let disfraces = [];

  // ---- Lectura de la imagen elegida: se muestra una vista previa y se prepara para enviarla.
  foto.addEventListener("change", () => {
    fotoBase64 = null;
    vistaPrevia.replaceChildren();
    vistaPrevia.hidden = true;
    const archivo = foto.files[0];
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) {
      foto.value = "";
      HW.mensaje(mensaje, "Formato no permitido. Usá JPG, PNG, GIF o WebP.", "error");
      return;
    }
    if (archivo.size > FOTO_MAX) {
      foto.value = "";
      HW.mensaje(mensaje, "La imagen supera el máximo de 1 MB.", "error");
      return;
    }
    const lector = new FileReader();
    lector.addEventListener("load", () => {
      const resultado = String(lector.result);
      fotoBase64 = resultado.slice(resultado.indexOf(",") + 1); // solo la parte base64
      const img = document.createElement("img");
      img.src = resultado;
      img.alt = "Vista previa de la foto elegida";
      vistaPrevia.append(img);
      vistaPrevia.hidden = false;
      quitarFoto.checked = false;
    });
    lector.readAsDataURL(archivo);
  });

  // ---- Lista (GET).
  function miniatura(d) {
    const celda = document.createElement("td");
    if (d.tiene_foto) {
      const img = document.createElement("img");
      img.src = `api/foto.php?id=${encodeURIComponent(d.id)}&v=${encodeURIComponent(d.foto_v)}`;
      img.alt = `Foto de ${d.nombre}`;
      img.className = "miniatura";
      celda.append(img);
    } else {
      celda.append(HW.crear("span", "🎃", "sin-foto-chica"));
    }
    return celda;
  }

  function dibujarTabla() {
    tabla.replaceChildren();
    if (disfraces.length === 0) {
      const fila = document.createElement("tr");
      const celda = HW.crear("td", "No hay disfraces cargados todavía.");
      celda.colSpan = 5;
      fila.append(celda);
      tabla.append(fila);
      return;
    }
    disfraces.forEach(d => {
      const fila = document.createElement("tr");
      const resumen = d.descripcion.length > 90 ? d.descripcion.slice(0, 90) + "…" : d.descripcion;
      const acciones = HW.crear("td", undefined, "celda-acciones");
      const editar = HW.crear("button", "Editar", "boton boton-chico boton-borde");
      editar.type = "button";
      editar.addEventListener("click", () => empezarEdicion(d));
      const borrar = HW.crear("button", "Eliminar", "boton boton-chico boton-peligro");
      borrar.type = "button";
      borrar.addEventListener("click", () => eliminar(d));
      acciones.append(editar, borrar);
      fila.append(miniatura(d), HW.crear("td", d.nombre), HW.crear("td", resumen), HW.crear("td", String(d.votos)), acciones);
      tabla.append(fila);
    });
  }

  async function cargar() {
    try {
      const { ok, datos } = await HW.api("api/disfraces.php");
      if (!ok || !datos || datos.estado !== "exito") throw new Error("Respuesta inválida");
      disfraces = datos.data;
      dibujarTabla();
    } catch (error) {
      console.error(error);
      HW.mensaje(mensaje, "No se pudo cargar la lista de disfraces.", "error");
    }
  }

  // ---- Alta (POST) y modificación (PUT).
  function limpiarForm() {
    editandoId = null;
    fotoBase64 = null;
    form.reset();
    vistaPrevia.replaceChildren();
    vistaPrevia.hidden = true;
    quitar.hidden = true;
    cancelar.hidden = true;
    titulo.textContent = "Nuevo disfraz";
    guardar.textContent = "Guardar disfraz";
  }

  function empezarEdicion(d) {
    limpiarForm();
    editandoId = d.id;
    nombre.value = d.nombre;
    descripcion.value = d.descripcion;
    quitar.hidden = !d.tiene_foto;
    cancelar.hidden = false;
    titulo.textContent = `Editando: ${d.nombre}`;
    guardar.textContent = "Guardar cambios";
    nombre.focus();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  cancelar.addEventListener("click", () => {
    limpiarForm();
    HW.mensaje(mensaje, "", "");
  });

  // Traduce los errores de la API: 401 / 403 significan que ya no hay permiso para administrar.
  function manejarPermisos(estado) {
    if (estado === 401 || estado === 403) {
      panel.hidden = true;
      sinAcceso.hidden = false;
      textoSinAcceso.textContent = estado === 401
        ? "Tu sesión expiró. Iniciá sesión de nuevo."
        : "Tu usuario no tiene permiso para administrar los disfraces.";
      return true;
    }
    return false;
  }

  form.addEventListener("submit", async evento => {
    evento.preventDefault();
    const datos = { nombre: nombre.value.trim(), descripcion: descripcion.value.trim() };
    if (datos.nombre === "" || datos.descripcion === "") {
      HW.mensaje(mensaje, "El nombre y la descripción son obligatorios.", "error");
      return;
    }
    if (fotoBase64) datos.foto_base64 = fotoBase64;
    if (editandoId && quitarFoto.checked) datos.quitar_foto = true;

    guardar.disabled = true;
    HW.mensaje(mensaje, "Guardando…", "info");
    try {
      const respuesta = editandoId
        ? await HW.enviar(`api/disfraces.php?id=${editandoId}`, datos, "PUT")
        : await HW.enviar("api/disfraces.php", datos, "POST");
      if (manejarPermisos(respuesta.estado)) return;
      if (!respuesta.ok) {
        HW.mensaje(mensaje, (respuesta.datos && respuesta.datos.mensaje) || "No se pudo guardar el disfraz.", "error");
        return;
      }
      HW.mensaje(mensaje, respuesta.datos.mensaje, "exito");
      limpiarForm();
      await cargar();
    } catch (error) {
      console.error(error);
      HW.mensaje(mensaje, "No se pudo conectar con el servidor.", "error");
    } finally {
      guardar.disabled = false;
    }
  });

  // ---- Baja (DELETE, borrado lógico).
  async function eliminar(d) {
    if (!window.confirm(`¿Eliminar el disfraz "${d.nombre}"? Dejará de mostrarse en el concurso.`)) return;
    try {
      const respuesta = await HW.enviar(`api/disfraces.php?id=${d.id}`, undefined, "DELETE");
      if (manejarPermisos(respuesta.estado)) return;
      if (!respuesta.ok) {
        HW.mensaje(mensaje, (respuesta.datos && respuesta.datos.mensaje) || "No se pudo eliminar el disfraz.", "error");
        return;
      }
      if (editandoId === d.id) limpiarForm();
      HW.mensaje(mensaje, respuesta.datos.mensaje, "exito");
      await cargar();
    } catch (error) {
      console.error(error);
      HW.mensaje(mensaje, "No se pudo conectar con el servidor.", "error");
    }
  }

  // ---- Acceso: solo el administrador ve el panel (el servidor valida cada operación de todos modos).
  HW.listo.then(() => {
    if (!HW.sesion) {
      sinAcceso.hidden = false;
      textoSinAcceso.textContent = "Esta página es solo para administradores. Iniciá sesión para continuar.";
      return;
    }
    if (HW.sesion.rol !== "admin") {
      sinAcceso.hidden = false;
      textoSinAcceso.textContent = "Tu usuario no tiene permiso para administrar los disfraces.";
      return;
    }
    panel.hidden = false;
    cargar();
  });
})();
