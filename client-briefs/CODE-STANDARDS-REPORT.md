# Code Standards Report
**Date:** 2026-08-13
**Scope:** the standards-pass changes + the new Inventory/Purchase/Sales/Finance modules on branch `naresh`
**Files checked:** 8 backend, 25 frontend (this pass's diff + the modules it covers)
**Violations found:** 0 critical, 4 warnings, 2 info

---

## CRITICAL (fix before deploy)

None. No SQL injection, no missing FKs, no unguarded financial NULLs, no data-loss paths.

---

## WARNINGS (fix before handover)

### 1. `api/index.php:254-262` — Role-based access: Inventory **writes** not role-scoped
**Line:** 254-262 (storeRawMaterial, updateRawMaterial, destroyRawMaterial, storeProduction, stockMovement, rawMaterialMovement)
**Violation:** every mutating inventory route uses the bare `'admin'` guard. Sibling modules scope writes — purchase-requests → `admin:owner,accountant,store_keeper`, PO receipts → `admin:owner,store_keeper`, test-certificates → `admin:owner,store_keeper,sales`.
**Why it matters:** any admin-role user (e.g. `sales`) can adjust finished-goods stock, delete raw materials, and log production runs — inconsistent with the rest of the app and a segregation-of-duties gap.
**Fix:** change the 6 inventory write routes to `admin:owner,store_keeper` (reads stay `'admin'`).

### 2. `api/index.php:415-420` — Role-based access: Finance reads + config write not scoped
**Line:** 415 (pnl), 416 (cash-flow), 417 (payables), 418 (ratios), 420 (`PUT` updateConfig)
**Violation:** these use bare `'admin'`, while `overlay` (413) and `ai-analysis` (414) in the same module use `admin:owner,accountant`. Pre-existing inconsistency; the new cash-flow/payables followed the looser side. Sharpest case: **`PUT /admin/finance/config` (a write to finance configuration) is open to any admin role.**
**Why it matters:** company cash position, payables ageing and P&L are sensitive; `updateConfig` mutating finance settings with no role gate is the real risk.
**Fix:** scope `updateConfig` + the financial reads to `admin:owner,accountant` to match `overlay`/`ai-analysis`.

### 3. `api/models/Inventory.php:133` — Performance: N+1 query in `productionRuns`
**Line:** 133 (`$r['consumption'] = self::runConsumption((int)$r['run_id'])` inside `array_map`)
**Violation:** one `runConsumption()` SELECT is issued per production run; the endpoint allows `limit` up to 500 ⇒ up to 500 extra queries per page load.
**Why it matters:** page latency grows linearly with rows on a list endpoint (classic N+1).
**Fix:** fetch all consumption rows for the page's `run_id`s in one `WHERE run_id IN (...)` query, then group by `run_id` in PHP.

### 4. `api/controllers/admin/AdminInventoryController.php` — Audit trail: mutations not logged to `audit_log`
**Line:** whole controller (storeRawMaterial/update/destroy, storeProduction, stockMovement)
**Violation:** 19 controllers in the codebase (AdminPurchaseOrderController, AdminPaymentController, …) write to `audit_log`; the inventory controller does not.
**Why it matters:** raw-material master edits/deletes and manual stock adjustments have no central audit entry. *Partly mitigated:* quantity changes are traceable via the `*_movements` ledger (each row carries `created_by`), so this is a lower-severity consistency gap, not a blind spot.
**Fix:** on create/update/delete of raw materials and on manual `adjust` movements, add an `audit_log` write matching the pattern in AdminPurchaseOrderController.

---

## INFO (good to know)

### 5. SRP by-the-letter — controller/model size
- `AdminInventoryController` has 13 public methods, `AdminFinanceController` has 9 (guideline flags > 5). Both are thin/cohesive (single domain) — acceptable, noted only.
- `api/models/Inventory.php` is 571 lines; could split into `RawMaterial` / `Production` / `Stock` models if it grows further.

### 6. Idempotency — production-run POST is not backend-idempotent
A double-submit of `storeProduction` creates two batches (double stock add + double raw consumption). Mitigated by the frontend saving-guard + the `onInteractOutside` guard added this pass. Optional hardening: dedupe on `(run_date, product_id, batch_number)` or accept a client idempotency key.

---

## Clean files ✅ (verified, not just unflagged)
- **SQL injection:** all queries parameterized; `Inventory::updateRawMaterial` builds SQL from a **whitelisted column map** (Inventory.php:58), not user keys.
- **Financial NULL-safety:** `COALESCE(SUM(...),0)` used throughout `AdminFinanceController` (cashFlow, payables).
- **Referential integrity:** new tables carry InnoDB FKs (proven — a fake `order_id` was rejected by `fk_sm_order` during testing).
- **Idempotency (orders):** `deductForOrder` / `restoreForOrder` both guard against re-running.
- **HCI:** new pages have saving guards, success/error toasts, loading skeletons, and `ConfirmDeleteDialog`; Dialog+Select `onInteractOutside` guard added this pass (30 dialogs / 23 files).

---

## Resolution (applied 2026-08-13, deployed to test)
- **#1 fixed** — inventory write routes (`raw-materials` POST/PUT/DELETE + movement, `production` POST, `stock` movement) scoped to `admin:owner,store_keeper` (`index.php`). Safe: `AdminMiddleware` treats legacy NULL-`staff_role` admins as `owner`, so the primary admin keeps access.
- **#2 partially fixed** — `PUT /admin/finance/config` (the write) scoped to `admin:owner,accountant`. The financial *reads* (pnl/cash-flow/payables/ratios) left as bare `'admin'` pending an access-policy decision (changing who can view financial statements is a product call, not a bug).
- **#3 fixed** — `Inventory::productionRuns` now batch-loads consumption via one `WHERE run_id IN (...)` query and groups in PHP; the per-row `runConsumption()` was removed.
- **#4 fixed** — `AdminInventoryController` now writes `audit_log` on raw-material create/update/delete and production-run create (matching the app-wide `audit()` pattern). Routine in/out movements remain audited by the movements ledger.
- **#5 / #6** — left as noted (acceptable / mitigated).

## Patterns to adopt going forward
1. **New module = pick roles up front.** Default a module's *write* routes to the tightest sensible `admin:<roles>` instead of bare `'admin'`; reserve bare `'admin'` for reads.
2. **List endpoints that return children:** fetch children with one `IN (...)` query, never per-row.
3. **Financial/master mutations:** add the `audit_log` write in the same commit as the mutation — it's the codebase norm (19 controllers).
