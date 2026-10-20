<?php
// api/registro.php - Alta de usuarios: JSON + BCRYPT + consulta preparada
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

// Lectura del JSON enviado en el cuerpo de la petición
$input    = json_decode(file_get_contents('php://input'), true);
$nombre   = trim($input['nombre'] ?? '');
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

// Validación en el servidor (el frontend nunca es suficiente)
if ($nombre === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Todos los campos son obligatorios.']);
    exit;
}
if (mb_strlen($nombre) > 100 || mb_strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Nombre o correo inválido.']);
    exit;
}
if (strlen($password) < 8 || strlen($password) > 72) { // BCRYPT solo usa los primeros 72 bytes
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'La contraseña debe tener entre 8 y 72 caracteres.']);
    exit;
}

// El nombre se guarda tal cual: el escapado de XSS se hace al mostrarlo (textContent en el frontend)
$passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

try {
    $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :pass)');
    $stmt->execute([
        ':nombre' => $nombre,
        ':email'  => $email,
        ':pass'   => $passwordHash,
    ]);

    http_response_code(201); // Created
    echo json_encode(['estado' => 'exito', 'mensaje' => 'Usuario registrado correctamente.']);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        http_response_code(409); // Conflict: email duplicado
        echo json_encode(['estado' => 'error', 'mensaje' => 'El correo electrónico ya existe.']);
    } else {
        http_response_code(500);
        echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno al registrar el usuario.']);
    }
}
