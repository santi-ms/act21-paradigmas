/* Página principal: lista de disfraces desde la API REST y botón Votar. */
(() => {
  "use strict";

  const lista = document.getElementById("lista");
  const aviso = document.getElementById("aviso");

  const textoVotos = n => `${n} ${n === 1 ? "voto" : "votos"}`;

  function tarjeta(d) {
    const card = HW.crear("article", undefined, "tarjeta");

    // La foto viene de la base de datos (api/foto.php); sin foto se muestra un dibujo por defecto.
    const figura = HW.crear("div", undefined, "foto");
    if (d.tiene_foto) {
      const img = document.createElement("img");
      img.src = `api/foto.php?id=${encodeURIComponent(d.id)}&v=${encodeURIComponent(d.foto_v)}`;
      img.alt = `Disfraz: ${d.nombre}`;
      img.loading = "lazy";
      figura.append(img);
    } else {
      const dibujo = HW.crear("span", "🎃", "sin-foto");
      dibujo.setAttribute("aria-hidden", "true");
      figura.append(dibujo);
    }

    // Nombre y descripción siempre con textContent (previene XSS).
    const cuerpo = HW.crear("div", undefined, "cuerpo");
    cuerpo.append(HW.crear("h3", d.nombre), HW.crear("p", d.descripcion, "descripcion"));

    const pie = HW.crear("div", undefined, "pie-tarjeta");
    const votos = HW.crear("span", textoVotos(d.votos), "votos");
    const boton = HW.crear("button", d.ya_voto ? "Ya votaste ✔" : "Votar", "boton");
    boton.type = "button";
    boton.disabled = d.ya_voto;
    boton.addEventListener("click", () => votar(d, boton, votos));
    pie.append(votos, boton);

    card.append(figura, cuerpo, pie);
    return card;
  }

  async function votar(d, boton, votos) {
    if (!HW.sesion) {
      // Solo los usuarios registrados votan: se los lleva a iniciar sesión.
      HW.mensaje(aviso, "Iniciá sesión para votar. Te llevamos al ingreso…", "info");
      setTimeout(() => { location.href = "login.html"; }, 1200);
      return;
    }
    boton.disabled = true;
    try {
      const { ok, estado, datos } = await HW.enviar("api/votar.php", { id_disfraz: d.id });
      if (ok && datos && datos.estado === "exito") {
        votos.textContent = textoVotos(datos.votos);
        boton.textContent = "Ya votaste ✔";
        HW.mensaje(aviso, "¡Voto registrado! Gracias por participar.", "exito");
      } else if (estado === 409) {
        boton.textContent = "Ya votaste ✔";
        HW.mensaje(aviso, datos.mensaje, "info");
      } else if (estado === 401) {
        HW.sesion = null;
        HW.dibujarCabecera();
        boton.disabled = false;
        HW.mensaje(aviso, "Tu sesión expiró. Iniciá sesión para votar.", "error");
      } else {
        boton.disabled = false;
        HW.mensaje(aviso, (datos && datos.mensaje) || "No se pudo registrar el voto.", "error");
      }
    } catch (error) {
      console.error(error);
      boton.disabled = false;
      HW.mensaje(aviso, "No se pudo conectar con el servidor.", "error");
    }
  }

  async function cargar() {
    HW.mensaje(aviso, "Cargando disfraces…", "info");
    try {
      const { ok, datos } = await HW.api("api/disfraces.php");
      if (!ok || !datos || datos.estado !== "exito") throw new Error("Respuesta inválida");
      lista.replaceChildren();
      if (datos.data.length === 0) {
        HW.mensaje(aviso, "Todavía no hay disfraces. ¡Volvé pronto!", "info");
        return;
      }
      datos.data.forEach(d => lista.append(tarjeta(d)));
      HW.mensaje(aviso, "", "");
    } catch (error) {
      console.error(error);
      HW.mensaje(aviso, "No se pudieron cargar los disfraces. Abrí el sitio desde un servidor con PHP y MySQL (XAMPP).", "error");
    }
  }

  // Si se cierra sesión en esta página, se vuelve a pedir la lista para actualizar los botones de voto.
  document.addEventListener("hw-sesion", cargar);
  HW.listo.then(cargar);
})();
