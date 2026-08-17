-- Phase 2 Purchase Order header extensions.
-- These ALTERs are additive only. On an already migrated database, skip any
-- duplicate-column or duplicate-key errors and continue with the remaining lines.

ALTER TABLE `purchase_orders`
  ADD COLUMN `reference_number` VARCHAR(80) NULL AFTER `po_number`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `shipment_preference` VARCHAR(80) NULL AFTER `expected_date`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `deliver_to_type` VARCHAR(40) NULL AFTER `shipment_preference`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `deliver_to_name` VARCHAR(160) NULL AFTER `deliver_to_type`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `deliver_to_address` TEXT NULL AFTER `deliver_to_name`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `payment_terms` VARCHAR(120) NULL AFTER `deliver_to_address`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `terms_conditions` TEXT NULL AFTER `notes`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `vendor_gstin` VARCHAR(30) NULL AFTER `vendor_state`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `gst_treatment` VARCHAR(80) NULL AFTER `vendor_gstin`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `reverse_charge` TINYINT(1) NOT NULL DEFAULT 0 AFTER `gst_treatment`;

ALTER TABLE `purchase_orders`
  ADD KEY `idx_purchase_orders_reference_number` (`reference_number`);
