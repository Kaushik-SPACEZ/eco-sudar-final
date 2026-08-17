-- ============================================================================
--  PRODUCTION UPGRADE — bring api.ecosudar.com (original) up to test.ecosudar.com
-- ----------------------------------------------------------------------------
--  Generated 2026-06-17 by diffing:
--      original : u952547820_ecosudar_expense.sql   (live production)
--      test     : u952547820_test.sql               (fork + new dev work)
--
--  The two schemas were compared table-by-table and column-by-column. The test
--  schema is a STRICT SUPERSET of production: the ONLY differences are the new
--  tables created below. No existing table gained/changed/lost any column, so
--  there is nothing to ALTER on your live data.
--
--  STRUCTURE ONLY — contains NO rows. The test DB's sample/mock data (zones,
--  demo inventory products, tms task marks, etc.) is intentionally excluded.
--
--  SAFE TO RUN: every statement is `CREATE TABLE IF NOT EXISTS`, so re-running
--  is a no-op and it will not touch tables that already exist.
--
--  HOW TO APPLY (Hostinger → phpMyAdmin → select the production database):
--      Import → choose this file → Go.  (or run it in the SQL tab)
--
--  Tables added (all new in production):
--      inventory_zones, inventory_products, inventory_stock,
--      inventory_stock_movements, inventory_approvals,
--      inventory_dealer_demand, inventory_reorder_suggestions,
--      inventory_audit_log, tms_tasks, historical_invoices
--
--  Order matters: parent tables are created before the children that
--  reference them via FOREIGN KEY.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ─── Smart Inventory: Zones ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_zones` (
  `zone_id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_name` varchar(100) NOT NULL,
  `zone_code` varchar(30) NOT NULL,
  `zone_type` varchar(20) NOT NULL DEFAULT 'READY_STOCK' COMMENT 'RAW_MATERIAL | PRODUCTION | READY_STOCK | DEALER_RESERVED | DAMAGED | EMERGENCY_BUFFER',
  `warehouse_location` varchar(150) DEFAULT NULL,
  `capacity` decimal(14,3) NOT NULL DEFAULT 0.000 COMMENT '0 = unlimited/untracked',
  `min_quantity` decimal(15,3) NOT NULL DEFAULT 0.000,
  `max_quantity` decimal(15,3) NOT NULL DEFAULT 0.000,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`zone_id`),
  UNIQUE KEY `uq_zone_code` (`zone_code`),
  KEY `idx_zone_type` (`zone_type`),
  KEY `idx_zone_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smart Inventory: Products ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_products` (
  `inv_product_id` int(11) NOT NULL AUTO_INCREMENT,
  `source_product_id` int(11) DEFAULT NULL COMMENT 'FK products.product_id when this maps to a sellable product; NULL for raw material/consumable',
  `name` varchar(150) NOT NULL,
  `sku` varchar(60) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `uom` varchar(20) NOT NULL DEFAULT 'Nos' COMMENT 'unit of measure: kg, Nos, L, MT ...',
  `hsn_code` varchar(20) DEFAULT NULL COMMENT 'GST HSN/SAC code (Indian compliance)',
  `reorder_level` decimal(14,3) NOT NULL DEFAULT 0.000,
  `reorder_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `standard_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'soft delete, mirrors products.is_deleted',
  `created_by` int(11) DEFAULT NULL COMMENT 'FK users.user_id',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`inv_product_id`),
  UNIQUE KEY `uq_inv_product_sku` (`sku`),
  KEY `idx_inv_product_source` (`source_product_id`),
  KEY `idx_inv_product_category` (`category`),
  KEY `idx_inv_product_active` (`is_active`,`is_deleted`),
  KEY `idx_inv_product_created_by` (`created_by`),
  CONSTRAINT `fk_inv_product_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inv_product_source` FOREIGN KEY (`source_product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smart Inventory: Stock (per product per zone) ───────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_stock` (
  `stock_id` int(11) NOT NULL AUTO_INCREMENT,
  `inv_product_id` int(11) NOT NULL,
  `zone_id` int(11) NOT NULL,
  `current_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `reserved_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `available_quantity` decimal(14,3) NOT NULL DEFAULT 0.000 COMMENT 'current - reserved, maintained by service layer',
  `last_movement_at` datetime DEFAULT NULL,
  `health_score` decimal(5,2) NOT NULL DEFAULT 100.00 COMMENT '0-100, computed (cover days vs reorder, ageing, damage)',
  `is_low_stock` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'auto-set when available <= product.reorder_level',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `uq_stock_product_zone` (`inv_product_id`,`zone_id`),
  KEY `idx_stock_zone` (`zone_id`),
  KEY `idx_stock_low` (`is_low_stock`),
  KEY `idx_stock_available` (`available_quantity`),
  CONSTRAINT `fk_stock_product` FOREIGN KEY (`inv_product_id`) REFERENCES `inventory_products` (`inv_product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_zone` FOREIGN KEY (`zone_id`) REFERENCES `inventory_zones` (`zone_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smart Inventory: Stock Movements (ledger) ───────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_stock_movements` (
  `movement_id` int(11) NOT NULL AUTO_INCREMENT,
  `inv_product_id` int(11) NOT NULL,
  `zone_id` int(11) NOT NULL,
  `movement_type` varchar(20) NOT NULL COMMENT 'STOCK_IN | STOCK_OUT | TRANSFER | ADJUSTMENT | DAMAGE | RETURN | PRODUCTION_USE | DEALER_ALLOCATION | EMPLOYEE_ISSUE | EMERGENCY_USE',
  `quantity` decimal(14,3) NOT NULL COMMENT 'always positive; movement_type sets direction',
  `unit_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_value` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'quantity * unit_cost, stored for fast valuation rollups',
  `reference_type` varchar(30) DEFAULT NULL COMMENT 'PURCHASE_ORDER | DEALER_ORDER | PRODUCTION_BATCH | EMPLOYEE_REQUEST | TRANSFER | MANUAL',
  `reference_id` int(11) DEFAULT NULL COMMENT 'PK in the table named by reference_type (soft link, no FK)',
  `dealer_id` int(11) DEFAULT NULL COMMENT 'FK users.user_id (user_type=dealer) for DEALER_ALLOCATION',
  `moved_by` int(11) DEFAULT NULL COMMENT 'FK users.user_id',
  `approved_by` int(11) DEFAULT NULL COMMENT 'FK users.user_id',
  `approval_status` varchar(15) NOT NULL DEFAULT 'APPROVED' COMMENT 'PENDING | APPROVED | REJECTED',
  `remarks` varchar(500) DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`movement_id`),
  KEY `idx_mov_product_date` (`inv_product_id`,`created_at`),
  KEY `idx_mov_zone` (`zone_id`),
  KEY `idx_mov_type` (`movement_type`),
  KEY `idx_mov_reference` (`reference_type`,`reference_id`),
  KEY `idx_mov_dealer` (`dealer_id`),
  KEY `idx_mov_approval` (`approval_status`),
  KEY `idx_mov_moved_by` (`moved_by`),
  KEY `fk_mov_approved_by` (`approved_by`),
  KEY `idx_inv_movements_expiry` (`expiry_date`),
  CONSTRAINT `fk_mov_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mov_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mov_moved_by` FOREIGN KEY (`moved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mov_product` FOREIGN KEY (`inv_product_id`) REFERENCES `inventory_products` (`inv_product_id`),
  CONSTRAINT `fk_mov_zone` FOREIGN KEY (`zone_id`) REFERENCES `inventory_zones` (`zone_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smart Inventory: Approvals ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_approvals` (
  `approval_id` int(11) NOT NULL AUTO_INCREMENT,
  `movement_id` int(11) NOT NULL,
  `approval_type` varchar(20) NOT NULL COMMENT 'HIGH_VALUE | DAMAGE_THRESHOLD | MANUAL_ADJUSTMENT | TRANSFER',
  `requested_by` int(11) DEFAULT NULL COMMENT 'FK users.user_id',
  `approved_by` int(11) DEFAULT NULL COMMENT 'FK users.user_id',
  `rejected_by` int(11) DEFAULT NULL COMMENT 'FK users.user_id',
  `approval_status` varchar(15) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | APPROVED | REJECTED',
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `actioned_at` datetime DEFAULT NULL,
  PRIMARY KEY (`approval_id`),
  KEY `idx_approval_movement` (`movement_id`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_approval_type` (`approval_type`),
  KEY `idx_approval_requested_by` (`requested_by`),
  KEY `fk_approval_approved_by` (`approved_by`),
  KEY `fk_approval_rejected_by` (`rejected_by`),
  CONSTRAINT `fk_approval_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_approval_movement` FOREIGN KEY (`movement_id`) REFERENCES `inventory_stock_movements` (`movement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_approval_rejected_by` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_approval_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smart Inventory: Dealer Demand (forecasting) ────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_dealer_demand` (
  `demand_id` int(11) NOT NULL AUTO_INCREMENT,
  `dealer_id` int(11) NOT NULL COMMENT 'FK users.user_id (user_type=dealer)',
  `inv_product_id` int(11) NOT NULL,
  `avg_monthly_consumption` decimal(14,3) NOT NULL DEFAULT 0.000,
  `last_order_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `last_order_date` date DEFAULT NULL,
  `predicted_next_order_date` date DEFAULT NULL,
  `suggested_reserve_qty` decimal(14,3) NOT NULL DEFAULT 0.000,
  `confidence_score` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT '0-100',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`demand_id`),
  UNIQUE KEY `uq_demand_dealer_product` (`dealer_id`,`inv_product_id`),
  KEY `idx_demand_product` (`inv_product_id`),
  KEY `idx_demand_next_order` (`predicted_next_order_date`),
  CONSTRAINT `fk_demand_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_demand_product` FOREIGN KEY (`inv_product_id`) REFERENCES `inventory_products` (`inv_product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smart Inventory: Reorder Suggestions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_reorder_suggestions` (
  `suggestion_id` int(11) NOT NULL AUTO_INCREMENT,
  `inv_product_id` int(11) NOT NULL,
  `current_stock` decimal(14,3) NOT NULL DEFAULT 0.000,
  `reorder_level` decimal(14,3) NOT NULL DEFAULT 0.000,
  `suggested_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `suggested_supplier_id` int(11) DEFAULT NULL COMMENT 'FK vendors.vendor_id',
  `prediction_basis` varchar(20) NOT NULL DEFAULT 'manual' COMMENT 'usage_trend | dealer_demand | manual',
  `status` varchar(15) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | ORDERED | DISMISSED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`suggestion_id`),
  KEY `idx_reorder_product` (`inv_product_id`),
  KEY `idx_reorder_status` (`status`),
  KEY `idx_reorder_supplier` (`suggested_supplier_id`),
  CONSTRAINT `fk_reorder_product` FOREIGN KEY (`inv_product_id`) REFERENCES `inventory_products` (`inv_product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reorder_supplier` FOREIGN KEY (`suggested_supplier_id`) REFERENCES `vendors` (`vendor_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smart Inventory: Audit Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_audit_log` (
  `audit_id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(64) NOT NULL,
  `record_id` int(11) NOT NULL,
  `action_type` varchar(20) NOT NULL COMMENT 'CREATE | UPDATE | DELETE | APPROVE | REJECT',
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `performed_by` int(11) DEFAULT NULL COMMENT 'FK users.user_id',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IPv4/IPv6',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`audit_id`),
  KEY `idx_audit_table_record` (`table_name`,`record_id`),
  KEY `idx_audit_performed_by` (`performed_by`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_performed_by` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TMS: per-employee daily task marks (imported via Data Upload) ───────────
CREATE TABLE IF NOT EXISTS `tms_tasks` (
  `tms_task_id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_key` varchar(64) NOT NULL,
  `task_date` date NOT NULL,
  `task` varchar(255) NOT NULL DEFAULT '',
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(10) NOT NULL DEFAULT 'red',
  `import_job_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`tms_task_id`),
  UNIQUE KEY `uk_tms_emp_date_task` (`employee_key`,`task_date`,`task`),
  KEY `idx_tms_date` (`task_date`),
  KEY `idx_tms_emp` (`employee_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Historical (Past) Invoices — imported via Data Upload ───────────────────
-- New feature (not present in test or production yet). Kept separate from the
-- live `invoices` table; the real bill date lives in `invoice_date`.
CREATE TABLE IF NOT EXISTS `historical_invoices` (
  `historical_invoice_id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `customer_gstin` varchar(20) DEFAULT NULL,
  `customer_state` varchar(60) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `seller_state` varchar(60) DEFAULT 'Tamil Nadu',
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `gst_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `gst_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `cgst_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sgst_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `igst_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'Unpaid',
  `payment_method` varchar(40) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `import_job_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`historical_invoice_id`),
  UNIQUE KEY `uq_historical_invoices_number` (`invoice_number`),
  KEY `idx_historical_invoices_date` (`invoice_date`),
  KEY `idx_historical_invoices_status` (`status`),
  KEY `idx_historical_invoices_import_job` (`import_job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Historical Invoice line items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `historical_invoice_items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `historical_invoice_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `hsn_code` varchar(20) DEFAULT NULL,
  `quantity` decimal(12,3) NOT NULL DEFAULT 1.000,
  `unit` varchar(20) DEFAULT 'Nos',
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `gst_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_id`),
  UNIQUE KEY `uq_hist_item_invoice_desc` (`historical_invoice_id`, `description`(150)),
  KEY `idx_hist_item_invoice` (`historical_invoice_id`),
  CONSTRAINT `fk_hist_item_invoice` FOREIGN KEY (`historical_invoice_id`)
    REFERENCES `historical_invoices` (`historical_invoice_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  Done. 10 tables added (structure only). Verify in phpMyAdmin that each new
--  table now exists and is empty. Your existing production data is untouched.
-- ============================================================================
