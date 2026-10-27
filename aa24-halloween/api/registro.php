<?php
// api/registro.php - Alta de usuarios: CSRF + límite de intentos + validación + BCRYPT + consulta preparada.
require_once __DIR__ . '/../includes/sesion.php';
require_once __DIR__ . '/../includes/limites.php';
require_once __DIR__ . '/../includes/claves.php';
require_once __DIR__ . '/../config/conexion.php';

metodo('POST');
iniciar_sesion_segura();
exigir_csrf();

// Máximo 10 altas por IP cada 15 minutos (cada petición cuenta, sea válida o no).
$claveIp = clave_limite('registro:ip', ip_cliente());
if (limite_alcanzado($pdo, $claveIp, 10)) {
    responder_demasiados_intentos();
}
registrar_intento($pdo, $claveIp);

$input    = cuerpoJSON();
$nombre   = texto($input, 'nombre');
$password = isset($input['password']) && is_string($input['password']) ? $input['password'] : '';

// El servidor valida de nuevo: nunca se confía en la validación del navegador.
if ($nombre === '' || $password === '') {
    responder_error(400, 'Completá el nombre de usuario y la contraseña.');
}
if (!preg_match('/^[\p{L}\p{N}._-]{3,50}$/u', $nombre)) {
    responder_error(400, 'El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion o guion bajo.');
}
if (($errorClave = validar_clave($password, $nombre)) !== null) {
    responder_error(422, $errorClave);
}

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

try {
    // El rol no viene del cliente: todo registro público es un votante.
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, clave, rol) VALUES (:nombre, :clave, 'votante')");
    $stmt->execute([':nombre' => $nombre, ':clave' => $hash]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        responder_error(409, 'Ese nombre de usuario ya está en uso. Elegí otro.');
    }
    throw $e; // lo resuelve el manejador global: 500 genérico
}

responder(201, ['estado' => 'exito', 'mensaje' => 'Cuenta creada correctamente.']);
