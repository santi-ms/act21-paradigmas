<?php
// Sesión segura compartida por todos los endpoints: cookie endurecida, vencimientos y token CSRF.
require_once __DIR__ . '/api.php';

// Tiempos en segundos; se pueden ajustar con variables de entorno (útil para pruebas).
function sesion_inactividad(): int { return (int) (getenv('GYM_SESION_INACTIVIDAD') ?: 1800); } // 30 min sin actividad
function sesion_maxima(): int      { return (int) (getenv('GYM_SESION_MAXIMA') ?: 28800); }     // 8 h desde el login

function iniciar_sesion_segura(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');  // rechaza identificadores de sesión que el servidor no creó
    ini_set('session.use_only_cookies', '1'); // el ID nunca viaja en la URL
    ini_set('session.use_trans_sid', '0');
    session_cache_limiter('');                // conserva el Cache-Control: no-store de la API

    session_set_cookie_params([
        'lifetime' => 0,                         // la cookie vive hasta cerrar el navegador
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']), // solo por HTTPS cuando esté disponible
        'httponly' => true,                      // JavaScript no puede leer la cookie (mitiga robo por XSS)
        'samesite' => 'Strict',                  // no se envía desde otros sitios (mitiga CSRF)
    ]);
    session_start();

    // Vencimiento por inactividad y tope absoluto: la sesión vencida se descarta y se renueva el ID.
    if (isset($_SESSION['usuario_id'])) {
        $ahora = time();
        $vencida = $ahora - ($_SESSION['ultima_actividad'] ?? 0) > sesion_inactividad()
                || $ahora - ($_SESSION['inicio_sesion'] ?? 0) > sesion_maxima();
        if ($vencida) {
            $_SESSION = [];
            session_regenerate_id(true);
        } else {
            $_SESSION['ultima_actividad'] = $ahora;
        }
    }
}

// Cierra la sesión por completo: vacía los datos, expira la cookie y destruye la sesión en el servidor.
function destruir_sesion(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $p['path'],
            'secure'   => $p['secure'],
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }
    session_destroy();
}

// ---- CSRF: token aleatorio por sesión, enviado por el frontend en la cabecera X-CSRF-Token.
function csrf_token(): string
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function rotar_csrf(): string
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function exigir_csrf(): void
{
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!isset($_SESSION['csrf_token']) || !is_string($enviado) || !hash_equals($_SESSION['csrf_token'], $enviado)) {
        responder_error(403, 'La solicitud no es válida. Recargá la página e intentá de nuevo.');
    }
}

// Guardián de sesión: corta la ejecución con 401 si no hay un usuario autenticado.
function exigir_sesion(): void
{
    iniciar_sesion_segura();
    if (!isset($_SESSION['usuario_id'])) {
        responder_error(401, 'Acceso no autorizado. Iniciá sesión.');
    }
}
