-- ============================================================================
-- Eco Sudar — Inventory clean reset for fresh testing
-- ----------------------------------------------------------------------------
-- WIPES all transactional inventory data so every zone starts at 0 and you can
-- test the allocation engine from scratch.
--
-- KEEPS master data: inventory_products, inventory_zones, and dealer users.
--
-- Uses DELETE (not TRUNCATE) in foreign-key-safe order, because MySQL blocks
-- TRUNCATE on any table referenced by a foreign key.
--
-- Safe to run multiple times. Run in phpMyAdmin → SQL tab → Go.
-- BACK UP FIRST if this database has anything you want to keep.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Child tables first (they reference movements), then the rest.
DELETE FROM inventory_approvals;
DELETE FROM inventory_audit_log;
DELETE FROM inventory_stock_movements;
DELETE FROM inventory_reorder_suggestions;
DELETE FROM inventory_dealer_demand;
DELETE FROM inventory_stock;

-- Reset auto-increment counters so new rows start at 1.
ALTER TABLE inventory_approvals          AUTO_INCREMENT = 1;
ALTER TABLE inventory_audit_log          AUTO_INCREMENT = 1;
ALTER TABLE inventory_stock_movements    AUTO_INCREMENT = 1;
ALTER TABLE inventory_reorder_suggestions AUTO_INCREMENT = 1;
ALTER TABLE inventory_dealer_demand      AUTO_INCREMENT = 1;
ALTER TABLE inventory_stock              AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- OPTIONAL — start with brand-new products too (uncomment to also wipe the
-- product master). Leave commented to keep your existing products.
-- ----------------------------------------------------------------------------
-- SET FOREIGN_KEY_CHECKS = 0;
-- DELETE FROM inventory_products;
-- ALTER TABLE inventory_products AUTO_INCREMENT = 1;
-- SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- Verify (optional): all should return 0.
-- ----------------------------------------------------------------------------
-- SELECT COUNT(*) AS movements  FROM inventory_stock_movements;
-- SELECT COUNT(*) AS stock_rows FROM inventory_stock;
