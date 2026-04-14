-- ============================================
-- ECO SUDAR APP - COMPLETE DATABASE SCHEMA
-- Compatible with Hostinger Backend
-- ============================================
-- This schema combines workspace requirements with Hostinger structure
-- Includes: Authentication, Products, Orders, Statistics, Audit
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS eco_sudar_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE eco_sudar_db;

-- ============================================
-- DROP EXISTING TABLES (Clean slate)
-- ============================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_configurations;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
DROP VIEW IF EXISTS v_active_orders;
DROP VIEW IF EXISTS v_order_statistics;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('customer', 'dealer') NOT NULL DEFAULT 'customer',
    company_name VARCHAR(150),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    udyam_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_user_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_type ENUM('pellets', 'biomass-stove', 'biomass-burner') NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20),
    category VARCHAR(100),
    gcv VARCHAR(50),
    ash_content VARCHAR(50),
    moisture_content VARCHAR(50),
    tag VARCHAR(100),
    tag_color VARCHAR(20),
    suitable_for TEXT,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_type (product_type),
    INDEX idx_category (category),
    INDEX idx_is_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: product_configurations
-- ============================================
CREATE TABLE product_configurations (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    purpose VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_size (size)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: orders
-- ============================================
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 150.00,
    order_status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    delivery_address TEXT,
    delivery_city VARCHAR(50),
    delivery_state VARCHAR(50),
    delivery_pincode VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_order_status (order_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: order_items
-- ============================================
CREATE TABLE order_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    config_id INT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    size VARCHAR(50),
    purpose VARCHAR(100),
    sub_purpose VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES product_configurations(config_id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: settings
-- ============================================
CREATE TABLE settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: audit_log
-- ============================================
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: otp_verifications
-- ============================================
CREATE TABLE otp_verifications (
    otp_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    identifier VARCHAR(100) NOT NULL,
    identifier_type ENUM('phone', 'email') NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('password_reset', 'phone_verification', 'email_verification') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_identifier (identifier),
    INDEX idx_otp_code (otp_code),
    INDEX idx_expires_at (expires_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEWS
-- ============================================

-- View: Active Orders
CREATE VIEW v_active_orders AS
SELECT 
    o.order_id,
    o.order_number,
    u.name AS customer_name,
    u.email,
    u.phone,
    u.user_type,
    o.total_amount,
    o.order_status,
    o.payment_status,
    o.created_at,
    COUNT(oi.item_id) AS total_items
FROM orders o
JOIN users u ON o.user_id = u.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_status NOT IN ('delivered', 'cancelled')
GROUP BY o.order_id, o.order_number, u.name, u.email, u.phone, u.user_type,
         o.total_amount, o.order_status, o.payment_status, o.created_at;

-- View: Order Statistics
CREATE VIEW v_order_statistics AS
SELECT 
    DATE(created_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS avg_order_value,
    COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) AS delivered_orders,
    COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) AS cancelled_orders,
    COUNT(CASE WHEN order_status IN ('pending', 'confirmed', 'processing', 'shipped') THEN 1 END) AS active_orders
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- ============================================
-- SAMPLE DATA - PRODUCTS
-- ============================================
INSERT INTO products (product_name, product_type, description, base_price, category, gcv, ash_content, moisture_content, tag, tag_color, suitable_for, is_available) VALUES
('Biomass Pellets', 'pellets', 'Premium quality biomass pellets made from agro residue', 8.50, 'pellets', '4200 Kcal/kg', '< 3%', '< 8%', 'Most Used 🔥', '#F59E0B', 'Boilers, Gasifiers, Direct combustion', TRUE),
('Biomass Stove', 'biomass-stove', 'Compressed biomass briquettes for industrial use', 7.00, 'briquettes', '3800 Kcal/kg', '< 5%', '< 10%', 'Eco Choice 🌿', '#1DB954', 'Industrial dryers, Brick kilns', TRUE),
('Biomass Burner', 'biomass-burner', 'Natural wood chips for biomass gasifiers', 5.50, 'chips', '3500 Kcal/kg', '< 7%', '< 7%', 'Best Value 💰', '#3B82F6', 'Gasifiers, Biomass boilers', TRUE);

-- ============================================
-- SAMPLE DATA - PRODUCT CONFIGURATIONS
-- ============================================
-- Biomass Pellets configurations
INSERT INTO product_configurations (product_id, size, purpose, price, is_available) VALUES
(1, '6mm', 'Commercial Kitchen', 8.50, TRUE),
(1, '6mm', 'Industrial Dryer', 8.50, TRUE),
(1, '8mm', 'Commercial Kitchen', 8.50, TRUE),
(1, '8mm', 'Industrial Dryer', 8.50, TRUE),
(1, '10mm', 'Commercial Kitchen', 8.50, TRUE),
(1, '10mm', 'Industrial Dryer', 8.50, TRUE);

-- Biomass Stove configurations
INSERT INTO product_configurations (product_id, size, purpose, price, is_available) VALUES
(2, '1kg', 'Commercial Kitchen', 7.00, TRUE),
(2, '1kg', 'Hotel', 7.00, TRUE),
(2, '3kg', 'Commercial Kitchen', 21.00, TRUE),
(2, '3kg', 'Hotel', 21.00, TRUE),
(2, '5kg', 'Commercial Kitchen', 35.00, TRUE),
(2, '5kg', 'Hotel', 35.00, TRUE),
(2, '10kg', 'Commercial Kitchen', 70.00, TRUE),
(2, '10kg', 'Hotel', 70.00, TRUE),
(2, '15kg', 'Commercial Kitchen', 105.00, TRUE),
(2, '15kg', 'Hotel', 105.00, TRUE),
(2, '25kg', 'Commercial Kitchen', 175.00, TRUE),
(2, '25kg', 'Hotel', 175.00, TRUE);

-- Biomass Burner configurations
INSERT INTO product_configurations (product_id, size, purpose, price, is_available) VALUES
(3, '50kw', 'Industrial Dryer', 275.00, TRUE),
(3, '50kw', 'Boiler', 275.00, TRUE),
(3, '100kw', 'Industrial Dryer', 550.00, TRUE),
(3, '100kw', 'Boiler', 550.00, TRUE),
(3, '150kw', 'Industrial Dryer', 825.00, TRUE),
(3, '150kw', 'Boiler', 825.00, TRUE),
(3, '200kw', 'Industrial Dryer', 1100.00, TRUE),
(3, '200kw', 'Boiler', 1100.00, TRUE),
(3, '250kw', 'Industrial Dryer', 1375.00, TRUE),
(3, '250kw', 'Boiler', 1375.00, TRUE),
(3, '300kw', 'Industrial Dryer', 1650.00, TRUE),
(3, '300kw', 'Boiler', 1650.00, TRUE);

-- ============================================
-- SAMPLE DATA - SETTINGS
-- ============================================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('delivery_fee', '150.00', 'Standard delivery fee in INR'),
('min_order_amount', '500.00', 'Minimum order amount in INR'),
('gst_rate', '18.00', 'GST rate in percentage'),
('company_name', 'Eco Sudar', 'Company name'),
('company_email', 'info@ecosudar.com', 'Company contact email'),
('company_phone', '+91-9876543210', 'Company contact phone'),
('company_address', 'Tamil Nadu, India', 'Company address'),
('order_prefix', 'ES', 'Order number prefix'),
('currency', 'INR', 'Currency code'),
('timezone', 'Asia/Kolkata', 'Application timezone'),
('jwt_secret', 'CHANGE_THIS_TO_SECURE_RANDOM_STRING', 'JWT secret key for authentication'),
('jwt_expires_in', '7d', 'JWT token expiration time');

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure: Generate Order Number
CREATE PROCEDURE sp_generate_order_number(OUT new_order_number VARCHAR(50))
BEGIN
    DECLARE order_count INT;
    DECLARE order_prefix VARCHAR(10);
    
    SELECT setting_value INTO order_prefix 
    FROM settings 
    WHERE setting_key = 'order_prefix';
    
    SELECT COUNT(*) INTO order_count FROM orders;
    
    SET new_order_number = CONCAT(
        order_prefix,
        '-',
        DATE_FORMAT(NOW(), '%Y%m%d'),
        LPAD(order_count + 1, 4, '0')
    );
END //

-- Procedure: Get User Orders
CREATE PROCEDURE sp_get_user_orders(IN p_user_id INT)
BEGIN
    SELECT 
        o.order_id,
        o.order_number,
        o.total_amount,
        o.delivery_fee,
        o.order_status,
        o.payment_status,
        o.created_at,
        COUNT(oi.item_id) AS total_items,
        SUM(oi.quantity) AS total_quantity
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.user_id = p_user_id
    GROUP BY o.order_id
    ORDER BY o.created_at DESC;
END //

-- Procedure: Get Order Details
CREATE PROCEDURE sp_get_order_details(IN p_order_id INT)
BEGIN
    -- Order header
    SELECT 
        o.*,
        u.name AS customer_name,
        u.email,
        u.phone,
        u.user_type,
        u.company_name,
        u.gst_number
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    WHERE o.order_id = p_order_id;
    
    -- Order items
    SELECT 
        oi.*,
        p.product_name,
        p.product_type,
        p.description
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    WHERE oi.order_id = p_order_id;
END //

-- Procedure: Get Active Orders Count
CREATE PROCEDURE sp_get_active_orders_count()
BEGIN
    SELECT COUNT(*) AS active_orders_count
    FROM orders
    WHERE order_status IN ('pending', 'confirmed', 'processing', 'shipped');
END //

-- Procedure: Get Order Statistics
CREATE PROCEDURE sp_get_order_statistics(IN p_days INT)
BEGIN
    SELECT 
        DATE(created_at) AS order_date,
        COUNT(*) AS total_orders,
        SUM(total_amount) AS total_revenue,
        AVG(total_amount) AS avg_order_value,
        COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) AS delivered_orders,
        COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) AS cancelled_orders
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL p_days DAY)
    GROUP BY DATE(created_at)
    ORDER BY order_date DESC;
END //

DELIMITER ;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Additional composite indexes for common queries
CREATE INDEX idx_orders_user_status ON orders(user_id, order_status);
CREATE INDEX idx_orders_status_created ON orders(order_status, created_at);
CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);
CREATE INDEX idx_products_type_available ON products(product_type, is_available);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup:
-- SELECT COUNT(*) AS total_users FROM users;
-- SELECT COUNT(*) AS total_products FROM products;
-- SELECT COUNT(*) AS total_configurations FROM product_configurations;
-- SELECT COUNT(*) AS total_orders FROM orders;
-- SELECT * FROM v_active_orders;
-- SELECT * FROM v_order_statistics;
-- CALL sp_generate_order_number(@order_num);
-- SELECT @order_num;

-- ============================================
-- END OF DATABASE SETUP
-- ============================================
-- Database: eco_sudar_db
-- Tables: 7 (users, products, product_configurations, orders, order_items, settings, audit_log)
-- Views: 2 (v_active_orders, v_order_statistics)
-- Stored Procedures: 5
-- Sample Data: Included (3 products, 30 configurations, settings)
-- ============================================