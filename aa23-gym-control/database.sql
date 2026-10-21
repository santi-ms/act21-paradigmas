-- Gym Control - AA 23: base de datos de socios con contraseñas protegidas (BCRYPT)
-- Ejecutar en phpMyAdmin (pestaña SQL) o con: mysql -u root < database.sql

CREATE DATABASE IF NOT EXISTS gym_control CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE gym_control;

-- password es VARCHAR(255) para almacenar el hash BCRYPT (60 caracteres hoy, con margen a futuro).
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    rol         VARCHAR(20)  NOT NULL DEFAULT 'socio',
    plan_id     VARCHAR(30)  NULL,   -- id del plan en data/planes.json
    vencimiento DATE         NULL    -- fin de la membresía
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Socios de demostración (clave: gimnasio2026). Se guarda solo el hash BCRYPT, nunca la clave.
INSERT IGNORE INTO usuarios (id, nombre, email, password, plan_id, vencimiento) VALUES
(12, 'Lucía Benítez', 'lucia.benitez@gymcontrol.test', '$2y$12$XkdbKdFvaTynHxJLuKksZuv4YRenwBMn.J15GnuPRFmvh9HYjLLCK', 'semestral', '2027-03-31'),
(27, 'Martín Ríos',   'martin.rios@gymcontrol.test',   '$2y$12$XkdbKdFvaTynHxJLuKksZuv4YRenwBMn.J15GnuPRFmvh9HYjLLCK', 'mensual',    '2026-08-31');

-- Contadores de intentos para limitar la fuerza bruta en login y registro.
-- La clave es un hash SHA-256 (de la IP o del e-mail): no se guardan datos personales en claro.
CREATE TABLE IF NOT EXISTS intentos_login (
    clave   CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    intentos INT UNSIGNED NOT NULL DEFAULT 0,
    ventana DATETIME NOT NULL
) ENGINE=InnoDB;
