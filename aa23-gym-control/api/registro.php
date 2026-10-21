<?php
// api/registro.php - Alta de socios: CSRF + límite de intentos + validación + BCRYPT + consulta preparada.
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
$nombre   = preg_replace('/\s+/u', ' ', texto($input, 'nombre'));
$email    = strtolower(texto($input, 'email'));
$password = isset($input['password']) && is_string($input['password']) ? $input['password'] : '';

// El servidor valida de nuevo: nunca se confía en la validación del navegador.
if ($nombre === '' || $email === '') {
    responder_error(400, 'Todos los campos son obligatorios.');
}
if (mb_strlen($nombre) > 100 || strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder_error(400, 'Revisá el nombre y el formato del e-mail.');
}
if (($errorClave = validar_clave($password, $nombre, $email)) !== null) {
    responder_error(422, $errorClave);
}

// El nombre se guarda tal cual: el escapado contra XSS se hace al mostrarlo (textContent).
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

try {
    $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)');
    $stmt->execute([':nombre' => $nombre, ':email' => $email, ':password' => $hash]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        responder_error(409, 'Ya existe una cuenta con ese e-mail. Ingresá desde el formulario 01.');
    }
    throw $e; // lo resuelve el manejador global: 500 genérico
}

responder(201, ['estado' => 'exito', 'mensaje' => 'Cuenta creada correctamente.']);
