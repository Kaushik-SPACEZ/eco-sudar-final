-- Line items for historical (past) invoices imported via Data Upload.
-- One row per product line on a historical invoice. Mirrors invoice_items but
-- belongs to the separate historical_invoices table.
-- Re-import idempotency: UNIQUE (historical_invoice_id, description prefix) so
-- re-uploading the same file updates the line instead of duplicating it.
-- Additive migration — safe to re-run. Run AFTER create_historical_invoices.sql.

CREATE TABLE IF NOT EXISTS `historical_invoice_items` (
  `item_id` INT NOT NULL AUTO_INCREMENT,
  `historical_invoice_id` INT NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `hsn_code` VARCHAR(20) NULL,
  `quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
  `unit` VARCHAR(20) NULL DEFAULT 'Nos',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `line_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_id`),
  UNIQUE KEY `uq_hist_item_invoice_desc` (`historical_invoice_id`, `description`(150)),
  KEY `idx_hist_item_invoice` (`historical_invoice_id`),
  CONSTRAINT `fk_hist_item_invoice` FOREIGN KEY (`historical_invoice_id`)
    REFERENCES `historical_invoices` (`historical_invoice_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
