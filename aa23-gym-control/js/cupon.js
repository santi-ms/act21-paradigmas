/* Valida el código ingresado en la pantalla de compra. */
function validarCupon() {
  "use strict";

  var campo = document.getElementById("codigo-cupon");
  var mensaje = document.getElementById("mensaje-cupon");
  var codigo = campo.value.trim().toUpperCase();

  mensaje.classList.remove("mensaje-error", "mensaje-exito");

  if (codigo === "") {
    mensaje.textContent = "Por favor, ingrese un código";
    mensaje.classList.add("mensaje-error");
  } else if (codigo === "UCP10") {
    mensaje.textContent = "¡Cupón aplicado! Tenés un 10% de descuento";
    mensaje.classList.add("mensaje-exito");
  } else {
    mensaje.textContent = "Código inválido o vencido";
    mensaje.classList.add("mensaje-error");
  }
}

document.getElementById("validar-cupon").addEventListener("click", validarCupon);
