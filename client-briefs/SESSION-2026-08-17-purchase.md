# Session Context — Purchase module hardening (2026-08-17)

**Branch:** `naresh`  ·  **Deploy target:** test.ecosudar.com only (prod `api.ecosudar.com` untouched)
**Stack:** PHP custom-MVC API (`api/`) + React + Vite + TypeScript admin (`eco-sudar-control/`)

This commit syncs the full app to GitHub. The headline work of this session is the
Purchase-module hardening below; it is bundled with prior uncommitted app work that had
already been deployed to test (e-way bills, spares & assets, production rebuild, unified
sales documents, global search / GST / Excel). All of it is live on test and verified.

---

## What was built this session (Purchase)

Three requests, all delivered and deployed to test:

### 1. Category is now a creatable dropdown
- New reusable component **`eco-sudar-control/src/components/CategoryCombobox.tsx`** —
  pick an existing category or type a new one and hit **Create "…"**.
- Categories are **not** a separate table; they are the distinct `purchase_items.category`
  values across the catalog, so "add new" is simply using a value not yet in the list.
- Wired into every place category appears in the purchase flow:
  - PO line-items table — `PurchaseOrderForm.tsx`
  - Inline **New Item** quick-create popup — `PurchaseOrderForm.tsx`
  - Standalone Item form — `PurchaseItemForm.tsx`

### 2. No two same-name items
- **On a PO:** the same item cannot appear on two lines — blocked in the UI
  (`PurchaseOrderForm.tsx`) and re-checked server-side in
  `AdminPurchaseOrderController::itemsPayload` (matched by catalog id when picked,
  else by normalized name).
- **In the catalog:** duplicate item names are rejected — server-side via new
  `PurchaseItem::existsByName()` (+ friendly client pre-check in the inline popup).

### 3. Revert available at each phase
- The **Received** phase previously had no phase-level revert (you had to void each
  goods receipt by hand). Added `received / partially_received / short_closed → issued`:
  it voids every posted goods receipt (which reverses received_qty **and** the stock
  each receipt added) and lands on `issued`, all in one transaction. Guarded so it
  refuses when a payment is already recorded.
- Frontend `PurchaseOrderDetail.tsx` now shows the **Revert** button at those phases
  with a clear confirmation of what it undoes.
- Combined with existing `issued→draft` and `billed→received`, every forward step now
  has a matching revert that cascades to the other pages (stock, expense).

### Bonus correctness fix (latent bug)
- The PO controller was silently **dropping `purchase_item_id`**, so picking a catalog
  item never persisted the link and editing/cloning a PO lost the selection.
  Now forwarded + validated in `itemsPayload`, inserted by `PurchaseOrder::replaceItems`,
  and returned by `PurchaseOrder::formatItem`. The item↔PO link now sticks.

---

## Files changed this session

**Backend (`api/`)**
- `models/PurchaseItem.php` — `existsByName()`
- `models/PurchaseOrder.php` — expose `purchase_item_id` in `formatItem`
- `controllers/admin/AdminPurchaseItemController.php` — reject duplicate item names
- `controllers/admin/AdminPurchaseOrderController.php` — forward/validate
  `purchase_item_id`, reject duplicate lines, received-phase revert (void all GRNs)

**Frontend (`eco-sudar-control/`)**
- `src/components/CategoryCombobox.tsx` (new)
- `src/pages/purchase/PurchaseOrderForm.tsx`
- `src/pages/purchase/PurchaseItemForm.tsx`
- `src/pages/purchase/PurchaseOrderDetail.tsx`

**Database:** no migration required for this session's work — the `purchase_item_id`
column already exists on test (added by `api/migrations/2026_08_17_po_item_catalog_link.sql`);
name-uniqueness is enforced in application code, not a DB constraint.

---

## Deploy status
Deployed to **test.ecosudar.com** and verified:
- Frontend bundle live and in sync (`index-CTynmDJa.js`), SPA returns `200`.
- All 4 PHP files parse clean on the server (`php -l`).
- Prod (`api.ecosudar.com`) untouched.

Suggested manual smoke test on test: pick a catalog item on a PO → save → reopen and
confirm the item + category stuck; then take a PO to Received and hit **Revert** to
confirm the stock reverses.
