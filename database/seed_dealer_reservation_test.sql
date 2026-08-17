-- ============================================================================
-- Eco Sudar — Seed ONE dealer reservation to test fix #3 (dealer reserved stock)
-- ----------------------------------------------------------------------------
-- Creates a demand profile so the Smart Allocation engine will reserve stock
-- for a dealer on the next receipt of that product.
--
-- Dealer  : first dealer whose name matches 'Boopathi'  (edit if needed)
-- Product : Bio Energy Pellets 5kg  (SKU BEP-5KG-001)
-- Reserve : 50 kg, 90% confidence
--
-- Run in phpMyAdmin → SQL tab → Go. Safe to re-run (updates the same row).
-- ============================================================================

INSERT INTO inventory_dealer_demand
    (dealer_id, inv_product_id, avg_monthly_consumption, last_order_quantity,
     last_order_date, predicted_next_order_date, suggested_reserve_qty, confidence_score)
SELECT
    u.user_id,
    p.inv_product_id,
    40.000,                              -- avg monthly consumption
    50.000,                              -- last order qty
    CURDATE() - INTERVAL 20 DAY,         -- last order date
    CURDATE() + INTERVAL 10 DAY,         -- predicted next order
    50.000,                              -- suggested reserve qty  ← engine reserves this
    90.00                                -- confidence score
FROM users u
CROSS JOIN inventory_products p
WHERE u.user_type = 'dealer'
  AND u.name LIKE '%Boopathi%'
  AND p.sku = 'BEP-5KG-001'
ORDER BY u.user_id ASC
LIMIT 1
ON DUPLICATE KEY UPDATE
    suggested_reserve_qty = VALUES(suggested_reserve_qty),
    confidence_score      = VALUES(confidence_score),
    predicted_next_order_date = VALUES(predicted_next_order_date);

-- Verify the row was created (should return 1 row with reserve = 50):
SELECT u.name AS dealer, p.name AS product, d.suggested_reserve_qty, d.confidence_score
FROM inventory_dealer_demand d
JOIN users u ON u.user_id = d.dealer_id
JOIN inventory_products p ON p.inv_product_id = d.inv_product_id;
