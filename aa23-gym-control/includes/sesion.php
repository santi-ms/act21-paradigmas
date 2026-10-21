<?php
// Funciones compartidas de sesión: todos los endpoints usan la misma configuración de cookie.

function iniciar_sesion_segura(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'lifetime' => 0,                         // la cookie vive hasta cerrar el navegador
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']), // solo por HTTPS cuando esté disponible
        'httponly' => true,                      // JavaScript no puede leer la cookie (mitiga robo por XSS)
        'samesite' => 'Strict',                  // no se envía desde otros sitios (mitiga CSRF)
    ]);
    session_start();
}

// Guardián de sesión: corta la ejecución con 401 si no hay un usuario autenticado.
function exigir_sesion(): void
{
    header('Content-Type: application/json; charset=utf-8');
    iniciar_sesion_segura();

    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401); // Unauthorized
        echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
        exit;
    }
}
