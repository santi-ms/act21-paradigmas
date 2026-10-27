-- AA 24 - Concurso de disfraces de Halloween (API REST)
-- Ejecutar en phpMyAdmin (pestaña SQL) o con: mysql -u root < database.sql

CREATE DATABASE IF NOT EXISTS halloween CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE halloween;

-- Estructura de la consigna, con las claves que una base real necesita (PRIMARY KEY, AUTO_INCREMENT)
-- y dos ajustes: foto_blob es MEDIUMBLOB (un BLOB común solo admite 64 KB) y foto guarda el tipo MIME.
CREATE TABLE IF NOT EXISTS disfraces (
    id          INT(11)      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL,
    descripcion TEXT         NOT NULL,
    votos       INT(11)      NOT NULL DEFAULT 0,
    foto        VARCHAR(20)  NOT NULL DEFAULT '',   -- tipo MIME de la imagen ('' si no tiene foto)
    foto_blob   MEDIUMBLOB   NOT NULL,              -- bytes de la imagen ('' si no tiene foto)
    eliminado   INT(11)      NOT NULL DEFAULT 0     -- borrado lógico: 1 = eliminado
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- clave guarda el hash BCRYPT (nunca la contraseña). Se agrega rol para distinguir al administrador,
-- y nombre es único porque se usa para iniciar sesión.
CREATE TABLE IF NOT EXISTS usuarios (
    id     INT(11)     NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    clave  TEXT        NOT NULL,
    rol    VARCHAR(20) NOT NULL DEFAULT 'votante'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- La clave única (id_usuario, id_disfraz) impide votos duplicados aunque dos peticiones lleguen a la vez.
CREATE TABLE IF NOT EXISTS votos (
    id         INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT(11) NOT NULL,
    id_disfraz INT(11) NOT NULL,
    UNIQUE KEY voto_unico (id_usuario, id_disfraz),
    CONSTRAINT fk_votos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_votos_disfraz FOREIGN KEY (id_disfraz) REFERENCES disfraces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contadores de intentos para limitar la fuerza bruta (la clave es un hash, no hay datos en claro).
CREATE TABLE IF NOT EXISTS intentos_login (
    clave    CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    intentos INT UNSIGNED NOT NULL DEFAULT 0,
    ventana  DATETIME NOT NULL
) ENGINE=InnoDB;

-- Administrador de demostración: usuario "admin", clave "Halloween-Admin-2026" (solo se guarda el hash).
-- Cambiar la clave antes de publicar el sitio.
INSERT IGNORE INTO usuarios (id, nombre, clave, rol) VALUES
(1, 'admin', '$2y$12$6rYVxIeA9ANL1fXpk30z9u7oknIcPiBbFQ5qj/6RUyQ32tn84nEFW', 'admin');

-- Disfraces de ejemplo (sin foto: la interfaz muestra un dibujo por defecto).
INSERT INTO disfraces (id, nombre, descripcion, votos, foto, foto_blob, eliminado)
SELECT * FROM (
    SELECT 1 AS id, 'Vampiro Elegante' AS nombre, 'Capa de terciopelo, colmillos de cristal y un aire de conde de otro siglo.' AS descripcion, 0 AS votos, '' AS foto, '' AS foto_blob, 0 AS eliminado
    UNION ALL SELECT 2, 'Bruja del Pantano', 'Sombrero torcido, caldero burbujeante y una escoba que ya perdió media paja.', 0, '', '', 0
    UNION ALL SELECT 3, 'Esqueleto Bailarín', 'Pintura fosforescente y huesos que se iluminan al ritmo de la música.', 0, '', '', 0
    UNION ALL SELECT 4, 'Fantasma Travieso', 'Una sábana blanca, cadenas de utilería y muchísimas ganas de asustar a los vecinos.', 0, '', '', 0
    UNION ALL SELECT 5, 'Zombi de Oficina', 'Corbata mordida, café en mano y la mirada perdida de un lunes a la mañana.', 0, '', '', 0
) AS ejemplos
WHERE NOT EXISTS (SELECT 1 FROM disfraces);
