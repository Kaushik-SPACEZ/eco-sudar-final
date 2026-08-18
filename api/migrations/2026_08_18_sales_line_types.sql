-- Line-item types for sales documents + invoices: product | spare | service.
--
--   product  -> finished goods  (products.product_id)      — deducts finished stock on a DC
--   spare    -> spares & assets  (spares_assets.spare_id)   — deducts spare stock on a DC
--   service  -> free-text line, no stock link
--
-- Additive & backward-compatible: every existing row defaults to 'product' (product_id
-- may be null, which the UI already treats as a free-text line — nothing breaks).

ALTER TABLE sales_document_items
  ADD COLUMN IF NOT EXISTS item_type ENUM('product','spare','service') NOT NULL DEFAULT 'product' AFTER product_id,
  ADD COLUMN IF NOT EXISTS spare_id INT NULL AFTER item_type;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS item_type ENUM('product','spare','service') NOT NULL DEFAULT 'product' AFTER description,
  ADD COLUMN IF NOT EXISTS product_id INT NULL AFTER item_type,
  ADD COLUMN IF NOT EXISTS spare_id INT NULL AFTER product_id;
