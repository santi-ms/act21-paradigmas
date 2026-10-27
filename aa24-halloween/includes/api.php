<?php
// Utilidades comunes de la API: cabeceras JSON, manejo global de errores y lectura segura del cuerpo.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0'); // los errores nunca se muestran al cliente

function responder(int $estado, array $datos): void
{
    http_response_code($estado);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function responder_error(int $estado, string $mensaje): void
{
    responder($estado, ['estado' => 'error', 'mensaje' => $mensaje]);
}

// Cualquier excepción no controlada termina en un 500 genérico: el detalle queda solo en el log del servidor.
set_exception_handler(function (Throwable $error): void {
    error_log('Halloween: ' . get_class($error) . ' (' . $error->getCode() . ')');
    responder_error(500, 'No se pudo completar la operación. Intentá de nuevo más tarde.');
});

// Acepta uno o varios métodos y responde 405 con la cabecera Allow si el pedido usa otro.
function metodo(string ...$permitidos): string
{
    $actual = $_SERVER['REQUEST_METHOD'];
    if (!in_array($actual, $permitidos, true)) {
        header('Allow: ' . implode(', ', $permitidos));
        responder_error(405, 'Método no permitido.');
    }
    return $actual;
}

// Lee el cuerpo como objeto JSON: valida tipo de contenido, tamaño máximo y formato.
function cuerpoJSON(int $maximo = 16384): array
{
    $tipo = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($tipo !== 'application/json') {
        responder_error(415, 'Enviá los datos como application/json.');
    }
    $cuerpo = file_get_contents('php://input', false, null, 0, $maximo + 1);
    if ($cuerpo === false || strlen($cuerpo) > $maximo) {
        responder_error(413, 'La solicitud es demasiado grande.');
    }
    try {
        $datos = json_decode($cuerpo, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        responder_error(400, 'JSON inválido.');
    }
    if (!is_array($datos) || substr(ltrim($cuerpo), 0, 1) !== '{') {
        responder_error(400, 'Se esperaba un objeto JSON.');
    }
    return $datos;
}

function texto(array $datos, string $campo): string
{
    return isset($datos[$campo]) && is_string($datos[$campo]) ? trim($datos[$campo]) : '';
}
