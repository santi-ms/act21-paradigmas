<?php
// api/perfil.php - Servicio privado: devuelve los datos del usuario de la sesión actual
require_once '../includes/sesion.php';

exigir_sesion(); // responde 401 si no hay sesión

http_response_code(200);
echo json_encode([
    'estado' => 'exito',
    'data'   => [
        'id'     => $_SESSION['usuario_id'],
        'nombre' => $_SESSION['usuario_nombre'],
        'email'  => $_SESSION['usuario_email'],
        'rol'    => $_SESSION['usuario_rol'],
    ],
], JSON_UNESCAPED_UNICODE);
