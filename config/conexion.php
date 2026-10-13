<?php

// Configuración de credenciales del servidor MySQL
$db = 'clase_backend';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
$host = 'localhost';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// Opciones de configuración del Driver PDO
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Error de conexión con la base de datos",
        "detalle" => $e->getMessage()
    ]);
    exit;
}