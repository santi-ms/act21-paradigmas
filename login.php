<?php

require_once "config/conexion.php";

$mensaje = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $email = $_POST["email"];
    $password = $_POST["password"];

    $sql = "SELECT * FROM usuarios
            WHERE email = :email AND password = :password";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":email" => $email,
        ":password" => $password
    ]);

    $usuario = $stmt->fetch();

    if ($usuario) {
        $mensaje = "Bienvenido " . $usuario["nombre"];
    } else {
        $mensaje = "Email o contraseña incorrectos";
    }
}

?>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Iniciar sesión</title>
</head>

<body>

    <h2>Iniciar sesión</h2>

    <form method="POST">

        <label>Email:</label>
        <input type="email" name="email" required>

        <br><br>

        <label>Contraseña:</label>
        <input type="password" name="password" required>

        <br><br>

        <button type="submit">Ingresar</button>

    </form>

    <p><?php echo $mensaje; ?></p>

</body>

</html>