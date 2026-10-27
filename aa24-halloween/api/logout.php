<?php
// api/logout.php - Cierra la sesión en el servidor y expira la cookie.
require_once __DIR__ . '/../includes/sesion.php';

metodo('POST');
iniciar_sesion_segura();

// Con una sesión activa se exige el token CSRF; si ya no hay sesión (vencida), el cierre es igualmente exitoso.
if (isset($_SESSION['usuario_id'])) {
    exigir_csrf();
}
destruir_sesion();

responder(200, ['estado' => 'exito', 'mensaje' => 'Sesión cerrada correctamente.']);
