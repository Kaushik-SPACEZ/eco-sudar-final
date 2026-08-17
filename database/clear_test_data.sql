-- ============================================================
--  EcoSudar — Clear Test Data
--  Deletes ALL rows from: orders, invoices, reports
--  and every dependent child table.
--  Safe to run multiple times (TRUNCATE resets AUTO_INCREMENT).
--  Does NOT touch: users, products, employees, settings, etc.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. GST records linked to invoices
TRUNCATE TABLE `gst_records`;

-- 2. Invoice line items
TRUNCATE TABLE `invoice_items`;

-- 3. Finance records (reference invoice_id or expense_id)
--    Only remove rows that reference invoices/orders — leave expense rows intact
DELETE FROM `finance_records`
WHERE `category` IN ('Sales', 'Invoice', 'Order')
   OR `record_type` = 'Income';

-- 4. Invoices
TRUNCATE TABLE `invoices`;

-- 5. Order line items
TRUNCATE TABLE `order_items`;

-- 6. Orders
TRUNCATE TABLE `orders`;

-- 7. Reports
TRUNCATE TABLE `reports`;

-- 8. Audit log entries related to orders/invoices (optional — comment out to keep audit trail)
DELETE FROM `audit_log`
WHERE `table_name` IN ('orders', 'order_items', 'invoices', 'invoice_items', 'gst_records', 'reports');

SET FOREIGN_KEY_CHECKS = 1;

-- Verify counts (should all be 0)
SELECT 'orders'        AS tbl, COUNT(*) AS remaining FROM `orders`
UNION ALL
SELECT 'order_items',          COUNT(*) FROM `order_items`
UNION ALL
SELECT 'invoices',             COUNT(*) FROM `invoices`
UNION ALL
SELECT 'invoice_items',        COUNT(*) FROM `invoice_items`
UNION ALL
SELECT 'gst_records',          COUNT(*) FROM `gst_records`
UNION ALL
SELECT 'reports',              COUNT(*) FROM `reports`;
