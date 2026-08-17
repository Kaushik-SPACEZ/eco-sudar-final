-- Performance indexes for the revenue / P&L / dashboard queries.
-- These all filter by payment_status + created_at, which had no covering index.
-- Run AFTER add_invoice_payment_status.sql (needs invoices.payment_status to exist).
-- If any line errors with "Duplicate key name", that index already exists — skip it.

-- Revenue/finance: orders WHERE payment_status='paid' AND created_at BETWEEN ...
ALTER TABLE `orders`
  ADD INDEX `idx_orders_payment_created` (`payment_status`, `created_at`);

-- Revenue/finance: invoices WHERE payment_status='paid' AND order_id IS NULL AND created_at BETWEEN ...
ALTER TABLE `invoices`
  ADD INDEX `idx_invoices_payment_order_created` (`payment_status`, `order_id`, `created_at`);

-- Invoice list is ORDER BY created_at DESC with date-range filters
ALTER TABLE `invoices`
  ADD INDEX `idx_invoices_created` (`created_at`);

-- ─── Whole-database pass: list endpoints that sort by created_at on growing tables ───
-- Each admin list does "... ORDER BY created_at DESC LIMIT ?" with no covering index,
-- forcing a filesort over the full table as the data grows.

-- Customer list (AdminUserController: ORDER BY created_at / dynamic sort)
ALTER TABLE `users`
  ADD INDEX `idx_users_created` (`created_at`);

-- Customer queries list (AdminQueryController: ORDER BY created_at DESC)
ALTER TABLE `queries`
  ADD INDEX `idx_queries_created` (`created_at`);

-- Quotes list (AdminQuoteController: ORDER BY created_at DESC)
ALTER TABLE `quotes`
  ADD INDEX `idx_quotes_created` (`created_at`);

-- Chat history loads one session ordered by time → composite avoids a per-session filesort
ALTER TABLE `chat_messages`
  ADD INDEX `idx_chat_session_created` (`session_id`, `created_at`);
