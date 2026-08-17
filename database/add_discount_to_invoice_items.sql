-- Add invoice-level discount to invoices table
-- Run once in phpMyAdmin

ALTER TABLE `invoices`
  ADD COLUMN `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00
  AFTER `delivery_fee`;
