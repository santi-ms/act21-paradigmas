CREATE DATABASE IF NOT EXISTS clase_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE clase_backend;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO productos (nombre, categoria, precio, stock) VALUES
('Teclado Mecánico RGB', 'Periféricos', 25000.00, 15),
('Monitor 24 IPS Full HD', 'Monitores', 135000.00, 8),
('Mouse Inalámbrico Ergonómico', 'Periféricos', 18500.00, 20),
('Auriculares Gamer 7.1', 'Audio', 42000.00, 5);

-- AA 23: tabla de usuarios para autenticación (password VARCHAR(255) para el hash BCRYPT)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'cliente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Los usuarios se crean desde api/registro.php (guarda el hash con password_hash).
-- Si hubiera contraseñas en texto plano de clases anteriores: php migrar_passwords.php
