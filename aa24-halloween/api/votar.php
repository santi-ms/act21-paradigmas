<?php
// api/votar.php - Registra el voto del usuario autenticado por un disfraz.
// Un usuario puede votar una sola vez por cada disfraz: la clave única de la tabla votos lo garantiza.
require_once __DIR__ . '/../includes/sesion.php';
require_once __DIR__ . '/../config/conexion.php';

metodo('POST');
exigir_sesion();  // 401 si no hay sesión: solo los usuarios registrados pueden votar
exigir_csrf();

$input = cuerpoJSON();
$idDisfraz = filter_var($input['id_disfraz'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$idDisfraz) {
    responder_error(400, 'Indicá el disfraz por el que querés votar.');
}

$pdo->beginTransaction();
try {
    // El disfraz debe existir y no estar eliminado; se bloquea la fila mientras se cuenta el voto.
    $disfraz = $pdo->prepare('SELECT id FROM disfraces WHERE id = :id AND eliminado = 0 FOR UPDATE');
    $disfraz->execute([':id' => $idDisfraz]);
    if (!$disfraz->fetch()) {
        $pdo->rollBack();
        responder_error(404, 'Ese disfraz no existe.');
    }

    // El id del usuario sale siempre de la sesión del servidor, nunca de la petición.
    $voto = $pdo->prepare('INSERT INTO votos (id_usuario, id_disfraz) VALUES (:usuario, :disfraz)');
    $voto->execute([':usuario' => $_SESSION['usuario_id'], ':disfraz' => $idDisfraz]);

    $pdo->prepare('UPDATE disfraces SET votos = votos + 1 WHERE id = :id')->execute([':id' => $idDisfraz]);
    $total = $pdo->prepare('SELECT votos FROM disfraces WHERE id = :id');
    $total->execute([':id' => $idDisfraz]);
    $votos = (int) $total->fetchColumn();
    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    if ($e->getCode() == 23000) {
        responder_error(409, 'Ya votaste por este disfraz.'); // voto duplicado
    }
    throw $e;
}

responder(201, ['estado' => 'exito', 'mensaje' => '¡Voto registrado!', 'votos' => $votos]);
