<?php
// api/login.php - Autenticación: consulta preparada + password_verify + sesión segura.
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../includes/sesion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');

if ($email === '' || $password === '' || strlen($password) > 72) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá tu e-mail y tu clave.']);
    exit;
}

try {
    // El e-mail viaja como dato; la clave no se consulta, se compara contra el hash.
    $stmt = $pdo->prepare('SELECT id, nombre, email, password, rol FROM usuarios WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $usuario = $stmt->fetch();

    // Si el usuario no existe se verifica contra un hash válido de relleno para igualar los tiempos
    // de respuesta y no revelar qué e-mails están registrados.
    $hashFalso = '$2y$10$lFbAvxvlF3dbsunbCKahu.j9VS2KxF5RSWBKFQTLtBnfkEK7a/cdG';
    $valido    = password_verify($password, $usuario['password'] ?? $hashFalso);

    if (!$usuario || !$valido) {
        http_response_code(401); // Unauthorized
        echo json_encode(['estado' => 'error', 'mensaje' => 'E-mail o clave incorrectos.']);
        exit;
    }

    // Si el costo del hash quedó desactualizado se genera uno nuevo.
    if (password_needs_rehash($usuario['password'], PASSWORD_BCRYPT, ['cost' => 12])) {
        $upd = $pdo->prepare('UPDATE usuarios SET password = :password WHERE id = :id');
        $upd->execute([
            ':password' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
            ':id'       => $usuario['id'],
        ]);
    }

    iniciar_sesion_segura();
    session_regenerate_id(true); // evita la fijación de sesión

    $_SESSION['usuario_id']     = (int) $usuario['id'];
    $_SESSION['usuario_nombre'] = $usuario['nombre'];
    $_SESSION['usuario_email']  = $usuario['email'];
    $_SESSION['usuario_rol']    = $usuario['rol'];

    http_response_code(200);
    echo json_encode([
        'estado'  => 'exito',
        'mensaje' => 'Autenticación exitosa.',
        'usuario' => [
            'id'     => (int) $usuario['id'],
            'nombre' => $usuario['nombre'],
            'email'  => $usuario['email'],
            'rol'    => $usuario['rol'],
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
