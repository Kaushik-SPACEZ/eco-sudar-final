-- Split customer_address into separate columns on invoices table
-- customer_address keeps the address line (street/area)
-- Run once in phpMyAdmin

ALTER TABLE `invoices`
  ADD COLUMN `customer_city`    VARCHAR(100) DEFAULT NULL AFTER `customer_address`,
  ADD COLUMN `customer_pincode` VARCHAR(20)  DEFAULT NULL AFTER `customer_city`,
  ADD COLUMN `customer_country` VARCHAR(100) DEFAULT NULL AFTER `customer_pincode`;
