<?php
// Limitación de intentos (anti fuerza bruta) con contadores en MySQL.
// Cada clave (hash de IP o de e-mail) tiene un contador que se reinicia al vencer la ventana.
const LIMITE_VENTANA_MIN = 15;

function ip_cliente(): string
{
    // Solo REMOTE_ADDR: las cabeceras tipo X-Forwarded-For las controla el cliente y se pueden falsificar.
    return $_SERVER['REMOTE_ADDR'] ?? 'local';
}

function clave_limite(string $tipo, string $valor): string
{
    return hash('sha256', $tipo . ':' . $valor);
}

function limite_alcanzado(PDO $pdo, string $clave, int $maximo): bool
{
    $consulta = $pdo->prepare(
        'SELECT intentos FROM intentos_login
         WHERE clave = :clave AND ventana > UTC_TIMESTAMP() - INTERVAL ' . LIMITE_VENTANA_MIN . ' MINUTE'
    );
    $consulta->execute([':clave' => $clave]);
    $fila = $consulta->fetch();
    return $fila !== false && (int) $fila['intentos'] >= $maximo;
}

function registrar_intento(PDO $pdo, string $clave): void
{
    // Si la ventana venció, el contador vuelve a 1; si no, suma uno.
    $pdo->prepare(
        'INSERT INTO intentos_login (clave, intentos, ventana) VALUES (:clave, 1, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
            intentos = IF(ventana > UTC_TIMESTAMP() - INTERVAL ' . LIMITE_VENTANA_MIN . ' MINUTE, intentos + 1, 1),
            ventana  = IF(ventana > UTC_TIMESTAMP() - INTERVAL ' . LIMITE_VENTANA_MIN . ' MINUTE, ventana, UTC_TIMESTAMP())'
    )->execute([':clave' => $clave]);
}

function limpiar_intentos(PDO $pdo, string $clave): void
{
    $pdo->prepare('DELETE FROM intentos_login WHERE clave = :clave')->execute([':clave' => $clave]);
}

// Responde 429 Too Many Requests indicando cuánto esperar.
function responder_demasiados_intentos(): void
{
    header('Retry-After: ' . (LIMITE_VENTANA_MIN * 60));
    responder_error(429, 'Demasiados intentos. Esperá ' . LIMITE_VENTANA_MIN . ' minutos e intentá de nuevo.');
}
