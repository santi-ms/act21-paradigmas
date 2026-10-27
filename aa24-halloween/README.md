# AA 24 - Noche de Disfraces (concurso de Halloween con API REST)

Aplicación web con metodología API REST para que los usuarios se registren y voten por sus disfraces de Halloween favoritos. El backend es PHP con PDO y MySQL, y el frontend es JavaScript vanilla (`fetch`) con estilos de Halloween.

## Instalación (XAMPP)

1. Iniciar **MySQL** desde el panel de XAMPP.
2. Importar `database.sql` en phpMyAdmin (pestaña **SQL**) o ejecutar `mysql -u root < database.sql`. Crea la base `halloween` con las tablas `disfraces`, `usuarios` y `votos`, cinco disfraces de ejemplo y el administrador de demostración. Se puede importar más de una vez sin duplicar datos.
3. Si MySQL no usa `root` sin contraseña, definir las variables de entorno `HW_DB_USER` y `HW_DB_PASS` (también existen `HW_DB_HOST` y `HW_DB_NAME`).
4. Ejecutar `iniciar.bat` (o `php -S 127.0.0.1:8000` dentro de la carpeta) y abrir `http://localhost:8000/index.html`. También se puede copiar la carpeta en `C:\xampp\htdocs` y abrirla con Apache.

**Administrador de demostración:** usuario `admin`, contraseña `Halloween-Admin-2026` (solo se guarda su hash BCRYPT). Cambiarla antes de publicar el sitio.

## Qué pide la consigna y dónde está

| Consigna | Implementación |
| --- | --- |
| Base `halloween` y tablas `disfraces`, `usuarios`, `votos` | `database.sql` |
| `index.html` con nombre, descripción y votos, consumiendo la API | `index.html`, `js/index.js` y `GET api/disfraces.php` |
| Botón **Votar** sin votos duplicados | `api/votar.php` + clave única `(id_usuario, id_disfraz)` en `votos` |
| Página de registro | `registro.html`, `js/registro.js`, `api/registro.php` |
| Autenticación: solo los usuarios registrados votan | sesión PHP; `api/votar.php` responde `401` sin sesión |
| Página de inicio de sesión | `login.html`, `js/login.js`, `api/login.php` |
| Administración solo para el administrador con CRUD | `admin.html`, `js/admin.js` y `api/disfraces.php` (GET, POST, PUT, DELETE; `403` si no es admin) |
| Estilos de Halloween | `css/styles.css` |
| Carga de imágenes de los disfraces | `foto_blob` en MySQL, validada y servida por `api/foto.php` |

## API REST

| Recurso | Método | Acceso | Respuestas |
| --- | --- | --- | --- |
| `api/disfraces.php` | GET | público (lista, o uno con `?id=N`) | 200, 404 |
| `api/disfraces.php` | POST | administrador | 201, 400, 413, 415 |
| `api/disfraces.php?id=N` | PUT | administrador | 200, 404 |
| `api/disfraces.php?id=N` | DELETE | administrador (borrado lógico) | 200, 404 |
| `api/votar.php` | POST | usuario con sesión | 201, 401, 404, **409** (ya votó) |
| `api/registro.php` | POST | público | 201, 400, 409, 422, 429 |
| `api/login.php` | POST | público | 200, 401, 429 |
| `api/logout.php` | POST | sesión | 200 |
| `api/perfil.php` | GET | usuario con sesión | 200, 401 |
| `api/csrf.php` | GET | público | 200 |
| `api/foto.php?id=N` | GET | público | imagen o 404 |

Todas las respuestas son JSON (`Content-Type: application/json`), excepto la imagen de `foto.php`. Los errores usan códigos semánticos: `400` datos inválidos, `401` sin sesión, `403` sin permiso o token CSRF inválido, `404` no existe, `405` método no permitido, `409` conflicto, `413` cuerpo demasiado grande, `415` tipo no admitido, `422` clave rechazada, `429` demasiados intentos y `500` genérico.

## Decisiones sobre la estructura de la base

Se mantuvieron las tablas y columnas de la consigna, con estos ajustes necesarios para que funcionen en una base real:

- **`PRIMARY KEY` y `AUTO_INCREMENT`** en los `id` de las tres tablas.
- **`foto_blob` es `MEDIUMBLOB`**: un `BLOB` común solo admite 64 KB, y una foto lo supera con facilidad. Las imágenes admiten hasta 1 MB.
- **`foto` guarda el tipo MIME** de la imagen (`image/png`, etc.); queda vacío si el disfraz no tiene foto.
- **`usuarios.rol`** (nuevo): distingue al administrador. Todo registro público es `votante`; el cliente nunca elige su rol.
- **`usuarios.nombre` es único**, porque se usa para iniciar sesión. `clave` guarda el hash BCRYPT, nunca la contraseña.
- **Votos:** cada usuario puede votar **una vez por cada disfraz** (puede apoyar a varios, no repetir el mismo). La clave única de la tabla `votos` lo garantiza incluso si dos peticiones llegan a la vez.
- **Eliminar un disfraz es un borrado lógico** (`eliminado = 1`), como sugiere la columna de la consigna: deja de mostrarse, pero se conservan sus votos.

## Seguridad

- **Contraseñas con BCRYPT** (`password_hash` / `password_verify`), política de claves (10 a 72 caracteres, sin claves comunes ni el nombre de usuario) y re-hash automático si el costo queda viejo.
- **PDO con consultas preparadas** y marcadores nombrados en todo el backend; ninguna consulta concatena datos.
- **Sesión PHP segura:** `session_regenerate_id(true)` al autenticar, cookie `HttpOnly` y `SameSite=Strict`, modo estricto, vencimiento a los 30 minutos de inactividad y tope absoluto de 8 horas. El logout vacía la sesión, expira la cookie y la destruye.
- **Control de acceso en el servidor:** el botón o la página de administración se ocultan por comodidad, pero la autorización real está en la API (`401` sin sesión, `403` sin rol de administrador). El rol se vuelve a leer de la base en cada operación.
- **CSRF:** token por sesión en la cabecera `X-CSRF-Token` para todo lo que modifica datos.
- **Anti fuerza bruta:** 5 fallos por usuario y 20 por IP cada 15 minutos en el login, y 10 altas por IP en el registro; responde `429` con `Retry-After`.
- **Imágenes:** el tipo se determina por el contenido real (no por lo que declare el cliente), solo JPG, PNG, GIF y WebP, máximo 1 MB. Se sirven con `nosniff` y una CSP que impide ejecutar nada. No se admiten SVG.
- **XSS:** todo dato (nombres, descripciones, usuarios) se escribe con `textContent`; no se usa `innerHTML`.
- **Errores genéricos:** `display_errors` apagado y un manejador global que responde un 500 sin detalles.
- **Cabeceras HTTP** (`.htaccess`, requiere Apache con `mod_headers`): CSP estricta, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; además bloquea `database.sql`, `README.md`, `config/`, `includes/` y `tests/`. El HSTS está comentado hasta publicar con HTTPS.

Notas: el límite por usuario permite que alguien bloquee temporalmente una cuenta ajena, el costo habitual de esta defensa. Para un servidor real conviene un usuario MySQL propio con permisos mínimos (`HW_DB_USER` y `HW_DB_PASS`).

## Prueba de la API

Con MySQL y el servidor en marcha y la base importada:

```bash
python tests/api_smoke.py http://127.0.0.1:8000
```

Usa solo la biblioteca estándar de Python. Comprueba la lista pública, los `401` y `403`, CSRF, el formato de las peticiones, el registro y la política de claves, el login con renovación de sesión, los votos únicos, el CRUD completo con una imagen real, el logout y el bloqueo por intentos. Crea usuarios de prueba; si se repite muchas veces seguidas, vaciar la tabla `intentos_login`.

## Estructura

```
aa24-halloween/
├── index.html  login.html  registro.html  admin.html
├── css/styles.css
├── js/             comun.js (API, CSRF, sesión)  index.js  login.js  registro.js  admin.js
├── api/            disfraces.php  votar.php  registro.php  login.php  logout.php  perfil.php  csrf.php  foto.php
├── includes/       api.php  sesion.php  limites.php  claves.php
├── config/         conexion.php
├── tests/          api_smoke.py
├── database.sql  .htaccess  iniciar.bat
```
