-- EcoSudar Database Schema
-- Run this SQL script in your Hostinger MySQL database

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS ecosudar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecosudar_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table (Updated with all required fields from app)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    gcv VARCHAR(50),
    ash VARCHAR(50),
    tag VARCHAR(100),
    tag_color VARCHAR(20),
    suitable_for TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product sizes table
CREATE TABLE IF NOT EXISTS product_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type ENUM('customer', 'dealer') NOT NULL DEFAULT 'customer',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    business_name VARCHAR(255),
    contact_person VARCHAR(255),
    udyam_number VARCHAR(50),
    gst_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    purpose VARCHAR(255),
    sub_purpose VARCHAR(255),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 150.00,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_number (order_number),
    INDEX idx_user (user_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL,
    notes TEXT,
    changed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert actual products from your app
INSERT INTO products (name, description, base_price, category, gcv, ash, tag, tag_color, suitable_for, is_active) VALUES
('Biomass Pellets', 'Premium quality biomass pellets made from agro residue', 8.50, 'pellets', '4200 Kcal/kg', '< 3%', 'Most Used 🔥', '#F59E0B', 'Boilers, Gasifiers, Direct combustion', TRUE),
('Biomass Stove', 'Compressed biomass briquettes for industrial use', 7.00, 'briquettes', '3800 Kcal/kg', '< 5%', 'Eco Choice 🌿', '#1DB954', 'Industrial dryers, Brick kilns', TRUE),
('Biomass Burner', 'Natural wood chips for biomass gasifiers', 5.50, 'chips', '3500 Kcal/kg', '< 7%', 'Best Value 💰', '#3B82F6', 'Gasifiers, Biomass boilers', TRUE);

-- Insert product sizes for Biomass Pellets
INSERT INTO product_sizes (product_id, size, price, is_available) VALUES
(1, '6mm', 8.50, TRUE),
(1, '8mm', 8.50, TRUE),
(1, '10mm', 8.50, TRUE);

-- Insert product sizes for Biomass Stove
INSERT INTO product_sizes (product_id, size, price, is_available) VALUES
(2, '1kg', 7.00, TRUE),
(2, '3kg', 21.00, TRUE),
(2, '5kg', 35.00, TRUE),
(2, '10kg', 70.00, TRUE),
(2, '15kg', 105.00, TRUE),
(2, '25kg', 175.00, TRUE);

-- Insert product sizes for Biomass Burner
INSERT INTO product_sizes (product_id, size, price, is_available) VALUES
(3, '50kw', 275.00, TRUE),
(3, '100kw', 550.00, TRUE),
(3, '150kw', 825.00, TRUE),
(3, '200kw', 1100.00, TRUE),
(3, '250kw', 1375.00, TRUE),
(3, '300kw', 1650.00, TRUE);