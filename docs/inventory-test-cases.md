# Smart Inventory — Test Cases

Manual / QA test checklist for the Smart Inventory Management module
(Prompts 1–10). Use this checklist before each deployment to confirm
the module behaves correctly end-to-end.

## Stock Receiving Tests

- [ ] Receive stock with valid product, zone, quantity, unit cost → STOCK_IN movement created, balance increases
- [ ] Receive stock triggers Smart Allocation (auto-routes to dealer reservation, production, ready stock, raw material, or emergency buffer per priority)
- [ ] Receive stock with attachment (PDF/JPG/PNG, ≤5 MB) → attachment stored and linked to movement
- [ ] Receive stock with attachment over 5 MB → rejected with 422
- [ ] Receive stock with attachment of disallowed type (e.g. .docx) → rejected with 422
- [ ] Receive stock with invalid product_id → validation error, no movement created
- [ ] Receive stock with invalid zone_id → validation error, no movement created
- [ ] Receive stock with quantity = 0 or negative → validation error (min:0.001)
- [ ] Receive stock with quantity having more than 3 decimals → balance stored rounded to 3 decimals
- [ ] Allocation engine failure after successful receive → stock retained in intake zone, receive still returns 201
- [ ] Bulk import valid CSV (≤500 rows) → products created, audit logged per row
- [ ] Bulk import CSV with >500 rows → rejected with 422 "Maximum 500 rows per import", uploaded file removed
- [ ] Bulk import CSV missing required columns → rejected with 422 listing missing columns
- [ ] Bulk import CSV with duplicate SKU (already in DB) → row skipped, reported in `errors`
- [ ] Bulk import CSV with invalid unit_of_measure / negative reorder_level / negative cost_price → row skipped, reported in `errors`
- [ ] Bulk import CSV with unknown zone_code → row skipped, reported in `errors`
- [ ] Bulk import CSV with blank rows → blank rows silently skipped, not counted

## Movement Tests

- [ ] STOCK_OUT / TRANSFER / DAMAGE / RETURN / PRODUCTION_USE / EMPLOYEE_ISSUE / DEALER_ALLOCATION / EMERGENCY_USE / ADJUSTMENT each create a correctly-typed movement row and update balances
- [ ] Movement quantity with >3 decimals is rounded to 3 decimals before balance update
- [ ] STOCK_OUT / outflow movement that would drive available quantity negative is rejected (available = max(0, current − reserved))
- [ ] TRANSFER between two zones moves quantity out of source and into destination atomically
- [ ] TRANSFER to a zone with capacity > 0 where (current + qty) > capacity → rejected with 422 "Zone capacity exceeded"
- [ ] TRANSFER with value > ₹50,000 → creates movement with approval_status = PENDING (requires approval)
- [ ] DAMAGE movement where quantity > 10% of zone stock → requires approval
- [ ] ADJUSTMENT and EMERGENCY_USE movements always require approval
- [ ] DEALER_ALLOCATION exceeding 2× average monthly consumption → requires approval
- [ ] Concurrent movements against the same product/zone serialize correctly (no lost updates) — verified via `SELECT ... FOR UPDATE` row locking
- [ ] Movement ledger rows are never updated/deleted after creation (append-only; corrections are new rows)
- [ ] Quality check (approve) on receiving zone stock → ADJUSTMENT movement logged, health score recalculated
- [ ] Quality check (reject) → quantity moved out of source zone into DAMAGED zone via paired DAMAGE movements
- [ ] Quality check (reject) when no active DAMAGED zone exists → rejected with 422

## Approval Tests

- [ ] Movement requiring approval is created with approval_status = PENDING and does not affect balances until approved
- [ ] Approve a pending approval → movement applied, balances updated, audit logged
- [ ] Reject a pending approval → movement reversed/never applied, remarks required (min 10 chars)
- [ ] Approving/rejecting an already-actioned approval → rejected with 409 "Approval already actioned"
- [ ] User attempting to approve their own request (requested_by === approver) → rejected (self-approval blocked)
- [ ] Pending approval older than 24 hours → appears in escalation list via `/approvals/escalate`
- [ ] Pending approval older than 72 hours → auto-rejected on next `/approvals/pending` call, with system remark "Auto-rejected: approval expired after 72 hours", reserved stock released
- [ ] Approval history filters (approval_type, status, date_from, date_to) return correct subsets
- [ ] Approval stats endpoint returns counts consistent with approval table state

## Intelligence Tests

- [ ] Health score for a product with zero total stock across all zones → score = 0, risk_level = CRITICAL
- [ ] Health score for a product with reorder_level = 0 → stock-level component does not divide by zero (returns 30 / 100 as configured)
- [ ] Dead stock detection skips products created less than 7 days ago
- [ ] Dead stock detection correctly flags products ≥7 days old with no recent outflow
- [ ] Stock runout prediction for a product with no consumption history → risk = STABLE, reason = "No consumption data" (no division by zero)
- [ ] Stock runout prediction for a product with consumption history → returns a sensible days-to-runout estimate
- [ ] Reorder suggestions reflect current stock vs reorder level / reorder quantity
- [ ] Reorder generation creates STOCK_IN-pending or purchase-suggestion records as designed (no new tables/endpoints — existing behavior only)
- [ ] Priority score (0–100) for allocation reflects dealer confidence, production urgency, and stock age components

## Permission Tests

For each role (`owner`, `store_keeper`, `accountant`, `hr`, `sales`), verify:

- [ ] `owner` — full access to all inventory endpoints (read + write across products, zones, stock, movements, approvals, intelligence, reorder, finance, reports)
- [ ] `store_keeper` — full operational access (products, zones, stock receive/import, all movement types except emergency/adjustment, approvals action, intelligence/reorder read, reports) but denied `movements/emergency`, `movements/adjustment`, and `finance/inventory-*`
- [ ] `accountant` — read-only across products, zones, movements, intelligence, reorder, approvals, finance, reports; denied all write/movement/approval-action endpoints
- [ ] `hr` — read access to products and movements, plus `movements/employee-issue`; denied everything else (zones, stock, other movement types, intelligence, reorder, approvals, finance, reports)
- [ ] `sales` — read access to products and movements, plus `movements/dealer-allocation`; denied everything else
- [ ] Each denied combination returns 403 "Access denied" (or AdminMiddleware's standard denial response) and is captured by `auditDenied()`
- [ ] Unauthenticated requests to any `/admin/inventory/*` route are rejected by AuthMiddleware before reaching AdminMiddleware/controller

## Interconnection Tests

- [ ] Receiving stock → Smart Allocation Engine runs → allocation result included in receive response
- [ ] Smart Allocation placements create TRANSFER/DEALER_ALLOCATION movements with `reference_id` pointing back to the originating STOCK_IN movement
- [ ] Manual allocation override respects target zone capacity (rejected with 422 if exceeded) and records `manual_allocation` audit entry
- [ ] Approval workflow approve/reject correctly updates both `inventory_approvals` and `inventory_stock_movements.approval_status`
- [ ] Audit log (`inventory_audit_log`) contains an entry for every CREATE/UPDATE/APPROVE/REJECT mutation across products, movements, and approvals
- [ ] Health score recalculation triggers after QC approval and after allocation, keeping `inventory_stock.health_score` in sync
- [ ] Frontend dashboard, products, zones, movements, approvals, and intelligence pages all load without console/runtime errors and reflect the same backend state
- [ ] Stock figures shown in Finance (`inventory-valuation`) and Reports (`inventory/stock-summary`) match `inventory_stock` balances at the time of query
