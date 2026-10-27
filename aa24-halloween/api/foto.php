<?php
// api/foto.php?id=N - Entrega la imagen de un disfraz (guardada en la columna foto_blob).
require_once __DIR__ . '/../config/conexion.php';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

metodo('GET');
$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$id) {
    responder_error(400, 'Indicá el id del disfraz (?id=N).');
}

$stmt = $pdo->prepare("SELECT foto, foto_blob FROM disfraces WHERE id = :id AND eliminado = 0 AND foto <> ''");
$stmt->execute([':id' => $id]);
$fila = $stmt->fetch();

if (!$fila || !in_array($fila['foto'], TIPOS_PERMITIDOS, true)) {
    responder_error(404, 'Ese disfraz no tiene foto.');
}

// La imagen se sirve con su tipo real, sin que el navegador la reinterprete ni ejecute nada.
header('Content-Type: ' . $fila['foto']);
header('Cache-Control: public, max-age=3600');
header("Content-Security-Policy: default-src 'none'; sandbox");
header('Content-Length: ' . strlen($fila['foto_blob']));
echo $fila['foto_blob'];
