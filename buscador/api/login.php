<?php
// api/login.php - Autenticación: consulta preparada + password_verify + sesión segura
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/conexion.php';
require_once '../includes/sesion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

$input    = json_decode(file_get_contents('php://input'), true);
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if ($email === '' || $password === '' || strlen($password) > 72) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingrese correo y contraseña.']);
    exit;
}

try {
    // El email viaja como dato; la contraseña no se consulta, se compara contra el hash
    $stmt = $pdo->prepare('SELECT id, nombre, email, password, rol FROM usuarios WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $usuario = $stmt->fetch();

    // Si el usuario no existe se verifica contra un hash válido de relleno para igualar los tiempos
    $hashFalso = '$2y$10$lFbAvxvlF3dbsunbCKahu.j9VS2KxF5RSWBKFQTLtBnfkEK7a/cdG';
    $valido    = password_verify($password, $usuario['password'] ?? $hashFalso);

    if (!$usuario || !$valido) {
        http_response_code(401);
        echo json_encode(['estado' => 'error', 'mensaje' => 'Credenciales incorrectas.']);
        exit;
    }

    // Si el costo del hash quedó desactualizado se genera uno nuevo
    if (password_needs_rehash($usuario['password'], PASSWORD_BCRYPT, ['cost' => 12])) {
        $upd = $pdo->prepare('UPDATE usuarios SET password = :pass WHERE id = :id');
        $upd->execute([':pass' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), ':id' => $usuario['id']]);
    }

    iniciar_sesion_segura();
    session_regenerate_id(true); // evita la fijación de sesión

    $_SESSION['usuario_id']     = $usuario['id'];
    $_SESSION['usuario_nombre'] = $usuario['nombre'];
    $_SESSION['usuario_email']  = $usuario['email'];
    $_SESSION['usuario_rol']    = $usuario['rol'];

    http_response_code(200);
    echo json_encode([
        'estado'  => 'exito',
        'mensaje' => 'Autenticación exitosa.',
        'usuario' => [
            'nombre' => $usuario['nombre'],
            'email'  => $usuario['email'],
            'rol'    => $usuario['rol'],
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
