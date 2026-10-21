<?php
// Conexión PDO a MySQL. Los valores por defecto corresponden a XAMPP (root sin contraseña);
// se pueden cambiar con las variables de entorno GYM_DB_HOST, GYM_DB_NAME, GYM_DB_USER y GYM_DB_PASS.
// En un servidor real conviene un usuario propio con permisos mínimos (ver README).
require_once __DIR__ . '/../includes/api.php';

$host    = getenv('GYM_DB_HOST') ?: 'localhost';
$db      = getenv('GYM_DB_NAME') ?: 'gym_control';
$user    = getenv('GYM_DB_USER') ?: 'root';
$pass    = getenv('GYM_DB_PASS');
$pass    = $pass === false ? '' : $pass;
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // lanza PDOException ante errores
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // devuelve arreglos asociativos
    PDO::ATTR_EMULATE_PREPARES   => false,                  // consultas preparadas reales del servidor
];

// Si la conexión falla, el manejador global registra el error y responde un 500 genérico.
$pdo = new PDO($dsn, $user, $pass, $options);
