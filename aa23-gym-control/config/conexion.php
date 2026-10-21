<?php
// Conexión PDO a MySQL. Los valores por defecto corresponden a XAMPP (root sin contraseña);
// se pueden cambiar con las variables de entorno GYM_DB_HOST, GYM_DB_NAME, GYM_DB_USER y GYM_DB_PASS.
$host    = getenv('GYM_DB_HOST') ?: 'localhost';
$db      = getenv('GYM_DB_NAME') ?: 'gym_control';
$user    = getenv('GYM_DB_USER') ?: 'root';
$pass    = getenv('GYM_DB_PASS') ?: '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // lanza PDOException ante errores
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // devuelve arreglos asociativos
    PDO::ATTR_EMULATE_PREPARES   => false,                  // consultas preparadas reales del servidor
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error de conexión con la base de datos.']);
    exit;
}
