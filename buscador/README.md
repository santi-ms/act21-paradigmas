# AA 21 - Buscador Seguro con PDO

Módulo backend en PHP que usa **PDO y consultas preparadas** para buscar productos, integrado con un frontend en **JavaScript Vanilla (fetch)**.

## Instalación

1. Abrir phpMyAdmin y ejecutar `database.sql`.
2. Copiar la carpeta `buscador` dentro de `C:\xampp\htdocs`.
3. El proyecto reutiliza la conexión de la clase anterior, `htdocs/config/conexion.php` (usuario `root`, sin contraseña).
4. Abrir `http://localhost/buscador/` en el navegador.

## Estructura

```
htdocs/
  config/conexion.php         conexión PDO (de la clase anterior, compartida)
  login.php                   login de la clase anterior
  buscador/
    api/
      buscador-vulnerable.php versión original (concatena la entrada en el SQL)
      buscador-seguro.php     versión corregida con consultas preparadas
    css/styles.css
    js/app.js                 fetch al endpoint elegido y renderizado de tarjetas
    index.html
    database.sql
```

## Análisis del buscador vulnerable

En `buscador-vulnerable.php` el texto que escribe el usuario se concatena directamente dentro de la consulta:

```php
$sql = "SELECT * FROM productos WHERE nombre LIKE '%" . $q . "%'";
```

Como el dato forma parte del string SQL, una comilla simple en la entrada cierra el literal y lo que sigue se interpreta como código SQL. Eso permite alterar la lógica del `WHERE` o agregar consultas que lean otras tablas (inyección SQL).

## Solución aplicada

En `buscador-seguro.php`:

- **Consulta preparada:** el SQL se envía con marcadores (`:nombre`, `:categoria`) y el valor se vincula aparte con `bindValue`. El motor nunca interpreta el dato como código.
- **`PDO::ATTR_EMULATE_PREPARES => false`:** obliga a usar consultas preparadas reales del servidor MySQL.
- **Validación de entrada:** se rechazan búsquedas vacías o de más de 100 caracteres (HTTP 400).
- **Escape de comodines de LIKE:** `%` y `_` se buscan como texto literal.
- **Columnas explícitas** en lugar de `SELECT *`.
- **Errores genéricos:** no se devuelven mensajes internos de la base de datos al cliente.
- **Frontend:** los resultados se insertan con `textContent`, evitando XSS.

## AA 23 - Integración de seguridad y sesiones

El buscador ahora exige autenticación. Se agregaron:

| Archivo | Función |
|---|---|
| `api/registro.php` | Recibe JSON, valida, guarda el hash con `password_hash(..., PASSWORD_BCRYPT)` mediante consulta preparada. Responde 409 si el correo ya existe. |
| `api/login.php` | Busca al usuario con consulta preparada, valida con `password_verify()`, ejecuta `session_start()`, aplica `session_regenerate_id(true)` y guarda `$_SESSION['usuario_id']`. |
| `api/logout.php` | Vacía la sesión, borra la cookie y la destruye. |
| `api/perfil.php` | Servicio privado con los datos del usuario de la sesión. |
| `includes/sesion.php` | Cookie de sesión `HttpOnly` + `SameSite=Strict` y el guardián `exigir_sesion()`. |
| `migrar_passwords.php` | Convierte contraseñas en texto plano de la tabla `usuarios` a BCRYPT (se ejecuta una vez por consola). |

**Endpoint protegido:** `api/buscador-seguro.php` (y el vulnerable de comparación) llaman al guardián de sesión: si `!isset($_SESSION['usuario_id'])` responden `401 Unauthorized` antes de tocar la base de datos.

**Frontend (`js/app.js`):** al cargar la página consulta `api/perfil.php` con `fetch()`. Con sesión muestra el panel y el buscador; sin sesión muestra login y registro. Si una búsqueda devuelve 401 (sesión vencida), vuelve al login. Todos los datos de usuario y producto se muestran con `textContent`, por lo que un nombre como `<script>...` se ve como texto y no se ejecuta.
