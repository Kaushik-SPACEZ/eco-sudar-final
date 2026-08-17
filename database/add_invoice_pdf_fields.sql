-- Adds the PDF-detail fields to invoices so they can be edited inside the
-- Edit Invoice dialog and saved (replacing the old "Prepare Template PDF" popup).
-- When any column is left blank, the PDF falls back to the auto-generated value.
-- Run once in phpMyAdmin.

ALTER TABLE `invoices`
  ADD COLUMN `invoice_date`    DATE         NULL AFTER `due_date`,
  ADD COLUMN `payment_terms`   VARCHAR(100) NULL AFTER `invoice_date`,
  ADD COLUMN `place_of_supply` VARCHAR(100) NULL AFTER `payment_terms`,
  ADD COLUMN `ship_to`         TEXT         NULL AFTER `place_of_supply`,
  ADD COLUMN `subject`         VARCHAR(255) NULL AFTER `ship_to`;
