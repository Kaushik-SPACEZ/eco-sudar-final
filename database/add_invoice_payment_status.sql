-- Gives invoices their own payment status so manually-created invoices (no order)
-- can be marked Paid/Unpaid. For order-linked invoices it stays NULL and falls
-- back to the order's payment_status (same linking pattern as payment_method).
-- Run once in phpMyAdmin.

ALTER TABLE `invoices`
  ADD COLUMN `payment_status` VARCHAR(20) NULL AFTER `payment_method`;
