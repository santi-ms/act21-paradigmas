# Paradigmas y Lenguajes de Programación III - Actividades

Cada actividad está en su propia carpeta.

| Actividad | Carpeta | Contenido |
| --- | --- | --- |
| **AA 21** | [`aa21-buscador/`](aa21-buscador) | Buscador de productos con PHP, PDO y consultas preparadas, frente a su versión vulnerable a inyección SQL, con frontend en JavaScript vanilla (`fetch`). |
| **AA 23** | [`aa23-gym-control/`](aa23-gym-control) | Gym Control: registro y acceso de socios con PHP + MySQL, contraseñas con BCRYPT, sesiones con `session_start()`, endpoints privados con `401 Unauthorized` y protección contra XSS. |

Archivos de la clase anterior que usa el buscador:

- `config/conexion.php`: conexión PDO a MySQL (XAMPP, usuario `root` sin contraseña).
- `login.php`: login con consulta preparada de esa clase.

Cada carpeta tiene su propio README con las instrucciones para ejecutarla.
