-- Historical (past) invoices imported via Data Upload.
-- Kept in a SEPARATE table from `invoices` so that legacy/migrated billing data
-- never mixes with live order-linked invoices, GST filing, or receivables.
-- The real bill date lives in `invoice_date` (not created_at, which is the import time),
-- so the Invoices page "Past" view can filter/sort by the actual historical date.
-- Additive migration — safe to re-run.

CREATE TABLE IF NOT EXISTS `historical_invoices` (
  `historical_invoice_id` INT NOT NULL AUTO_INCREMENT,
  `invoice_number` VARCHAR(50) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE NULL,
  `customer_name` VARCHAR(150) NULL,
  `customer_gstin` VARCHAR(20) NULL,
  `customer_state` VARCHAR(60) NULL,
  `customer_address` TEXT NULL,
  `seller_state` VARCHAR(60) NULL DEFAULT 'Tamil Nadu',
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `gst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `cgst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sgst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `igst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
  `payment_method` VARCHAR(40) NULL,
  `notes` TEXT NULL,
  `import_job_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`historical_invoice_id`),
  UNIQUE KEY `uq_historical_invoices_number` (`invoice_number`),
  KEY `idx_historical_invoices_date` (`invoice_date`),
  KEY `idx_historical_invoices_status` (`status`),
  KEY `idx_historical_invoices_import_job` (`import_job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
