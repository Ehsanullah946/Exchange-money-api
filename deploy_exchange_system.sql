-- =========================
--  Exchange Money System DB
--  User & Organization Setup
-- =========================

CREATE DATABASE IF NOT EXISTS exchange_system;
USE exchange_system;

-- =========================
--  Role Table
-- =========================
CREATE TABLE IF NOT EXISTS Role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Insert default roles
INSERT IGNORE INTO Role (id, name) VALUES
(1, 'Super Admin'),
(2, 'Organization Admin'),
(3, 'Employee'),
(4, 'Viewer');

-- =========================
--  Organization Table
-- =========================
CREATE TABLE IF NOT EXISTS Organization (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
--  UserAccount Table
-- =========================
CREATE TABLE IF NOT EXISTS UserAccount (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    password VARCHAR(200) NOT NULL,
    email VARCHAR(64) NOT NULL UNIQUE,
    whatsApp VARCHAR(64),
    usertypeId INT NOT NULL,
    organizationId INT NOT NULL,
    FOREIGN KEY (usertypeId) REFERENCES Role(id),
    FOREIGN KEY (organizationId) REFERENCES Organization(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
--  TRIGGERS to prevent unauthorized role creation
-- =========================
DELIMITER $$

CREATE TRIGGER before_user_insert
BEFORE INSERT ON UserAccount
FOR EACH ROW
BEGIN
    -- Prevent direct creation of Super Admin (1) or Org Admin (2)
    IF NEW.usertypeId IN (1, 2) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot create Super Admin or Organization Admin directly';
    END IF;
END$$

CREATE TRIGGER before_user_update
BEFORE UPDATE ON UserAccount
FOR EACH ROW
BEGIN
    -- Prevent changing an existing user into Super Admin or Org Admin
    IF NEW.usertypeId IN (1, 2) AND OLD.usertypeId NOT IN (1, 2) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot promote user to Super Admin or Organization Admin directly';
    END IF;
END$$

DELIMITER ;
