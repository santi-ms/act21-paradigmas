<?php
// Política de contraseñas: largo adecuado para BCRYPT, sin claves comunes ni el nombre de usuario.
const CLAVE_MIN = 10;
const CLAVE_MAX = 72; // BCRYPT solo usa los primeros 72 bytes: se rechaza en lugar de truncar

const CLAVES_COMUNES = [
    '1234567890', '12345678910', '123456789012', '0123456789', '1q2w3e4r5t', '1qaz2wsx3edc', 'qwertyuiop',
    'asdfghjkl1', 'qwertyuiop123', 'zxcvbnm123', 'password12', 'password123', 'password1234', 'passw0rd123',
    'contrasena1', 'contrasena123', 'contraseña1', 'contraseña123', 'iloveyou123', 'iloveyou12', 'admin12345',
    'administrador', 'welcome123', 'bienvenido1', 'bienvenido123', 'abc1234567', 'abcd123456', 'abcdefghij',
    'qazwsxedc123', 'superman123', 'football123', 'futbol12345', 'boca123456', 'river123456', 'argentina123',
    'halloween123', 'halloween2026', 'halloween2025', 'halloween12', 'calabaza123', 'mipassword1', 'micontraseña',
    'micontrasena', 'letmein1234', 'trustno1234', 'monkey12345', 'dragon12345', '1111111111', '0000000000',
    '1234512345', '9876543210', 'a1b2c3d4e5', 'changeme123', 'cambiame123',
];

// Devuelve el mensaje de error o null si la clave es aceptable.
function validar_clave(string $clave, string $usuario): ?string
{
    if (strpos($clave, "\0") !== false || strlen($clave) < CLAVE_MIN || strlen($clave) > CLAVE_MAX) {
        return 'La clave debe tener entre ' . CLAVE_MIN . ' y ' . CLAVE_MAX . ' caracteres.';
    }
    $minuscula = mb_strtolower($clave);
    if (in_array($minuscula, CLAVES_COMUNES, true) || count(array_unique(mb_str_split($minuscula))) < 4) {
        return 'Esa clave es demasiado común o predecible. Elegí otra.';
    }
    $nombre = mb_strtolower($usuario);
    if ($nombre !== '' && (str_contains($minuscula, $nombre) && mb_strlen($nombre) >= 4 || $minuscula === $nombre)) {
        return 'La clave no puede incluir tu nombre de usuario.';
    }
    return null;
}
