<?php
// api/disfraces.php - Recurso "disfraces" (API REST).
//   GET    /api/disfraces.php          lista pública de disfraces activos (con votos y si el usuario ya votó)
//   GET    /api/disfraces.php?id=N     un disfraz
//   POST   /api/disfraces.php          crea un disfraz            (solo administrador, CSRF)
//   PUT    /api/disfraces.php?id=N     modifica un disfraz        (solo administrador, CSRF)
//   DELETE /api/disfraces.php?id=N     elimina (borrado lógico)   (solo administrador, CSRF)
require_once __DIR__ . '/../includes/sesion.php';
require_once __DIR__ . '/../config/conexion.php';

const FOTO_MAX_BYTES = 1048576; // 1 MB por imagen
const TIPOS_FOTO     = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

$metodo = metodo('GET', 'POST', 'PUT', 'DELETE');
iniciar_sesion_segura();
$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

// Valida nombre y descripción de un alta o modificación.
function datos_disfraz(array $input): array
{
    $nombre      = texto($input, 'nombre');
    $descripcion = texto($input, 'descripcion');
    if ($nombre === '' || $descripcion === '') {
        responder_error(400, 'El nombre y la descripción son obligatorios.');
    }
    if (mb_strlen($nombre) > 50 || mb_strlen($descripcion) > 2000) {
        responder_error(400, 'El nombre admite hasta 50 caracteres y la descripción hasta 2000.');
    }
    return [$nombre, $descripcion];
}

// Lee y valida la imagen enviada en base64. Devuelve [tipo MIME, bytes] o null si no se envió.
function leer_foto(array $input): ?array
{
    if (!isset($input['foto_base64']) || $input['foto_base64'] === '') {
        return null;
    }
    if (!is_string($input['foto_base64'])) {
        responder_error(400, 'La imagen no es válida.');
    }
    $bytes = base64_decode($input['foto_base64'], true);
    if ($bytes === false || $bytes === '') {
        responder_error(400, 'La imagen no es válida.');
    }
    if (strlen($bytes) > FOTO_MAX_BYTES) {
        responder_error(413, 'La imagen supera el máximo de 1 MB.');
    }
    // El tipo se determina por el contenido real del archivo, no por lo que declare el cliente.
    $info = @getimagesizefromstring($bytes);
    if ($info === false || !in_array($info['mime'], TIPOS_FOTO, true)) {
        responder_error(415, 'Formato de imagen no permitido. Usá JPG, PNG, GIF o WebP.');
    }
    return [$info['mime'], $bytes];
}

if ($metodo === 'GET') {
    $usuario = (int) ($_SESSION['usuario_id'] ?? 0);
    $sql = "SELECT d.id, d.nombre, d.descripcion, d.votos, d.foto,
                   IF(d.foto <> '', LEFT(MD5(d.foto_blob), 8), '') AS foto_v,
                   EXISTS(SELECT 1 FROM votos v WHERE v.id_disfraz = d.id AND v.id_usuario = :usuario) AS ya_voto
            FROM disfraces d
            WHERE d.eliminado = 0" . ($id ? ' AND d.id = :id' : '') . '
            ORDER BY d.votos DESC, d.nombre ASC';
    $consulta = $pdo->prepare($sql);
    $parametros = [':usuario' => $usuario];
    if ($id) {
        $parametros[':id'] = $id;
    }
    $consulta->execute($parametros);

    $disfraces = array_map(fn(array $f): array => [
        'id'          => (int) $f['id'],
        'nombre'      => $f['nombre'],
        'descripcion' => $f['descripcion'],
        'votos'       => (int) $f['votos'],
        'tiene_foto'  => $f['foto'] !== '',
        'foto_v'      => $f['foto_v'],
        'ya_voto'     => (bool) $f['ya_voto'],
    ], $consulta->fetchAll());

    if ($id) {
        if (!$disfraces) {
            responder_error(404, 'No existe ese disfraz.');
        }
        responder(200, ['estado' => 'exito', 'data' => $disfraces[0]]);
    }
    responder(200, ['estado' => 'exito', 'autenticado' => $usuario > 0, 'data' => $disfraces]);
}

// Las demás operaciones son del administrador: 401 sin sesión, 403 si no es admin, y token CSRF.
exigir_admin($pdo);
exigir_csrf();

if ($metodo === 'POST') {
    $input = cuerpoJSON(2000000); // admite una imagen en base64
    [$nombre, $descripcion] = datos_disfraz($input);
    $foto = leer_foto($input);

    $stmt = $pdo->prepare('INSERT INTO disfraces (nombre, descripcion, votos, foto, foto_blob, eliminado)
                           VALUES (:nombre, :descripcion, 0, :foto, :blob, 0)');
    $stmt->bindValue(':nombre', $nombre);
    $stmt->bindValue(':descripcion', $descripcion);
    $stmt->bindValue(':foto', $foto ? $foto[0] : '');
    $stmt->bindValue(':blob', $foto ? $foto[1] : '', PDO::PARAM_LOB);
    $stmt->execute();

    responder(201, ['estado' => 'exito', 'mensaje' => 'Disfraz creado.', 'id' => (int) $pdo->lastInsertId()]);
}

if (!$id) {
    responder_error(400, 'Indicá el id del disfraz (?id=N).');
}
$existe = $pdo->prepare('SELECT id FROM disfraces WHERE id = :id AND eliminado = 0');
$existe->execute([':id' => $id]);
if (!$existe->fetch()) {
    responder_error(404, 'No existe ese disfraz.');
}

if ($metodo === 'PUT') {
    $input = cuerpoJSON(2000000);
    [$nombre, $descripcion] = datos_disfraz($input);
    $foto = leer_foto($input);
    $quitar = ($input['quitar_foto'] ?? false) === true;

    if ($foto || $quitar) {
        $stmt = $pdo->prepare('UPDATE disfraces SET nombre = :nombre, descripcion = :descripcion, foto = :foto, foto_blob = :blob WHERE id = :id');
        $stmt->bindValue(':foto', $foto ? $foto[0] : '');
        $stmt->bindValue(':blob', $foto ? $foto[1] : '', PDO::PARAM_LOB);
    } else {
        $stmt = $pdo->prepare('UPDATE disfraces SET nombre = :nombre, descripcion = :descripcion WHERE id = :id');
    }
    $stmt->bindValue(':nombre', $nombre);
    $stmt->bindValue(':descripcion', $descripcion);
    $stmt->bindValue(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    responder(200, ['estado' => 'exito', 'mensaje' => 'Disfraz actualizado.']);
}

// DELETE: borrado lógico (eliminado = 1); los votos quedan registrados.
$stmt = $pdo->prepare('UPDATE disfraces SET eliminado = 1 WHERE id = :id');
$stmt->execute([':id' => $id]);
responder(200, ['estado' => 'exito', 'mensaje' => 'Disfraz eliminado.']);
