# Smart Inventory — Pre-Deployment Checklist

Use this checklist when deploying the Smart Inventory Management
module (Prompts 1–10) to a new or existing environment.

## Database

- [ ] Confirm `database/create_smart_inventory.sql` (or equivalent migration) has been run and all tables exist:
      `inventory_products`, `inventory_zones`, `inventory_stock`, `inventory_stock_movements`,
      `inventory_approvals`, `inventory_dealer_demand`, `inventory_audit_log`
- [ ] Confirm required zone types exist and are active: `READY_STOCK`, `RAW_MATERIAL`, `PRODUCTION`,
      `DEALER_RESERVED`, `EMERGENCY_BUFFER`, `DAMAGED` (at least `READY_STOCK` and `DAMAGED` are mandatory
      for the safety-net allocation and QC-reject flows to work)
- [ ] Confirm `inventory_stock.current_quantity`, `available_quantity`, `reserved_quantity`, `health_score`
      columns exist with correct types (DECIMAL for quantities)
- [ ] Confirm `inventory_approvals.approved_by` / `inventory_stock_movements.approved_by` columns are
      nullable (required for system-driven auto-expiry rejections)
- [ ] Confirm indexes exist on `inventory_stock (inv_product_id, zone_id)` for row-locking performance
- [ ] Take a database backup/snapshot before applying any schema or data changes

## Backend Files (upload order)

Upload/deploy in this order so dependencies are satisfied at each step:

1. [ ] `api/helpers/InventoryPermissions.php` (new file)
2. [ ] `api/models/InventoryProduct.php`, `InventoryZone.php`, `InventoryStock.php`, `InventoryMovement.php`
3. [ ] `api/services/MovementEngine.php`, `SmartAllocationEngine.php`, `InventoryIntelligence.php`,
       `ApprovalWorkflow.php`, `InventoryAllocation.php`
4. [ ] `api/controllers/admin/InventoryProductController.php`, `InventoryZoneController.php`,
       `InventoryStockController.php`, `InventoryMovementController.php`,
       `InventoryAllocationController.php`, `InventoryIntelligenceController.php`,
       `InventoryApprovalController.php`, `AdminFinanceController.php`, `AdminReportsController.php`
5. [ ] `api/middleware/AdminMiddleware.php` (role guard updates)
6. [ ] `api/index.php` (route table — must be deployed alongside the permission/middleware changes,
       not before, to avoid a window where new role-restricted routes 500 due to missing helpers)
- [ ] Verify `ROOT_PATH . '/helpers/InventoryPermissions.php'` is required in `api/index.php` bootstrap
- [ ] Clear any opcode cache (e.g. `opcache_reset()` or restart PHP-FPM) after deployment

## Frontend

- [ ] Run `npm install` in `eco-sudar-control/` if dependencies changed
- [ ] Run `npx tsc --noEmit -p tsconfig.app.json` from `eco-sudar-control/` — must complete with zero errors
- [ ] Run `npm run build` and confirm the production build completes without errors/warnings
- [ ] Deploy updated `dist/` (or equivalent) to the hosting target
- [ ] Confirm environment variables / API base URL point to the correct backend environment
- [ ] Hard-refresh / clear CDN cache for the admin dashboard after deployment

## Post-deployment Verification

- [ ] Log in as each role (`owner`, `store_keeper`, `accountant`, `hr`, `sales`) and confirm sidebar/menu
      access matches the permission matrix
- [ ] Perform one end-to-end stock receive (with attachment) and confirm Smart Allocation runs
- [ ] Perform one movement of each major type (TRANSFER, DAMAGE, EMPLOYEE_ISSUE, DEALER_ALLOCATION) and
      confirm balances and audit log update correctly
- [ ] Trigger one approval-required movement (e.g. ADJUSTMENT) and confirm it appears under
      `/admin/inventory/approvals/pending`
- [ ] Approve and reject one approval each, confirm balances and audit entries are correct
- [ ] Confirm `/admin/inventory/intelligence/health-scores` and `/admin/inventory/reorder/suggestions`
      return data without errors
- [ ] Confirm `/admin/finance/inventory-valuation` and `/admin/reports/inventory/stock-summary` return
      data consistent with current `inventory_stock` balances
- [ ] Tail `api/error_log` for the first 15–30 minutes after deployment, watching for new errors from
      inventory controllers/services

## Rollback Plan

- [ ] Keep a copy of the previous versions of all files listed in "Backend Files" before overwriting
- [ ] If `api/index.php` route changes cause failures, restore the previous `api/index.php` first —
      this immediately reverts to the old route guards without touching data
- [ ] If a specific controller/service causes errors, restore that individual file (all changes in this
      module are additive/refinements to existing logic — no destructive schema changes were made, so
      file-level rollback is safe)
- [ ] No new tables were created and no existing API response shapes changed, so rolling back backend
      files does not require any database rollback
- [ ] If a bad frontend build is deployed, redeploy the previous `dist/` build artifact
- [ ] After rollback, re-run the "Post-deployment Verification" checklist against the restored version

## Performance Checks

- [ ] Confirm `SELECT ... FOR UPDATE` row locks in `InventoryStock::upsertStock/reserveStock/releaseReserved`
      do not introduce noticeable latency under expected concurrent load (test with a small concurrent
      movement burst on the same product/zone)
- [ ] Confirm bulk import of a 500-row CSV completes within an acceptable time window and does not time
      out the request
- [ ] Confirm health-score and dead-stock intelligence queries (which scan `inventory_stock` /
      `inventory_stock_movements`) perform acceptably on production data volumes
- [ ] Confirm `/admin/inventory/approvals/pending` (which now also runs `expirePendingApprovals()`) does
      not introduce noticeable latency when there are many pending approvals
- [ ] Monitor `inventory_audit_log` table growth and confirm it does not impact write performance on
      `inventory_stock_movements` / `inventory_approvals`
