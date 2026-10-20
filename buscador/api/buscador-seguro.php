<?php
// ✅ CÓDIGO SEGURO: Consulta preparada con PDO (el dato nunca se concatena al SQL)
header('Content-Type: application/json; charset=utf-8');
require_once '../includes/sesion.php';
exigir_sesion(); // Guardián: sin sesión responde 401 y no llega a la base de datos
require_once '../../config/conexion.php';

// Solo se aceptan peticiones GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["estado" => "error", "mensaje" => "Método no permitido"]);
    exit;
}

// Validación de la entrada
$q = trim($_GET['q'] ?? '');

if ($q === '' || mb_strlen($q) > 100) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "Término de búsqueda inválido"]);
    exit;
}

// Se escapan los comodines de LIKE (% y _) para que se busquen como texto literal
$termino = '%' . addcslashes($q, '%_\\') . '%';

try {
    // 1. Preparar: la estructura del SQL queda fija, con marcadores en lugar de datos
    $sql = "SELECT id, nombre, categoria, precio, stock
            FROM productos
            WHERE nombre LIKE :nombre OR categoria LIKE :categoria
            ORDER BY nombre";
    $stmt = $pdo->prepare($sql);

    // 2. Vincular: el valor viaja por separado y se trata siempre como dato
    $stmt->bindValue(':nombre', $termino, PDO::PARAM_STR);
    $stmt->bindValue(':categoria', $termino, PDO::PARAM_STR);

    // 3. Ejecutar
    $stmt->execute();
    $resultado = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        "estado" => "exito",
        "total"  => count($resultado),
        "data"   => $resultado
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["estado" => "error", "mensaje" => "Error al realizar la búsqueda"]);
}
