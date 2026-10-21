# Gym Control - Actividades Evaluativas 1 y 2

Frontend estático para consultar y seleccionar visualmente planes de un gimnasio. El proyecto implementa **RF05 - Gestión de planes** y representa parcialmente **RF06 - Gestión de membresías**, sin realizar asignaciones ni guardar datos.

## Tecnologías

- HTML5
- CSS3
- JavaScript
- PHP 8 con PDO y MySQL (autenticación y sesiones, AA 23)


## Páginas

- `index.html`: portada principal.
- `listado_tabla.html`: listado de planes en una tabla HTML.
- `listado_box.html`: listado de planes en cards.
- `js/app.js`: buscador y filtro del catálogo, carga HTTP y preselección del plan elegido; registro y acceso de socios; formulario de reclamos.
- `data/planes.json`: catálogo de los cuatro planes de ejemplo del TP1.
- `producto.html`: detalle del Plan Mensual y formulario de reclamos y consultas.
- `data/confirmacion-reclamo.json`: respuesta simulada del servidor al enviar un reclamo.
- `comprar.html`: formulario visual para seleccionar un plan.
- `acceso.html`: ingreso, registro y vista del socio autenticado.
- `api/registro.php`, `api/login.php`, `api/logout.php`, `api/perfil.php` y `api/mi_membresia.php`: backend de socios en PHP (AA 23).
- `config/conexion.php`, `includes/sesion.php` y `database.sql`: conexión PDO, manejo de sesión y base de datos `gym_control` (AA 23).
- `data/usuarios.json`: socios de prueba de la AA 2; ya no lo usa el acceso, que ahora consulta MySQL.
- `js/subtotal.js`: calcula en pantalla el subtotal segun la cantidad elegida.
- `js/cupon.js`: valida el código de descuento `UCP10` en la pantalla de compra.

## Ejecución

Las tarjetas 3, 4 y 11 requieren un servidor HTTP para cargar los JSON con `fetch()`, y el registro y acceso de socios (AA 23) necesitan además **PHP y MySQL**. Abrir el HTML con doble clic (`file://`) no permite probar correctamente esas peticiones.

1. Iniciar **MySQL** desde el panel de XAMPP.
2. Importar `database.sql` en phpMyAdmin (pestaña **SQL**) o ejecutar `mysql -u root < database.sql`. Crea la base `gym_control`, la tabla `usuarios` y las cuentas de prueba.
3. Si MySQL no usa `root` sin contraseña, definir las variables de entorno `GYM_DB_USER` y `GYM_DB_PASS` (también existen `GYM_DB_HOST` y `GYM_DB_NAME`).
4. Ejecutar `iniciar.bat` en Windows, o abrir una terminal en la carpeta del proyecto y ejecutar:

```sh
php -S 127.0.0.1:8000
```

Abrir `http://localhost:8000/index.html` y elegir **Planes en cards**. Mantener abierta la terminal; `Ctrl+C` detiene el servidor. También se puede copiar la carpeta en `C:\xampp\htdocs` y abrirla con Apache (`http://localhost/gym-control-ae1/`).

## Startup Relámpago y tarjeta 3

Se implementa la **opción 3: Buscador y filtro de catálogo en tiempo real**, manteniendo la temática del gimnasio. La fundamentación utiliza **SOHDM**, con un escenario de exploración y búsqueda y su mapa navegacional.

- Eventos `input`, `change` y `click` mediante `addEventListener()` en `js/app.js`.
- Carga completa de `data/planes.json` con `fetch()` y `async/await`.
- Filtrado en memoria con `.filter()` por nombre, descripción o categoría, combinado con duración.
- Búsqueda sin distinción de mayúsculas, tildes o espacios exteriores.
- Tarjetas, contador y mensajes actualizados en el DOM, sin recargar ni repetir la petición al filtrar.
- Estados de carga, catálogo vacío, búsqueda sin resultados y error con reintento.
- El enlace de cada resultado lleva a `comprar.html?plan=...` y preselecciona el plan.

El trabajo anterior de subtotal y cupón se conserva en `js/subtotal.js` y `js/cupon.js`. La validación del cupón mantiene su comportamiento original: muestra el mensaje del beneficio y no modifica el subtotal. Esta actividad no procesa compras ni guarda membresías.

### Demostración

1. Abrir **Planes en cards**: aparecen cuatro planes cargados del JSON.
2. Buscar `renovacion`: aparece el Plan Mensual aunque su descripción contiene `renovación` con tilde.
3. Buscar `progreso` y elegir `6 meses`: aparece el Plan Semestral.
4. Mantener esa búsqueda y elegir `1 mes`: aparece el mensaje sin resultados.
5. Pulsar **Limpiar filtros**: vuelven los cuatro planes.
6. Elegir el Plan Trimestral: se abre el formulario con el plan marcado y subtotal de $67.500.
7. Para simular un error HTTP, renombrar temporalmente `data/planes.json`, recargar, restaurar el nombre y pulsar **Reintentar carga**.

La búsqueda `mensual` devuelve también el Plan Anual porque su descripción contiene “valor mensual”; el filtro consulta todos los campos indicados.

### Pruebas automáticas

Se realizaron 36 comprobaciones con Google Chrome. Para reproducirlas, con Node.js y Chrome instalados:

```sh
npm install
npm test
```

Las pruebas levantan su propio servidor local, comprueban la interacción y generan el registro y las capturas en `docs/`. Solo son necesarias dependencias de Node para las pruebas; el sitio usa HTML, CSS y JavaScript sin bibliotecas de producción.

## Tarjeta 4: registro y acceso de socios

Se implementa la **opción 4: Módulo de registro y autenticación de usuarios**. La fundamentación utiliza **VSDM**: el sitio define una vista para el visitante y otra para el socio autenticado.

- Envío de los formularios capturado con `addEventListener('submit', ...)` y `preventDefault()` en `js/app.js`.
- Validación de campos vacíos con `.trim()`, formato de e-mail, longitud de 10 a 72 caracteres (política de claves en el servidor) y coincidencia de claves (`type="password"`).
- Verificación en el servidor con `fetch()` y `async/await` contra `api/login.php` y `api/registro.php` (ver la sección de la AA 23): la clave se compara con su hash BCRYPT guardado en MySQL.
- Mensaje genérico ante credenciales incorrectas, estados de verificación y errores HTTP o de red.
- Vista del socio con plan, estado de la membresía (activa, por vencer, vencida o sin membresía), vencimiento y días restantes.
- El enlace del encabezado cambia de **Ingresar** a **Mi cuenta** y `comprar.html` precarga nombre y e-mail del socio.
- La sesión vive en el servidor (`session_start()`): el navegador solo conserva una cookie `HttpOnly` y se destruye al cerrar sesión.

Cuentas de prueba (clave `gimnasio2026`):

| E-mail | Membresía |
| --- | --- |
| `lucia.benitez@gymcontrol.test` | Plan Semestral, activa hasta el 31/03/2027 |
| `martin.rios@gymcontrol.test` | Plan Mensual, vencida el 31/08/2026 |

Las cuentas de prueba se cargan al importar `database.sql`. Las cuentas nuevas se guardan en MySQL con la clave protegida con BCRYPT.

### Demostración

1. Abrir **Ingresar** en el menú y pulsar **Ingresar** con los campos vacíos: aparece el aviso y el campo queda marcado.
2. En **Crear cuenta**, escribir claves distintas: aparece `Las claves no coinciden.`
3. Ingresar con `lucia.benitez@gymcontrol.test` y una clave incorrecta: aparece `E-mail o clave incorrectos.`
4. Ingresar con la clave de prueba: se muestra la vista del socio y el menú pasa a **Mi cuenta**.
5. Pulsar **Renovar plan**: `comprar.html` abre con el Plan Semestral marcado y los datos precargados.
6. Volver a **Mi cuenta** y pulsar **Cerrar sesión**: regresa la vista de visitante.
7. Ingresar con `martin.rios@gymcontrol.test`: la membresía figura vencida.

### Pruebas de la tarjeta 4

El acceso ya no es una simulación, por lo que `tests/acceso.cjs` se reemplazó por la prueba HTTP de la API (ver la sección AA 23).

## AA 23: integración de seguridad y sesiones

El acceso de socios dejó de ser una simulación en el navegador y pasó a un backend PHP con MySQL.

| Archivo | Función |
| --- | --- |
| `database.sql` | Crea la base `gym_control` y la tabla `usuarios`, con `password VARCHAR(255)` para el hash BCRYPT. |
| `api/registro.php` | Recibe JSON, valida en el servidor, guarda el hash con `password_hash(..., PASSWORD_BCRYPT)` mediante consulta preparada PDO. Responde 409 si el e-mail ya existe. |
| `api/login.php` | Busca al socio con consulta preparada, valida con `password_verify()`, ejecuta `session_start()`, aplica `session_regenerate_id(true)` y guarda `$_SESSION['usuario_id']`. |
| `api/logout.php` | Vacía la sesión, borra la cookie y la destruye. |
| `api/perfil.php` | Servicio privado con la identidad de la sesión; el frontend lo consulta al cargar cada página. |
| `api/mi_membresia.php` | Endpoint privado del dominio: plan y vencimiento del socio autenticado. |
| `includes/sesion.php` | Cookie de sesión `HttpOnly` + `SameSite=Strict` y el guardián `exigir_sesion()`. |

- **Endpoint protegido:** `api/mi_membresia.php` y `api/perfil.php` llaman al guardián. Si `!isset($_SESSION['usuario_id'])` responden `401 Unauthorized` antes de consultar la base. El id del socio sale siempre de la sesión del servidor, nunca de un parámetro del cliente.
- **Frontend (`js/app.js`):** al cargar la página consulta `api/perfil.php` con `fetch()`. Con sesión muestra la vista del socio; sin sesión, los formularios. Si una consulta devuelve 401 (sesión vencida), vuelve a la vista de visitante.
- **XSS:** nombres, e-mails y demás datos del usuario se escriben con `.textContent`, nunca como HTML.
- **Sesión:** ya no se usa `sessionStorage`; el estado lo mantiene el servidor.

#### Refuerzos de seguridad

| Medida | Dónde |
| --- | --- |
| **CSRF:** token por sesión en la cabecera `X-CSRF-Token` de todos los POST (login, registro, logout); se renueva al autenticar | `includes/sesion.php`, `api/csrf.php`, `js/app.js` |
| **Límite de intentos:** 5 fallos por e-mail y 20 por IP cada 15 minutos en el login (10 altas por IP en el registro); responde `429` con `Retry-After` | `includes/limites.php`, tabla `intentos_login` |
| **Manejo de errores:** `display_errors` apagado y un manejador global que responde un 500 genérico; el detalle queda solo en el log del servidor | `includes/api.php` |
| **Validación de la petición:** `Content-Type: application/json` (415), tamaño máximo de 16 KB (413) y JSON válido (400) | `includes/api.php` |
| **Vencimiento de sesión:** 30 minutos de inactividad y tope absoluto de 8 horas; modo estricto, ID solo por cookie | `includes/sesion.php` |
| **Política de claves:** de 10 a 72 caracteres, sin claves comunes y sin incluir el nombre ni el e-mail | `includes/claves.php` |
| **Cabeceras HTTP:** CSP estricta, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y bloqueo de `database.sql`, `README.md`, `config/`, `includes/` y `tests/` | `.htaccess` (requiere Apache con `mod_headers`) |

Notas: los contadores de intentos usan un hash de la IP y del e-mail, no datos en claro. El límite por e-mail permite que alguien bloquee temporalmente una cuenta ajena; es el costo habitual de esta defensa. El HSTS está comentado en el `.htaccess` hasta publicar el sitio con HTTPS. Para un servidor real conviene un usuario MySQL propio con permisos mínimos (`GYM_DB_USER` y `GYM_DB_PASS`).

#### Prueba de la API

Con MySQL y el servidor en marcha (`php -S 127.0.0.1:8000`) y la base importada:

```bash
python tests/api_smoke.py http://127.0.0.1:8000
```

Usa solo la biblioteca estándar de Python. Comprueba: 401 sin sesión, CSRF (403), tipo de contenido (415), JSON roto (400) y cuerpo enorme (413), política de claves (422), registro duplicado (409), login con renovación del ID de sesión y del token, logout con ID anterior inválido y bloqueo por intentos (429). Crea usuarios de prueba y, por el límite de intentos, conviene vaciar la tabla `intentos_login` si se repite muchas veces seguidas.

## Tarjeta 11: formulario de reclamos y consultas

Aporte de **Martins, Santino**. Se implementa la **opción 11: Formulario de reseñas, opiniones o reclamos**, acotada a reclamos y consultas sobre el Plan Mensual. La fundamentación utiliza **RNA** como proceso conceptual de PLN y vectorización para clasificar reclamos.

- Eventos `input` y `submit` mediante `addEventListener()` en `js/app.js`.
- Contador de caracteres en vivo con `.length`, con un mínimo de 10 y un máximo de 500.
- `.trim()` descarta los reclamos formados solo por espacios.
- Envío con `fetch()` y `async/await` a `data/confirmacion-reclamo.json`, que simula la respuesta del servidor.
- Confirmación o error en el DOM; ante un fallo HTTP el formulario conserva el texto para reintentar.

### Demostración

1. Abrir la ficha del **Plan Mensual** y bajar hasta **Reclamos y consultas**.
2. Escribir: el contador se actualiza con cada tecla.
3. Enviar `corto`: aparece el aviso del mínimo de 10 caracteres y no se hace la petición.
4. Enviar un reclamo válido: aparece la confirmación y el formulario se vacía.

### Pruebas de la tarjeta 11

`npm test` ejecuta también `tests/reclamos.cjs`, con 12 comprobaciones en Google Chrome. El registro se guarda en `docs/pruebas-tarjeta11.json` y las capturas en `docs/capturas-tarjeta11/`.

## Documentación

Los informes de la Actividad Evaluativa 2, el análisis y diseño, las capturas y los registros de pruebas del equipo están en el repositorio original del proyecto: [santiagotarnoski/gym-control-ae1](https://github.com/santiagotarnoski/gym-control-ae1). Esta copia incluye solo el código, con la integración de seguridad y sesiones de la AA 23.

## Integrantes

- Martins, Santino
- Olexyn, Franco
- Tarnoski, Santiago

Profesor: Sicardi, Dante.
