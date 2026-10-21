<?php
// api/perfil.php - Servicio privado: identidad del usuario de la sesión actual.
// El frontend lo consulta al cargar cada página para saber si hay sesión activa.
require_once __DIR__ . '/../includes/sesion.php';

metodo('GET');
exigir_sesion(); // responde 401 si no hay sesión

responder(200, [
    'estado'     => 'exito',
    'csrf_token' => csrf_token(),
    'data'       => [
        'id'     => $_SESSION['usuario_id'],
        'nombre' => $_SESSION['usuario_nombre'],
        'email'  => $_SESSION['usuario_email'],
        'rol'    => $_SESSION['usuario_rol'],
    ],
]);
