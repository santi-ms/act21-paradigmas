<?php
// api/csrf.php - Entrega el token CSRF de la sesión actual (anónima o autenticada).
require_once __DIR__ . '/../includes/sesion.php';

metodo('GET');
iniciar_sesion_segura();
responder(200, ['estado' => 'exito', 'csrf_token' => csrf_token()]);
