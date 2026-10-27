<?php
// api/login.php - Autenticación: CSRF + límite de intentos + consulta preparada + password_verify + sesión segura.
require_once __DIR__ . '/../includes/sesion.php';
require_once __DIR__ . '/../includes/limites.php';
require_once __DIR__ . '/../config/conexion.php';

metodo('POST');
iniciar_sesion_segura();
exigir_csrf();

$input    = cuerpoJSON();
$nombre   = texto($input, 'nombre');
$password = isset($input['password']) && is_string($input['password']) ? $input['password'] : '';

if ($nombre === '' || $password === '' || mb_strlen($nombre) > 50 || strlen($password) > 72) {
    responder_error(400, 'Ingresá tu usuario y tu contraseña.');
}

// Anti fuerza bruta: 5 fallos por usuario y 20 por IP cada 15 minutos.
$claveUsuario = clave_limite('login:usuario', mb_strtolower($nombre));
$claveIp      = clave_limite('login:ip', ip_cliente());
if (limite_alcanzado($pdo, $claveUsuario, 5) || limite_alcanzado($pdo, $claveIp, 20)) {
    responder_demasiados_intentos();
}

// El usuario viaja como dato; la clave no se consulta, se compara contra el hash.
$stmt = $pdo->prepare('SELECT id, nombre, clave, rol FROM usuarios WHERE nombre = :nombre LIMIT 1');
$stmt->execute([':nombre' => $nombre]);
$usuario = $stmt->fetch();

// Si el usuario no existe se verifica contra un hash válido de relleno para igualar los tiempos
// de respuesta y no revelar qué usuarios están registrados.
$hashFalso = '$2y$10$lFbAvxvlF3dbsunbCKahu.j9VS2KxF5RSWBKFQTLtBnfkEK7a/cdG';
$valido    = password_verify($password, $usuario['clave'] ?? $hashFalso);

if (!$usuario || !$valido) {
    registrar_intento($pdo, $claveUsuario);
    registrar_intento($pdo, $claveIp);
    error_log('Halloween: login fallido (ip ' . ip_cliente() . ', cuenta ' . substr($claveUsuario, 0, 8) . ')');
    responder_error(401, 'Usuario o contraseña incorrectos.');
}

limpiar_intentos($pdo, $claveUsuario); // un acceso correcto reinicia el contador de esa cuenta

// Si el costo del hash quedó desactualizado se genera uno nuevo.
if (password_needs_rehash($usuario['clave'], PASSWORD_BCRYPT, ['cost' => 12])) {
    $upd = $pdo->prepare('UPDATE usuarios SET clave = :clave WHERE id = :id');
    $upd->execute([':clave' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), ':id' => $usuario['id']]);
}

session_regenerate_id(true); // evita la fijación de sesión
$_SESSION['usuario_id']       = (int) $usuario['id'];
$_SESSION['usuario_nombre']   = $usuario['nombre'];
$_SESSION['usuario_rol']      = $usuario['rol'];
$_SESSION['inicio_sesion']    = time();
$_SESSION['ultima_actividad'] = time();
$token = rotar_csrf(); // token nuevo para la sesión autenticada

responder(200, [
    'estado'     => 'exito',
    'mensaje'    => 'Autenticación exitosa.',
    'csrf_token' => $token,
    'usuario'    => ['id' => (int) $usuario['id'], 'nombre' => $usuario['nombre'], 'rol' => $usuario['rol']],
]);
