<?php
// Migración única (CLI): convierte contraseñas en texto plano a hash BCRYPT.
// Uso: php migrar_passwords.php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }

require_once __DIR__ . '/../config/conexion.php';

$filas = $pdo->query("SELECT id, password FROM usuarios WHERE password NOT LIKE '\$2y\$%'")->fetchAll();
$upd   = $pdo->prepare('UPDATE usuarios SET password = :hash WHERE id = :id');

foreach ($filas as $f) {
    $upd->execute([':hash' => password_hash($f['password'], PASSWORD_BCRYPT, ['cost' => 12]), ':id' => $f['id']]);
}
echo count($filas) . " contraseña(s) migradas a BCRYPT\n";
