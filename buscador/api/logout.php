<?php
// api/logout.php - Cierra la sesión en el servidor y borra la cookie
header('Content-Type: application/json; charset=utf-8');
require_once '../includes/sesion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

iniciar_sesion_segura();
$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}

session_destroy();

http_response_code(200);
echo json_encode(['estado' => 'exito', 'mensaje' => 'Sesión cerrada correctamente.']);
