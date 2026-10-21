<?php
// api/registro.php - Alta de socios: JSON + BCRYPT + consulta preparada.
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

// Lectura del JSON enviado en el cuerpo de la petición.
$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$nombre   = preg_replace('/\s+/u', ' ', trim((string) ($input['nombre'] ?? '')));
$email    = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');

// El servidor valida de nuevo: nunca se confía en la validación del navegador.
if ($nombre === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Todos los campos son obligatorios.']);
    exit;
}
if (mb_strlen($nombre) > 100 || mb_strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Revisá el nombre y el formato del e-mail.']);
    exit;
}
if (strlen($password) < 8 || strlen($password) > 72) { // BCRYPT solo usa los primeros 72 bytes
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'La clave debe tener entre 8 y 72 caracteres.']);
    exit;
}

// El nombre se guarda tal cual: el escapado contra XSS se hace al mostrarlo (textContent).
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

try {
    $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)');
    $stmt->execute([':nombre' => $nombre, ':email' => $email, ':password' => $hash]);

    http_response_code(201); // Created
    echo json_encode(['estado' => 'exito', 'mensaje' => 'Cuenta creada correctamente.']);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        http_response_code(409); // Conflict: e-mail duplicado
        echo json_encode(['estado' => 'error', 'mensaje' => 'Ya existe una cuenta con ese e-mail. Ingresá desde el formulario 01.']);
    } else {
        http_response_code(500);
        echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno al crear la cuenta.']);
    }
}
