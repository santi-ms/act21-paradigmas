/*
  Gym Control | Parte B - AE2
  Captura en tiempo real el cambio del campo de cantidad (<input type="number">)
  y muestra el subtotal a abonar en pantalla, sin refrescar la página.
*/
(function () {
  "use strict";

  var cantidad = document.getElementById("cantidad");
  var planes = document.querySelectorAll('input[name="plan"]');

  var salidaPlan = document.getElementById("detalle-plan");
  var salidaPrecio = document.getElementById("detalle-precio");
  var salidaCantidad = document.getElementById("detalle-cantidad");
  var salidaSubtotal = document.getElementById("subtotal");
  var estado = document.getElementById("subtotal-estado");

  if (!cantidad || !salidaSubtotal) {
    return;
  }

  var moneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  // Devuelve el radio de plan tildado, o null si todavía no eligieron ninguno.
  function planElegido() {
    for (var i = 0; i < planes.length; i++) {
      if (planes[i].checked) {
        return planes[i];
      }
    }
    return null;
  }

  // Normaliza lo tipeado en el campo numérico al rango permitido.
  function cantidadValida() {
    var minimo = Number(cantidad.min) || 1;
    var maximo = Number(cantidad.max) || Infinity;
    var valor = parseInt(cantidad.value, 10);

    if (isNaN(valor)) {
      return { numero: 0, aviso: "Ingresá una cantidad para calcular el subtotal." };
    }
    if (valor < minimo) {
      return { numero: 0, aviso: "La cantidad mínima es " + minimo + "." };
    }
    if (valor > maximo) {
      return { numero: maximo, aviso: "La cantidad máxima es " + maximo + ", se calculó con ese tope." };
    }
    return { numero: valor, aviso: "" };
  }

  function actualizarSubtotal() {
    var plan = planElegido();
    var control = cantidadValida();

    var nombre = plan ? plan.parentElement.querySelector("strong").textContent : "Sin seleccionar";
    var precio = plan ? Number(plan.dataset.precio) : 0;
    var subtotal = precio * control.numero;

    salidaPlan.textContent = nombre;
    salidaPrecio.textContent = moneda.format(precio);
    salidaCantidad.textContent = control.numero;
    salidaSubtotal.textContent = moneda.format(subtotal);

    if (!plan) {
      estado.textContent = "Elegí un plan para ver el subtotal.";
    } else if (control.aviso) {
      estado.textContent = control.aviso;
    } else {
      estado.textContent =
        control.numero + " x " + moneda.format(precio) + " = " + moneda.format(subtotal) + ".";
    }
  }

  // "input" dispara con cada tecla y con las flechitas del spinner: tiempo real.
  cantidad.addEventListener("input", actualizarSubtotal);
  // "change" cubre el caso de salir del campo con un valor fuera de rango.
  cantidad.addEventListener("change", actualizarSubtotal);

  for (var i = 0; i < planes.length; i++) {
    planes[i].addEventListener("change", actualizarSubtotal);
  }

  actualizarSubtotal();
})();
