-- Add per-line unit of measure to invoice_items (kg, ton, bags, Nos, etc.)
-- Run once in phpMyAdmin

ALTER TABLE `invoice_items`
  ADD COLUMN `unit` VARCHAR(20) NOT NULL DEFAULT 'Nos'
  AFTER `quantity`;
