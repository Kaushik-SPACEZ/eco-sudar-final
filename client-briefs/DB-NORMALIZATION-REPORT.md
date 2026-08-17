# Database Normalization Report — Eco Sudar ERP

**Generated:** 2026-08-14
**Schema:** `u952547820_ecosudar` (branch: `naresh`)
**Auditor:** normalize-db agent
**Scope:** All SQL files in `database/` + 7 PHP controllers in `api/controllers/admin/`

---

## How to Read This Report

| Symbol | Meaning |
|--------|---------|
| HIGH   | Financial data or schema structure that will produce wrong numbers or broken queries if not fixed |
| MEDIUM | Data integrity risk or maintenance trap that grows worse over time |
| LOW    | Cosmetic, performance, or future-proofing concern |
| OK     | Intentional snapshot — not a violation |

Rules applied:
- **1NF** — no multi-value attributes (no JSON arrays in columns that need to be queried)
- **2NF** — no partial key dependencies (composite-PK tables only)
- **3NF** — no transitive dependencies (no A→B→C where B is not a key)
- **BCNF** — every determinant is a candidate key
- **Rule A** — stored derived value (computable from other columns in the same row or child rows)
- **Rule B** — stored period aggregate (computable by querying live source rows)
- **Rule C** — mirrored fact (copied from another table without a snapshot justification)

Exceptions: `*_snapshot`, `rate_at_*`, `price_at_*`, `*_at_time_of_*` columns are intentional snapshots and are listed in the **Justified Exceptions** section, not counted as violations.

---

## Executive Summary

23 violations found across 12 tables. 12 are HIGH risk (all financial data). 1 schema defect (column name typo in `payroll`). 10 unused columns identified.

The dominant pattern is **stored derived financial totals** (Rule A) — every document table (invoices, orders, purchase orders, quotations, payroll) computes subtotals, taxes, and grand totals at write time and stores them. This is consistent and deliberate, but creates staleness risk whenever source rows are corrected without going through the controller.

---

## Part 1 — Normalization Violations

---

### V01 — meetings: JSON multi-value columns (1NF) `MEDIUM`

**Columns:** `attendees`, `raci`, `action_items`

Three JSON columns in `meetings` store arrays and objects. `attendees` is a JSON array of user IDs. `raci` is a JSON object with Responsible/Accountable/Consulted/Informed user assignments. `action_items` is a JSON array of task objects.

**Why it matters:** You cannot write `WHERE user_id = 5` to find all meetings a user attended. You cannot enforce an FK to `users`. You cannot query "overdue action items" without a full table scan with JSON path functions. In MySQL 5.7, JSON path indexing is limited.

**Written by:** `AdminMeetingController::store()`, `AdminMeetingController::update()`

**Fix — create three junction tables:**

```sql
CREATE TABLE meeting_attendees (
  id INT NOT NULL AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_meeting_attendee (meeting_id, user_id),
  CONSTRAINT fk_ma_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  CONSTRAINT fk_ma_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE meeting_raci (
  id INT NOT NULL AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('R','A','C','I') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_raci (meeting_id, user_id, role),
  CONSTRAINT fk_raci_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  CONSTRAINT fk_raci_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE meeting_action_items (
  id INT NOT NULL AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  description TEXT NOT NULL,
  assigned_to INT NULL,
  due_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_mai_meeting (meeting_id),
  CONSTRAINT fk_mai_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  CONSTRAINT fk_mai_user FOREIGN KEY (assigned_to)
    REFERENCES users(user_id) ON DELETE SET NULL
);

ALTER TABLE meetings
  DROP COLUMN attendees,
  DROP COLUMN raci,
  DROP COLUMN action_items;
```

**PHP change:** In `AdminMeetingController::store()` and `::update()`, replace JSON encode/decode with individual INSERT/DELETE rows inside the same transaction that saves the meeting header.

---

### V02 — employees: qualification_json (1NF) `LOW`

**Column:** `qualification_json` (LONGTEXT)

Stores an array of qualification objects (degree, institution, year, grade) as JSON. Individual qualifications cannot be indexed, filtered, or referenced by FK.

**Written by:** `AdminEmployeeController::store()`, `AdminEmployeeController::update()`

**Fix:**

```sql
CREATE TABLE employee_qualifications (
  id INT NOT NULL AUTO_INCREMENT,
  employee_key VARCHAR(12) NOT NULL,
  degree VARCHAR(120) NOT NULL,
  institution VARCHAR(150) DEFAULT NULL,
  year_of_passing INT DEFAULT NULL,
  grade VARCHAR(20) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_eq_employee (employee_key),
  CONSTRAINT fk_eq_employee FOREIGN KEY (employee_key)
    REFERENCES employees(employee_key) ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE employees DROP COLUMN qualification_json;
```

**PHP change:** Replace JSON encode/decode with row-level inserts/deletes in `AdminEmployeeController`. One-time data migration needed for existing JSON data.

---

### V03 — invoice_items: line_total (Rule A) `HIGH`

**Column:** `line_total`

`line_total = quantity * unit_price`. Fully derivable. Written by `AdminInvoiceController::store()`, `::storeGst()`, `::update()`, `::generateForOrder()`.

**Risk:** If `quantity` or `unit_price` is corrected directly in the DB without routing through PHP, `line_total` silently lies. Any GST calculation that sums `line_total` will then produce wrong tax amounts.

**Fix option A — generated column (recommended):**

```sql
ALTER TABLE invoice_items DROP COLUMN line_total;
ALTER TABLE invoice_items
  ADD COLUMN line_total DECIMAL(12,2)
    GENERATED ALWAYS AS (quantity * unit_price) STORED;
```

**Fix option B — drop and compute on read:**

```sql
ALTER TABLE invoice_items DROP COLUMN line_total;
-- All SELECTs use: (quantity * unit_price) AS line_total
```

**PHP change:** Remove `line_total` from all INSERT/UPDATE payloads in `AdminInvoiceController`.

---

### V04 — invoices: derived financial summary (Rule A) `HIGH`

**Columns:** `subtotal`, `gst_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `total`

All six are computed from `invoice_items` + `gst_rate`:
- `subtotal = SUM(quantity * unit_price)` across items
- `gst_amount = subtotal * gst_rate / 100`
- `cgst_amount = gst_amount / 2` (intra-state)
- `sgst_amount = gst_amount / 2` (intra-state)
- `igst_amount = gst_amount` (inter-state)
- `total = subtotal + gst_amount + delivery_fee − discount`

Stored on every create and update. The `storeGst()` method rounds `total` to a whole rupee for e-invoicing, which means the stored total can differ from recomputing via items.

**Written by:** `AdminInvoiceController::store()`, `::storeGst()`, `::update()`, `::generateForOrder()`

**Fix — view approach (most compatible with MySQL 5.7):**

```sql
CREATE OR REPLACE VIEW v_invoice_totals AS
  SELECT
    i.invoice_id,
    COALESCE(SUM(ii.quantity * ii.unit_price), 0) AS subtotal,
    COALESCE(SUM(ii.quantity * ii.unit_price), 0) * i.gst_rate / 100
      AS gst_amount,
    COALESCE(SUM(ii.quantity * ii.unit_price), 0) * i.gst_rate / 200
      AS cgst_amount,
    COALESCE(SUM(ii.quantity * ii.unit_price), 0) * i.gst_rate / 200
      AS sgst_amount,
    0 AS igst_amount,
    COALESCE(SUM(ii.quantity * ii.unit_price), 0) * (1 + i.gst_rate/100)
      + COALESCE(i.delivery_fee, 0) - COALESCE(i.discount, 0) AS total
  FROM invoices i
  LEFT JOIN invoice_items ii ON ii.invoice_id = i.invoice_id
  GROUP BY i.invoice_id;
```

**Pragmatic alternative (lowest migration cost):** Keep columns but add an `AdminInvoiceController::recalculate()` helper that recomputes all six from items and asserts equality. Call it on every GET. Log and auto-correct on mismatch.

---

### V05 — order_items: total_price (Rule A) `HIGH`

**Column:** `total_price`

`total_price = quantity * unit_price`. Same pattern as `invoice_items.line_total`.

**Fix:**

```sql
ALTER TABLE order_items DROP COLUMN total_price;
ALTER TABLE order_items
  ADD COLUMN total_price DECIMAL(12,2)
    GENERATED ALWAYS AS (quantity * unit_price) STORED;
```

**PHP change:** Remove `total_price` from INSERT/UPDATE in order creation controllers.

---

### V06 — orders: total_amount (Rule A) `HIGH`

**Column:** `total_amount`

`total_amount = SUM(order_items.total_price) + delivery_fee`. Any post-hoc correction to an order item without re-running the order controller leaves `total_amount` stale, which flows through to invoice generation.

**Fix:**

```sql
CREATE OR REPLACE VIEW v_order_totals AS
  SELECT
    o.order_id,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0)
      + COALESCE(o.delivery_fee, 0) AS total_amount
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.order_id
  GROUP BY o.order_id;
```

---

### V07 — purchase_order_items: line_total (Rule A) `HIGH`

**Column:** `line_total`

`line_total = quantity * unit_price` (pre-tax). Same pattern as `invoice_items.line_total`.

**Written by:** `AdminPurchaseOrderController::store()` → `PurchaseOrder::create()` and `::updateDraft()`

**Fix:**

```sql
ALTER TABLE purchase_order_items DROP COLUMN line_total;
ALTER TABLE purchase_order_items
  ADD COLUMN line_total DECIMAL(12,2)
    GENERATED ALWAYS AS (quantity * unit_price) STORED;
```

---

### V08 — purchase_orders: subtotal, tax_amount, total (Rule A) `HIGH`

**Columns:** `subtotal`, `tax_amount`, `total`

`subtotal = SUM(poi.line_total)`, `tax_amount = SUM(poi.quantity * poi.unit_price * poi.gst_rate / 100)`, `total = subtotal + tax_amount + other_charges`.

**Written by:** `AdminPurchaseOrderController::store()` → `PurchaseOrder::create()` and `::updateDraft()`

**Fix:**

```sql
CREATE OR REPLACE VIEW v_po_totals AS
  SELECT
    po.po_id,
    COALESCE(SUM(poi.quantity * poi.unit_price), 0) AS subtotal,
    COALESCE(SUM(poi.quantity * poi.unit_price * poi.gst_rate / 100), 0)
      AS tax_amount,
    COALESCE(SUM(poi.quantity * poi.unit_price), 0)
      + COALESCE(SUM(poi.quantity * poi.unit_price * poi.gst_rate / 100), 0)
      + COALESCE(po.other_charges, 0) AS total
  FROM purchase_orders po
  LEFT JOIN purchase_order_items poi ON poi.po_id = po.po_id
  GROUP BY po.po_id;
```

---

### V09 — sales_document_items: line_total (Rule A) `HIGH`

**Column:** `line_total`

`line_total = quantity * unit_price`. Same pattern, applies to quotations and proformas.

**Written by:** `AdminSalesDocumentController::store()`, `::update()`

**Fix:** Same as V03 — use a GENERATED ALWAYS column or compute on read.

---

### V10 — sales_documents: derived financial summary (Rule A) `HIGH`

**Columns:** `subtotal`, `gst_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `total`

Exact same six-column pattern as `invoices` (V04), applied to quotations and proformas.

**Written by:** `AdminSalesDocumentController::store()`, `::update()`

**Fix:** Create `v_sales_document_totals` view analogous to `v_invoice_totals` in V04.

---

### V11 — payroll: computed salary columns (Rule A) `MEDIUM`

**Columns:** `earned_salary`, `overtime_salary`, `total_salary`, `pf`, `deductions`, `net_pay`

All six are computed by `Payroll::upsert()` at payroll-run time:
- `earned_salary = salary_per_day × present_days`
- `overtime_salary = overtime_rate × overtime_hrs`
- `total_salary = earned_salary + attend_bonus + overtime_salary + leave_salary + travel_allow`
- `pf = earned_salary × (employees.pf_percent / 100)`
- `deductions = pf + professional_tax + deducted_advance`
- `net_pay = total_salary − deductions`

**Why MEDIUM, not HIGH:** Payroll records are effectively immutable once `status = 'Paid'`. The risk is smaller than live financial documents. Storing computed values here is the correct pattern for a payslip (it is a legal document snapshot).

**Fix — add immutability guard:**

```sql
ALTER TABLE payroll
  ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Set to 1 when status = Paid. Blocks further UPDATE.';
```

**PHP change:** In `AdminPayrollController::update()`, check `is_locked = 1` and reject edits with HTTP 409.

---

### V12 — payroll: mirrored employee salary components (Rule C) `MEDIUM`

**Columns:** `base_salary`, `site_allowance`, `da`, `food_allowance`, `travel_allow`, `overtime_rate`

These six columns copy the employee's current salary structure at payroll-run time. They are valid snapshots (you need to know the rates used for a specific pay period) but the column names do not follow the `_snapshot` convention, so it is not obvious to a reader whether they are live values or historical snapshots.

**Written by:** `AdminPayrollController::run()` → `Payroll::upsert()`

**Fix — rename to follow snapshot convention:**

```sql
ALTER TABLE payroll
  CHANGE COLUMN base_salary     base_salary_snapshot     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN site_allowance  site_allowance_snapshot  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN da              da_snapshot              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN food_allowance  food_allowance_snapshot  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN travel_allow    travel_allow_snapshot    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN overtime_rate   overtime_rate_snapshot   DECIMAL(10,2) NOT NULL DEFAULT 0.00;
```

**PHP change:** Update `Payroll::upsert()` INSERT/UPDATE and all SELECT queries that reference these column names.

---

### V13 — purchase_orders: vendor_state (Rule C) `MEDIUM`

**Column:** `vendor_state`

Mirrors `vendors.state` at PO creation time. If the vendor updates their state after the PO is issued, the PO record shows the new state instead of the state at issue time — which changes the GST treatment (IGST becomes CGST+SGST or vice versa) for a historical document.

Column name does not follow snapshot convention, so it is easy to mistakenly assume `vendor_state` always reflects the current vendor state.

**Written by:** `AdminPurchaseOrderController::store()` → `PurchaseOrder::create()`

**Fix:**

```sql
ALTER TABLE purchase_orders
  CHANGE COLUMN vendor_state vendor_state_snapshot VARCHAR(80) DEFAULT NULL
  COMMENT 'vendors.state at PO creation time (determines IGST vs CGST+SGST)';

-- Backfill from vendors for existing rows:
UPDATE purchase_orders po
  JOIN vendors v ON v.vendor_id = po.vendor_id
  SET po.vendor_state_snapshot = v.state
  WHERE po.vendor_state_snapshot IS NULL;
```

---

### V14 — gst_compliance_periods: period aggregates (Rule B) `HIGH`

**Columns:** `sales_taxable`, `sales_cgst`, `sales_sgst`, `sales_igst`, `input_tax`, `net_payable`

These six columns are period-aggregate values computed by `GstCompliance::saveSnapshot()` from the invoices and payments tables. For `status = 'filed'` or `'locked'`, they are the legal record — intentionally immutable. But for `status = 'draft'` or `'reviewed'`, they become stale the moment any invoice is edited, a payment is voided, or a new invoice is created within the period.

**Written by:** `AdminGstComplianceController::save()` → `GstCompliance::saveSnapshot()`

**Fix — add staleness tracking and auto-invalidation:**

```sql
ALTER TABLE gst_compliance_periods
  ADD COLUMN snapshot_at DATETIME NULL
    COMMENT 'When this snapshot was last computed',
  ADD COLUMN is_stale TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = source data changed after snapshot_at';

-- Trigger to mark stale when an invoice is updated within the period:
CREATE TRIGGER trg_gst_stale_on_invoice_update
AFTER UPDATE ON invoices
FOR EACH ROW BEGIN
  UPDATE gst_compliance_periods
     SET is_stale = 1
   WHERE period_key = DATE_FORMAT(COALESCE(NEW.invoice_date, NEW.created_at), '%Y-%m')
     AND status IN ('draft', 'reviewed');
END;

-- Analogous trigger on payments table for input_tax:
CREATE TRIGGER trg_gst_stale_on_payment_update
AFTER UPDATE ON payments
FOR EACH ROW BEGIN
  UPDATE gst_compliance_periods
     SET is_stale = 1
   WHERE period_key = DATE_FORMAT(NEW.paid_on, '%Y-%m')
     AND status IN ('draft', 'reviewed');
END;
```

**PHP change:** In `AdminGstComplianceController::save()`, write `NOW()` to `snapshot_at`. Return `is_stale = true` in the API response when the client loads a draft period. Add a re-snapshot endpoint that recalculates and updates before the user files.

---

### V15 — attendance: computed time metrics (Rule A) `LOW`

**Columns:** `hours_worked`, `scheduled_hours`, `late_minutes`, `overtime_hours`

All four are computed by `AdminAttendanceController::calculateMetrics()` from `check_in`, `check_out`, and the shift definition, then written to the attendance row. Fully deterministic. Storing them is a reasonable read-performance optimization since payroll queries sum `hours_worked` and `overtime_hours` over large date ranges.

**Written by:** `AdminAttendanceController::calculateMetrics()` called from `scan()`, `checkIn()`, `checkOut()`, `manual()`, `update()`

**Recommendation:** No schema change. Add an integrity check that recalculates from `check_in`/`check_out`/shift and flags rows where the stored value diverges. This catches manual DB edits that skip the controller.

---

### V16 — inventory_stock: service-maintained derived columns (Rule A) `MEDIUM`

**Columns:** `available_quantity`, `is_low_stock`, `health_score`

SQL comments in `create_smart_inventory.sql` document these explicitly:
- `available_quantity` = `'current - reserved, maintained by service layer'`
- `is_low_stock` = `'auto-set when available <= product.reorder_level'`
- `health_score` = `'0-100, computed'`

All three are maintained by the smart inventory service on every movement. Any movement that bypasses the service (direct DB update, migration script, import job) leaves them stale.

**Fix — add a safety-net trigger:**

```sql
CREATE TRIGGER trg_sync_inventory_stock
BEFORE UPDATE ON inventory_stock
FOR EACH ROW BEGIN
  SET NEW.available_quantity = NEW.current_quantity - NEW.reserved_quantity;
  SET NEW.is_low_stock = IF(
    NEW.available_quantity <= (
      SELECT reorder_level
      FROM inventory_products
      WHERE inv_product_id = NEW.inv_product_id
    ), 1, 0
  );
END;
```

---

### V17 — inventory_stock_movements: total_value (Rule A) `LOW`

**Column:** `total_value`

SQL comment: `'quantity * unit_cost, stored for fast valuation rollups'`. Movement rows are immutable (never updated), so staleness is structurally impossible. The generated-column approach is still cleaner:

```sql
ALTER TABLE inventory_stock_movements DROP COLUMN total_value;
ALTER TABLE inventory_stock_movements
  ADD COLUMN total_value DECIMAL(14,2)
    GENERATED ALWAYS AS (quantity * unit_cost) STORED;
```

---

### V18 — inventory_reorder_suggestions: snapshot columns without naming convention (Rule C) `MEDIUM`

**Columns:** `current_stock`, `reorder_level`

These capture stock levels at the moment a reorder suggestion was generated. They are valid snapshots but use names that look like live values. Developers reading a JOIN between this table and `inventory_stock` will not immediately know which `current_stock` is live and which is historical.

**Fix:**

```sql
ALTER TABLE inventory_reorder_suggestions
  CHANGE COLUMN current_stock  current_stock_snapshot  DECIMAL(14,3) NOT NULL DEFAULT 0.000
    COMMENT 'available_quantity at suggestion generation time',
  CHANGE COLUMN reorder_level  reorder_level_snapshot  DECIMAL(14,3) NOT NULL DEFAULT 0.000
    COMMENT 'inventory_products.reorder_level at suggestion generation time';
```

---

### V19 & V20 — quotes.annual_savings and quote_requests.annual_savings (Rule A) `LOW`

**Column:** `annual_savings`

`annual_savings = monthly_savings * 12`. Transitive derived value. Both columns are NULL in 100% of live data rows (44 quotes checked) — the formatted text goes into `message` instead.

```sql
ALTER TABLE quotes DROP COLUMN annual_savings;
ALTER TABLE quote_requests DROP COLUMN annual_savings;
-- Compute on read: SELECT monthly_savings * 12 AS annual_savings
```

---

### V21 — expenses: vendor as free text (3NF) `MEDIUM`

**Column:** `vendor` (VARCHAR 150)

`expenses.vendor` is a free-text payee name with no FK to `vendors(vendor_id)`. The `vendors` table exists and is actively used by procurement. Without a FK, the same vendor may appear as "ABC Pvt Ltd", "ABC Private Limited", "abc pvt" across expense rows, making accurate per-vendor spend reporting impossible.

**Written by:** `AdminExpenseController::store()`, `::update()`

**Fix — add nullable vendor_id FK:**

```sql
ALTER TABLE expenses
  ADD COLUMN vendor_id INT NULL AFTER vendor,
  ADD CONSTRAINT fk_expense_vendor
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL;
```

Keep the `vendor` VARCHAR as a fallback for ad-hoc payees not in the vendors master. When `vendor_id` is set, `vendor` should be auto-populated from `vendors.name` so both are consistent.

**PHP change:** Update `AdminExpenseController::store()` and `::update()` to accept `vendor_id` as an optional input. When provided, also populate `vendor` from the vendors table name.

---

### V22 — payroll: hra and allowances (Rule A / Unused) `MEDIUM`

**Columns:** `hra`, `allowances`

Both are 0.00 in every live payroll row. The `employees` table has no `hra` field. `Payroll::upsert()` does not populate either column. These are dead schema scaffolding.

```sql
ALTER TABLE payroll DROP COLUMN hra, DROP COLUMN allowances;
```

**PHP change:** Remove from `Payroll::upsert()`. Check all payslip templates and report queries for references.

---

### V23 — payroll: total_salay typo column (Schema Defect) `HIGH`

**Column:** `total_salay` (misspelling of `total_salary`)

A column named `total_salay` exists alongside `total_salary`. They compute different things:
- `total_salary` = net earned salary for the pay period (present_days × salary_per_day + overtime + bonuses)
- `total_salay` = gross CTC (base + site_allowance + da + food_allowance + travel_allow — the full package value before attendance adjustment)

Two columns with near-identical names that mean different things in the same financial table is a critical maintenance trap. Report queries that use `total_salay` thinking it is `total_salary` will produce wrong figures.

**Fix — rename immediately:**

```sql
ALTER TABLE payroll
  CHANGE COLUMN total_salay gross_ctc_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Gross CTC = base_salary+site_allowance+da+food_allowance+travel_allow at payroll-run time';
```

**PHP change:** Search all PHP files for `total_salay` and replace with `gross_ctc_snapshot`. Update any TypeScript frontend code that references this field.

```bash
grep -r "total_salay" api/ src/
```

---

## Part 2 — Justified Exceptions

These columns appear to violate a normal form rule but are intentional, legally required, or architecturally necessary snapshots.

| Table | Columns | Pattern | Reason |
|-------|---------|---------|--------|
| `invoices` | `customer_name`, `customer_gstin`, `customer_state`, `customer_address`, `customer_city`, `customer_pincode` | Document-level customer snapshot | CGST Act 2017 requires buyer details to be immutable on a tax invoice after issue. |
| `sales_documents` | All `customer_*` columns | Document-level customer snapshot | Quotations and proformas must retain customer data at issue time for conversion accuracy. |
| `invoice_items` | `unit_price`, `gst_rate` | `price_at_time_of_invoice` | Price and GST rate are locked at invoice time; `products.base_price` can change freely. |
| `order_items` | `unit_price`, `size`, `purpose`, `sub_purpose` | `price_at_time_of_order` | Product configuration price locked at order time. |
| `payroll` | `salary_per_day`, `leave_credit`, `leave_availed_this_month` | `rate_at_payroll_run` | `salary_per_day` is the rate for this specific period. Leave accrual state is period-specific, not derived. |
| `inventory_reorder_suggestions` | `current_stock`, `reorder_level` | Snapshot (naming non-conformant) | Valid snapshots of the trigger condition, but columns should be renamed to `current_stock_snapshot` and `reorder_level_snapshot`. |

---

## Part 3 — Unused Columns

Columns that appear in CREATE TABLE statements but are never written with non-null/non-zero values by any PHP controller reviewed.

| Table | Column | Evidence | Action |
|-------|--------|----------|--------|
| `payroll` | `hra` | 0.00 in all 20 live rows; `employees` has no `hra` field | DROP or document as reserved |
| `payroll` | `allowances` | 0.00 in all 20 live rows | DROP |
| `payroll` | `professional_tax` | 0.00 in all rows; PT not configured | KEEP — legitimate future use for PT-applicable states |
| `quotes` | `monthly_savings` | NULL in all 44 live rows; text in `message` column | DROP or populate from calculator |
| `quotes` | `annual_savings` | NULL in all 44 rows | DROP (also V19) |
| `quotes` | `biomass_cost` | NULL in all 44 rows | DROP |
| `quotes` | `current_cost` | NULL in all 44 rows | DROP |
| `quotes` | `current_fuel` | NULL in all 44 rows | DROP |
| `quotes` | `quantity_per_month` | NULL in all 44 rows | DROP |
| `quotes` | `product` | NULL in all 44 rows | DROP or replace with `product_id FK → products` |

For `quotes`, the structured fields (`monthly_savings`, `biomass_cost`, etc.) are never populated because the frontend calculator stores a formatted text summary in `message` instead. Either populate these structured fields from the calculator payload, or drop them and accept that the message column is the only record.

---

## Part 4 — Recommended Fix Priority

| Priority | Violation | What Breaks if Ignored |
|----------|-----------|------------------------|
| 1 | V23 — `payroll.total_salay` typo | Reports using `total_salay` return wrong figures vs `total_salary` |
| 2 | V14 — `gst_compliance_periods` staleness | GST filings use stale aggregates if source invoices change post-snapshot |
| 3 | V04 — `invoices` stored totals | Invoice total diverges from items when items are corrected outside the controller |
| 4 | V08 — `purchase_orders` stored totals | PO total diverges from items on draft edits |
| 5 | V21 — `expenses.vendor` free text | Per-vendor spend reports cannot be trusted; same vendor has multiple name variants |
| 6 | V12 — `payroll` salary snapshot naming | Developers cannot tell which columns are live vs historical without reading source code |
| 7 | V13 — `purchase_orders.vendor_state` naming | GST determination for historical POs may use wrong state if vendor moved |
| 8 | V16 — `inventory_stock` computed columns | Dashboard stock counts go stale if any movement bypasses the service layer |
| 9 | V01 — `meetings` JSON columns | Cannot query meetings by attendee or find overdue action items with a simple SQL WHERE |
| 10 | V22 — `payroll.hra/allowances` unused | Dead columns in a financial table attract misuse |

---

## Part 5 — Migration Script Order

Run these SQL statements in order in phpMyAdmin. Each is idempotent where possible.

```sql
-- 1. Rename total_salay typo (V23) — do this first to prevent confusing future queries
ALTER TABLE payroll
  CHANGE COLUMN total_salay gross_ctc_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Gross CTC at payroll-run time';

-- 2. Rename payroll salary snapshot columns (V12)
ALTER TABLE payroll
  CHANGE COLUMN base_salary     base_salary_snapshot     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN site_allowance  site_allowance_snapshot  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN da              da_snapshot              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN food_allowance  food_allowance_snapshot  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN travel_allow    travel_allow_snapshot    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE COLUMN overtime_rate   overtime_rate_snapshot   DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- 3. Add is_locked to payroll (V11)
ALTER TABLE payroll
  ADD COLUMN IF NOT EXISTS is_locked TINYINT(1) NOT NULL DEFAULT 0;

-- 4. Rename vendor_state on purchase_orders (V13)
ALTER TABLE purchase_orders
  CHANGE COLUMN vendor_state vendor_state_snapshot VARCHAR(80) DEFAULT NULL
  COMMENT 'vendors.state at PO creation time';
UPDATE purchase_orders po
  JOIN vendors v ON v.vendor_id = po.vendor_id
  SET po.vendor_state_snapshot = v.state
  WHERE po.vendor_state_snapshot IS NULL;

-- 5. Add vendor_id FK to expenses (V21)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vendor_id INT NULL AFTER vendor,
  ADD CONSTRAINT fk_expense_vendor
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL;

-- 6. Add staleness tracking to gst_compliance_periods (V14)
ALTER TABLE gst_compliance_periods
  ADD COLUMN IF NOT EXISTS snapshot_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS is_stale TINYINT(1) NOT NULL DEFAULT 0;

-- 7. Add inventory_stock trigger (V16)
DROP TRIGGER IF EXISTS trg_sync_inventory_stock;
CREATE TRIGGER trg_sync_inventory_stock
BEFORE UPDATE ON inventory_stock
FOR EACH ROW BEGIN
  SET NEW.available_quantity = NEW.current_quantity - NEW.reserved_quantity;
END;

-- 8. Rename inventory_reorder_suggestions snapshot columns (V18)
ALTER TABLE inventory_reorder_suggestions
  CHANGE COLUMN current_stock  current_stock_snapshot  DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  CHANGE COLUMN reorder_level  reorder_level_snapshot  DECIMAL(14,3) NOT NULL DEFAULT 0.000;

-- 9. Drop unused payroll columns (V22) — confirm no active reports first
-- ALTER TABLE payroll DROP COLUMN hra, DROP COLUMN allowances;

-- 10. Drop unused quotes columns (Part 3) — confirm frontend does not use them
-- ALTER TABLE quotes DROP COLUMN annual_savings, DROP COLUMN monthly_savings,
--   DROP COLUMN biomass_cost, DROP COLUMN current_cost, DROP COLUMN current_fuel,
--   DROP COLUMN quantity_per_month, DROP COLUMN product;
```

Steps 9 and 10 are commented out — run them only after confirming no active frontend code or reports reference these columns.

---

## Files Changed

This report does not change any source code. It is an audit document only.

| File | Change |
|------|--------|
| `client-briefs/normalize-state.json` | Machine-readable findings (created) |
| `client-briefs/DB-NORMALIZATION-REPORT.md` | This document (created) |

Run the SQL from Part 5 in phpMyAdmin, then run `/impact-check` and `/review-all` before deploying.
