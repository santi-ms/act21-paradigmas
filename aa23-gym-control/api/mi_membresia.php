<?php
// api/mi_membresia.php - Endpoint privado del dominio: plan y vencimiento del socio autenticado.
require_once __DIR__ . '/../includes/sesion.php';
require_once __DIR__ . '/../config/conexion.php';

exigir_sesion(); // Guardián: sin $_SESSION['usuario_id'] responde 401 y no consulta la base.

try {
    // El id sale de la sesión del servidor, nunca de un parámetro del cliente:
    // cada socio solo puede ver su propia membresía.
    $stmt = $pdo->prepare('SELECT plan_id, vencimiento FROM usuarios WHERE id = :id');
    $stmt->execute([':id' => $_SESSION['usuario_id']]);
    $fila = $stmt->fetch();

    $membresia = ($fila && $fila['plan_id'] !== null && $fila['vencimiento'] !== null)
        ? ['planId' => $fila['plan_id'], 'vencimiento' => $fila['vencimiento']]
        : null;

    http_response_code(200);
    echo json_encode(['estado' => 'exito', 'data' => ['membresia' => $membresia]], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
