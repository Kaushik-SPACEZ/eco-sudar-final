# Eco Sudar ERP — Phase 2 Implementation Plan

**Document type:** Multi-phase, multi-batch build plan (engineering blueprint)
**Prepared for:** Eco Sudar Bio Energy LLP — internal ERP (`api-EcoSudar`)
**Status:** Draft v1.0 — for build kick-off
**Author role:** ERP solution architect
**Scope source:** 20-point feature list (Phase 2 backlog) supplied by the business owner.

> **How to use this document.** This is the single source of truth for building Phase 2.
> Each feature has: business intent → data model (DDL) → API surface → frontend surface →
> integration points → validation rules → acceptance criteria → test cases → effort → risks.
> Build **strictly batch-by-batch in the stated order**. Do not start a batch until the
> previous batch's "Definition of Done" is met and deployed. Every batch is independently
> shippable to production.

---

## Companion deep-dive specifications (read these for build detail)

This master plan is the **roadmap and contract**. Each domain has a **deep-dive module spec**
under `docs/modules/` that expands every functionality, sub-functionality, element, process
flow, screen, business rule, KPI, and optimization opportunity — written from both the planner
and builder perspective. **Build a module from its deep-dive spec; use this master plan for
sequencing, dependencies, effort, risk, and Definition of Done.**

| # | Deep-dive spec | Features covered |
|---|---|---|
| 00 | [Foundations & Cross-Cutting Architecture](modules/00-foundations-and-architecture.md) | numbering, files, RBAC, audit, GST engine, notifications, settings, import spine, performance, security |
| 01 | [Procurement & Inventory](modules/01-procurement-and-inventory.md) | #2 Purchase Request · #4 Purchase Order · #7 Inventory |
| 02 | [Sales, Billing & Compliance](modules/02-sales-billing-and-compliance.md) | #1 Payment entry · #11 Quotation · #10 Proforma · #8 Test certificates · #20 GST compliance |
| 03 | [Dealer Network & Customer Intelligence](modules/03-dealer-and-customer-intelligence.md) | #5 Dealer mapping/pricing/dedupe · #6 Customer analytics |
| 04 | [Finance Analytics & Planning](modules/04-finance-analytics-and-planning.md) | #13 Expense analytics · #12 Reports analytics · #15 Budget vs Actual · #14 Benchmarks |
| 05 | [HR, Compliance & Media](modules/05-hr-compliance-and-media.md) | #9 Employee compliance · #16 Attendance data · #18 TMS/employee upload · #19 Meeting media |
| 06 | [Data Migration & Interoperability](modules/06-data-migration-and-interoperability.md) | #17 Import/export + backups |

> **Reading order for builders:** start with **00 (Foundations)** — every other module depends
> on the shared services it defines. Then build in phase order (01 → 02 → 03 → 04 → 05), with the
> import spine from 06/Batch 0.3 available throughout and backups operational from day one.

---

## Table of Contents

1. Executive Summary
2. Current System Baseline (what already exists)
3. Architecture, Conventions & Ground Rules
4. Scope — 20 Features Mapped to ERP Domains
5. Cross-Cutting Foundations (build these first / alongside)
6. Phase & Batch Roadmap (overview + sequencing + dependencies)
7. Phase 1 — Procurement & Inventory
8. Phase 2 — Sales, Billing & Compliance Documents
9. Phase 3 — Dealer Network & Customer Intelligence
10. Phase 4 — Finance Analytics & Planning
11. Phase 5 — HR, Compliance & Media
12. Phase 6 — Data Migration & Interop Platform
13. Non-Functional Requirements
14. Testing & QA Strategy
15. Deployment & Release Management (Hostinger)
16. Risk Register
17. Effort, Timeline & Team
18. Definition of Done (global)
19. Appendices (numbering, enums, glossary, open questions)

---

## 1. Executive Summary

Phase 1 delivered a working operational core: customers/users, orders, GST invoicing,
expenses, a Profit & Loss dashboard, HR (employees, attendance, payroll, meetings, SOPs,
tasks), workflows, quotes/queries, and an admin SPA backed by a PHP front-controller API on
Hostinger shared hosting with a MySQL/MariaDB database.

Phase 2 extends Eco Sudar from "operations capture" into a **full ERP**: a procure-to-pay
chain (vendors → purchase request → purchase order → goods receipt → inventory), a richer
order-to-cash chain (quotation → proforma → invoice → **payment entry** → receipt), a
**dealer channel** with per-dealer pricing and customer mapping, deep **finance analytics**
(budget vs actual, benchmarks, expense and report analytics), **HR compliance** (employee
insurance/statutory tracking), **document & media management** (test certificates, meeting
photos/videos, TMS uploads), **automated GST compliance tracking**, and a **data
import/export platform** to migrate legacy data and interoperate with other software.

The plan is decomposed into **6 phases and 18 batches**. Phases are ordered by dependency
and business value; batches within a phase are individually deployable. The plan favours
small, reversible, production-shippable increments over big-bang releases — appropriate for a
single live system on shared hosting.

**Headline sequencing rationale**

- **Procurement & Inventory first** — it is the largest greenfield domain, has no existing
  data to migrate, and unlocks expense/finance accuracy (cost of goods).
- **Payment entry early within Phase 2** — small, high value, and it makes the revenue/P&L
  numbers (already wired in Phase 1) truly correct by capturing real cash receipts.
- **Dealer & customer intelligence** depends on orders/invoices/payments existing.
- **Finance analytics** depends on procurement + payments producing complete cost/revenue data.
- **Data import/export** is foundational and is therefore **started in parallel from Phase 1**
  (Batch 0.3) so legacy master data (vendors, customers, products, opening stock) can be
  loaded as each module comes online.

---

## 2. Current System Baseline (what already exists)

**Frontend** — `eco-sudar-control/` (React 18 + Vite + TypeScript, shadcn/ui, Tailwind,
recharts, TanStack React Query, react-router). Pages live in `src/pages/*.tsx`; typed API
clients in `src/lib/api/*.ts` calling a central `apiFetch` wrapper (`src/lib/api/client.ts`).
Build output is copied into `admin/` and uploaded to Hostinger.

**Backend** — `api/` PHP front controller. `api/index.php` registers routes on a small
`Router` (`$router->get('/admin/x', [XController::class,'method'], 'admin')`). Controllers in
`api/controllers/` (public) and `api/controllers/admin/` (admin). Helpers: `Database`
(`fetch/fetchAll/insert/execute/count`, PDO singleton), `Request` (`input/query/param`,
`sanitize`), `Response` (`success/error/paginated`), JWT auth with `'admin'` route guard.

**Database** — MySQL/MariaDB. ~38 tables already exist, well indexed. Relevant existing
tables Phase 2 will integrate with or extend:

| Domain | Existing tables |
|---|---|
| Sales | `orders`, `order_items`, `invoices`, `invoice_items`, `invoice_products`, `gst_records`, `quotes`, `quote_requests` |
| Customers | `users` (customers + dealers via `user_type`), `customer_queries`, `queries` |
| Catalog | `products`, `product_configurations` |
| Finance | `expenses`, `finance_records`, `finance_config` |
| HR | `employees`, `attendance`, `attendance_shifts`, `payroll`, `employee_advances`, `meetings`, `sops`, `sop_versions`, `tasks`, `task_comments` |
| Platform | `users`, `settings`, `audit_log`, `reports`, `workflows`, `workflow_history`, `notifications` (via AdminNotificationController), `refresh_tokens`, `revoked_tokens`, `otp_verifications`, `faqs` |

**Recently added in Phase 1.5** (relevant to Phase 2): invoice PDF fields
(`invoice_date`, `payment_terms`, `place_of_supply`, `ship_to`, `subject`), invoice
`payment_status` (mirrors order payment linking), revenue now counts paid manual invoices,
performance indexes, and React Query caching defaults.

**Conventions to reuse (do not reinvent):**

- Document numbering via a `settings` row prefix (e.g. `invoice_prefix` = `INV`) +
  `PREFIX-YYYY-####`.
- Money as `DECIMAL(12,2)`; GST split CGST/SGST (intra-state) vs IGST (inter-state) using
  seller vs customer state; whole-rupee rounding on totals.
- Soft conventions: `created_at`, `updated_at` timestamps; `idx_*` index names; `fk_*`
  foreign keys; `ON DELETE CASCADE` for child rows; status as short `VARCHAR`/enum strings.
- File uploads handled by controllers writing under an `uploads/` path and storing the
  relative path in the DB (as employee photos already do).

---

## 3. Architecture, Conventions & Ground Rules

These rules are **mandatory** for every batch so Phase 2 stays consistent with Phase 1.

### 3.1 Backend pattern (per module)

1. **Migration** — `database/<verb>_<thing>.sql`, idempotent where possible
   (`CREATE TABLE IF NOT EXISTS`, documented "skip on duplicate"). One concern per file.
2. **Controller** — `api/controllers/admin/Admin<Module>Controller.php`, methods
   `index/show/store/update/destroy` plus domain actions (e.g. `approve`, `convert`,
   `receive`). Validate with `Request::input`, sanitize text with `Request::sanitize`,
   respond with `Response::success/error/paginated`.
3. **Routes** — register in `api/index.php` grouped by module with a banner comment.
   Admin routes use the `'admin'` guard; dealer/customer-facing routes use the appropriate
   guard (see RBAC, §5.4).
4. **Transactions** — any multi-row write (PO + items, GRN + stock movements, payment +
   invoice status) wraps `Database::beginTransaction()/commit()/rollback()`.
5. **Auditing** — state transitions (approve, cancel, post, void) write an `audit_log` row.

### 3.2 Frontend pattern (per module)

1. **API client** — `src/lib/api/<module>.ts` exporting typed functions + TypeScript types.
2. **Page** — `src/pages/<Module>.tsx`, registered in the router and sidebar nav.
3. **Data fetching** — use **TanStack `useQuery`** with a stable `queryKey` (list cached and
   background-refreshed); mutations via `useMutation` + `queryClient.invalidateQueries`.
4. **Tables** — reuse `ScrollableX`, the floating-scrollbar pattern, and existing badge/colour
   maps. Forms reuse shadcn `Dialog`, `Select`, `Command` combobox patterns already in
   `Invoices.tsx`.
5. **Exports** — reuse `src/lib/exporters` (`exportToPdf`, `exportToExcel`).

### 3.3 Numbering, money, dates, state

- All new documents get a prefix setting and a `Admin…::nextNumber()` helper mirroring
  invoice numbering. Prefixes: `PR`, `PO`, `GRN`, `PFI` (proforma), `QTN` (quotation),
  `PAY` (payment), `ADJ` (stock adjustment), `BUD` (budget).
- Money `DECIMAL(12,2)`; quantities `DECIMAL(12,3)` (supports kg/ton fractions).
- Dates `DATE`; timestamps `DATETIME DEFAULT CURRENT_TIMESTAMP` (+ `ON UPDATE` for `updated_at`).
- GST logic reuses the existing intra/inter-state engine; never duplicate it — extract a
  shared PHP helper (`GstCalculator`) during Batch 2.1 and refactor invoice to use it too.

### 3.4 Definition of "shippable batch"

A batch is shippable when: migration runs clean on a copy of prod; backend lints
(`php -l`) and endpoints return correct shapes; frontend `tsc --noEmit` + `npm run build`
pass; manual smoke test of the happy path + 1 failure path; rollback documented.

---

## 4. Scope — 20 Features Mapped to ERP Domains

The raw 20-point list (note: the source skips #3 and lists two procurement items as #2 and #4)
is regrouped into coherent ERP domains. Each feature keeps its original number for traceability.

| # | Feature (as given) | ERP domain | Phase.Batch |
|---|---|---|---|
| 2 | Purchase request (refer Zoho) | Procurement | 1.1 |
| 4 | Purchase order (Zoho) | Procurement | 1.2 |
| 7 | Inventory (refer Zoho) | Inventory | 1.3 |
| 1 | Payment entry at invoice section | Order-to-cash | 2.1 |
| 11 | Quotation | Order-to-cash | 2.2 |
| 10 | Proforma invoice | Order-to-cash | 2.2 |
| 8 | Test certificates (app, website, dashboard) | Quality/Docs | 2.3 |
| 20 | Auto GST compliance tracking | Compliance | 2.4 |
| 5 | Dealers page mapping + price mapping + customer dedupe | Channel | 3.1 |
| 6 | Customer data analytics (purchase + payment speed) | Customer intel | 3.2 |
| 13 | Expenses analysis with graphics | Finance analytics | 4.1 |
| 12 | Reports analytics | Finance analytics | 4.1 |
| 15 | Budget vs actual | Finance planning | 4.2 |
| 14 | Benchmark values | Finance planning | 4.2 |
| 9 | Compliance — employee insurance | HR compliance | 5.1 |
| 16 | Attendance data | HR analytics | 5.2 |
| 18 | Employees data / TMS uploading facility | HR data | 5.2 |
| 19 | Meeting events photos & videos uploading | Media | 5.3 |
| 17 | Old data export & import facility | Platform | 0.3 / 6.x |

---

## 5. Cross-Cutting Foundations (Batch 0.x — build first / alongside)

These are shared services every later batch depends on. They form **Phase 0** and overlap the
start of Phase 1.

### 5.1 Batch 0.1 — Document Numbering Service

- **Backend:** `NumberSequence` helper + `document_sequences` table to avoid race conditions
  on shared hosting (instead of `MAX(id)+1`, which can collide and skip).

```sql
CREATE TABLE IF NOT EXISTS `document_sequences` (
  `doc_type`   VARCHAR(20)  NOT NULL,           -- PR, PO, GRN, PFI, QTN, PAY, ADJ, BUD
  `period`     VARCHAR(7)   NOT NULL,           -- 'YYYY' or 'YYYY-MM'
  `next_value` INT(11)      NOT NULL DEFAULT 1,
  PRIMARY KEY (`doc_type`,`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

  Allocation uses `INSERT ... ON DUPLICATE KEY UPDATE next_value = LAST_INSERT_ID(next_value+1)`
  inside a transaction → atomic, gap-resistant numbering. Prefixes read from `settings`.
- **Acceptance:** 100 concurrent allocations produce 100 unique sequential numbers (load test).

### 5.2 Batch 0.2 — File & Media Storage Service

- **Backend:** `FileStore` helper: validates MIME + extension + size, stores under
  `uploads/<module>/<yyyy>/<mm>/<uuid>.<ext>`, returns a relative path; never trusts the
  client filename; strips EXE/script types. Central config of size/type limits per category.
- **Tables:**

```sql
CREATE TABLE IF NOT EXISTS `attachments` (
  `attachment_id` INT(11) NOT NULL AUTO_INCREMENT,
  `entity_type`   VARCHAR(40) NOT NULL,   -- 'test_certificate','meeting','employee_doc','po', ...
  `entity_id`     INT(11) NOT NULL,
  `category`      VARCHAR(40) NULL,       -- 'photo','video','pdf','certificate','insurance'
  `file_path`     VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NULL,
  `mime_type`     VARCHAR(100) NULL,
  `size_bytes`    INT(11) NULL,
  `uploaded_by`   INT(11) NULL,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `idx_attach_entity` (`entity_type`,`entity_id`),
  KEY `idx_attach_uploaded_by` (`uploaded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Critical constraint / decision:** Hostinger shared hosting has **limited disk + upload size
  limits** (`upload_max_filesize`, `post_max_size`) and is a poor fit for **video** (#19).
  **Recommendation:** photos/PDFs on local `uploads/`; **videos and large files on external
  object storage** (Cloudflare R2 or S3-compatible) with only the URL stored in `attachments`.
  This is **Open Question OQ-1** — confirm storage budget before Batch 5.3.
- **Acceptance:** upload/download round-trip for each allowed type; oversize + wrong-type
  rejected with clear errors; path traversal blocked.

### 5.3 Batch 0.3 — Import/Export Engine (foundation for feature #17)

The generic engine is built once here and reused by every module's importer. Full feature
(#17 UI + per-module mappers) completes in Phase 6, but the engine ships now so master data can
be loaded as modules come online.

- **Tables:**

```sql
CREATE TABLE IF NOT EXISTS `import_jobs` (
  `job_id`       INT(11) NOT NULL AUTO_INCREMENT,
  `module`       VARCHAR(40) NOT NULL,        -- 'vendors','customers','products','opening_stock',...
  `file_path`    VARCHAR(255) NOT NULL,
  `status`       VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending,validating,dry_run,committed,failed
  `total_rows`   INT(11) NOT NULL DEFAULT 0,
  `valid_rows`   INT(11) NOT NULL DEFAULT 0,
  `error_rows`   INT(11) NOT NULL DEFAULT 0,
  `mapping_json` TEXT NULL,                    -- column->field mapping chosen by user
  `created_by`   INT(11) NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_id`),
  KEY `idx_import_jobs_module` (`module`),
  KEY `idx_import_jobs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_job_rows` (
  `row_id`     INT(11) NOT NULL AUTO_INCREMENT,
  `job_id`     INT(11) NOT NULL,
  `row_number` INT(11) NOT NULL,
  `raw_json`   TEXT NULL,
  `status`     VARCHAR(20) NOT NULL DEFAULT 'pending', -- valid,invalid,imported,skipped
  `error_text` VARCHAR(500) NULL,
  PRIMARY KEY (`row_id`),
  KEY `idx_import_rows_job` (`job_id`,`status`),
  CONSTRAINT `fk_import_rows_job` FOREIGN KEY (`job_id`) REFERENCES `import_jobs`(`job_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Engine workflow:** upload → detect headers → user maps columns → **dry-run validation**
  (per-row, no writes) → preview errors → **commit** (transactional, idempotent via natural
  keys) → downloadable error report. CSV first; XLSX via a light reader.
- **Acceptance:** a 1,000-row customer CSV dry-runs with per-row errors, then commits with zero
  partial state on failure (all-or-nothing per batch of N).

### 5.4 Batch 0.4 — RBAC & Roles

Phase 2 introduces non-admin actors (dealers, store-keeper, accountant, HR). Extend the auth
guard with **roles** rather than a single admin flag.

- `users.user_type` already distinguishes `admin/dealer/customer`. Add an internal
  **staff role** for employees who log in:

```sql
ALTER TABLE `users` ADD COLUMN `staff_role` VARCHAR(30) NULL AFTER `user_type`;
-- values: 'owner','accountant','store_keeper','hr','sales' (NULL for non-staff)
```

- Router guard accepts a role list: `$router->post('/admin/purchase-orders/{id}/approve', [...],
  'admin:owner,accountant')`. Backwards compatible: `'admin'` = any staff.
- **Acceptance:** a `store_keeper` can receive stock but cannot approve a PO; an `accountant`
  can post payments but cannot edit payroll.

---

## 6. Phase & Batch Roadmap

| Phase | Theme | Batches | Features | Depends on |
|---|---|---|---|---|
| 0 | Foundations | 0.1 Numbering · 0.2 Files · 0.3 Import engine · 0.4 RBAC | (#17 engine) | — |
| 1 | Procurement & Inventory | 1.1 Vendors+PR · 1.2 PO+GRN · 1.3 Inventory | 2,4,7 | 0.1,0.4 |
| 2 | Sales, Billing & Compliance Docs | 2.1 Payments · 2.2 Quotation+Proforma · 2.3 Test certs · 2.4 GST compliance | 1,11,10,8,20 | 0.1,0.2 |
| 3 | Dealer Network & Customer Intel | 3.1 Dealer mapping+pricing · 3.2 Customer analytics | 5,6 | 1.x,2.1 |
| 4 | Finance Analytics & Planning | 4.1 Expense+report analytics · 4.2 Budget vs actual+benchmarks | 13,12,15,14 | 1.x,2.1 |
| 5 | HR, Compliance & Media | 5.1 Employee compliance · 5.2 Attendance analytics+TMS upload · 5.3 Meeting media | 9,16,18,19 | 0.2,0.3 |
| 6 | Data Migration & Interop | 6.1 Per-module mappers · 6.2 Exports + scheduled backups | 17 | 0.3, all modules |

**Critical path:** 0.1 → 1.1 → 1.2 → 1.3 → 4.x (cost data) ; and 2.1 → 3.2 / 4.x (cash data).
**Parallelizable:** 0.2/0.3 with Phase 1; 2.3, 2.4 with Phase 3; 5.x with Phase 4.

**Indicative effort (developer-days, 1 full-stack dev):** Phase 0 ≈ 10 · Phase 1 ≈ 22 ·
Phase 2 ≈ 20 · Phase 3 ≈ 14 · Phase 4 ≈ 14 · Phase 5 ≈ 16 · Phase 6 ≈ 10. **Total ≈ 106 dev-days
(~5 calendar months at a sustainable pace incl. QA & buffer).**

---

## 7. Phase 1 — Procurement & Inventory

**Goal:** a complete procure-to-pay chain mirroring Zoho Books/Inventory semantics, feeding
true cost data into expenses and finance.

### 7.1 Batch 1.1 — Vendor Master + Purchase Request (feature #2)

**Business intent.** Staff raise an internal **Purchase Request (PR)** for materials/services;
an approver converts approved PRs into POs. Vendors are the supplier master.

**Data model.**

```sql
CREATE TABLE IF NOT EXISTS `vendors` (
  `vendor_id`    INT(11) NOT NULL AUTO_INCREMENT,
  `vendor_code`  VARCHAR(30) NULL,
  `name`         VARCHAR(200) NOT NULL,
  `gstin`        VARCHAR(20) NULL,
  `contact_name` VARCHAR(120) NULL,
  `phone`        VARCHAR(20) NULL,
  `email`        VARCHAR(120) NULL,
  `address`      VARCHAR(255) NULL,
  `city`         VARCHAR(80) NULL,
  `state`        VARCHAR(80) NULL,
  `pincode`      VARCHAR(10) NULL,
  `payment_terms` VARCHAR(60) NULL,
  `is_active`    TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_id`),
  UNIQUE KEY `uq_vendor_code` (`vendor_code`),
  KEY `idx_vendors_active` (`is_active`),
  KEY `idx_vendors_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `pr_id`        INT(11) NOT NULL AUTO_INCREMENT,
  `pr_number`    VARCHAR(30) NOT NULL,
  `requested_by` INT(11) NULL,            -- users.user_id (staff)
  `department`   VARCHAR(80) NULL,
  `need_by_date` DATE NULL,
  `priority`     VARCHAR(10) NOT NULL DEFAULT 'normal',  -- low,normal,high,urgent
  `status`       VARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft,submitted,approved,rejected,converted,closed
  `notes`        VARCHAR(500) NULL,
  `approved_by`  INT(11) NULL,
  `approved_at`  DATETIME NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pr_id`),
  UNIQUE KEY `uq_pr_number` (`pr_number`),
  KEY `idx_pr_status` (`status`),
  KEY `idx_pr_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_request_items` (
  `item_id`     INT(11) NOT NULL AUTO_INCREMENT,
  `pr_id`       INT(11) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `product_id`  INT(11) NULL,             -- optional link to products
  `quantity`    DECIMAL(12,3) NOT NULL DEFAULT 0,
  `unit`        VARCHAR(20) NOT NULL DEFAULT 'Nos',
  `est_unit_price` DECIMAL(12,2) NULL,
  `sort_order`  INT(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_id`),
  KEY `idx_pri_pr` (`pr_id`),
  CONSTRAINT `fk_pri_pr` FOREIGN KEY (`pr_id`) REFERENCES `purchase_requests`(`pr_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**API surface.**

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/vendors` | list (search, paginate) |
| POST | `/admin/vendors` | create |
| GET | `/admin/vendors/{id}` | detail |
| PUT | `/admin/vendors/{id}` | update |
| DELETE | `/admin/vendors/{id}` | deactivate (soft) |
| GET | `/admin/purchase-requests` | list (filter status/date) |
| POST | `/admin/purchase-requests` | create draft + items |
| GET | `/admin/purchase-requests/{id}` | detail + items |
| PUT | `/admin/purchase-requests/{id}` | edit (draft only) |
| POST | `/admin/purchase-requests/{id}/submit` | draft → submitted |
| POST | `/admin/purchase-requests/{id}/approve` | approve (role: owner/accountant) |
| POST | `/admin/purchase-requests/{id}/reject` | reject with reason |
| DELETE | `/admin/purchase-requests/{id}` | delete draft |

**Frontend.** New pages `Vendors.tsx`, `PurchaseRequests.tsx`; api clients `vendors.ts`,
`purchasing.ts`. PR form mirrors invoice line-item UX (product combobox, qty/unit). Status
badges; approve/reject actions guarded by role.

**Integrations.** Vendor `state` feeds GST treatment later (PO). PR `product_id` links catalog.

**Validation.** PR must have ≥1 item with qty>0; only `draft` editable; approve requires
`submitted`. Reject requires a reason.

**Acceptance criteria.**
- Create vendor; appears in vendor picker.
- Raise PR with 3 lines, submit, approve; status transitions logged in `audit_log`.
- A `store_keeper` cannot approve (403).

**Test cases.** valid create; missing items (422); edit after submit (409); approve already
approved (409); number uniqueness under concurrency.

**Effort:** 5 dev-days. **Risks:** approval role mapping (mitigated by 0.4).

### 7.2 Batch 1.2 — Purchase Order + Goods Receipt (feature #4)

**Business intent.** Convert approved PR (or create directly) into a **Purchase Order** to a
vendor with pricing + GST; receive goods via **GRN**, which posts stock and optionally an
expense/payable.

**Data model.**

```sql
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `po_id`        INT(11) NOT NULL AUTO_INCREMENT,
  `po_number`    VARCHAR(30) NOT NULL,
  `vendor_id`    INT(11) NOT NULL,
  `pr_id`        INT(11) NULL,                 -- source PR if converted
  `order_date`   DATE NOT NULL,
  `expected_date` DATE NULL,
  `seller_state` VARCHAR(80) NULL,             -- Eco Sudar state (for GST direction)
  `vendor_state` VARCHAR(80) NULL,
  `subtotal`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  `tax_amount`   DECIMAL(12,2) NOT NULL DEFAULT 0,
  `other_charges` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total`        DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status`       VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft,issued,partially_received,received,billed,cancelled
  `payment_status` VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid,partial,paid
  `notes`        VARCHAR(500) NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`po_id`),
  UNIQUE KEY `uq_po_number` (`po_number`),
  KEY `idx_po_vendor` (`vendor_id`),
  KEY `idx_po_status` (`status`),
  KEY `idx_po_created` (`created_at`),
  CONSTRAINT `fk_po_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `item_id`    INT(11) NOT NULL AUTO_INCREMENT,
  `po_id`      INT(11) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `product_id` INT(11) NULL,
  `hsn_code`   VARCHAR(20) NULL,
  `quantity`   DECIMAL(12,3) NOT NULL DEFAULT 0,
  `received_qty` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `unit`       VARCHAR(20) NOT NULL DEFAULT 'Nos',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `gst_rate`   DECIMAL(5,2) NOT NULL DEFAULT 0,
  `line_total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `sort_order` INT(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_id`),
  KEY `idx_poi_po` (`po_id`),
  CONSTRAINT `fk_poi_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`po_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `goods_receipts` (
  `grn_id`     INT(11) NOT NULL AUTO_INCREMENT,
  `grn_number` VARCHAR(30) NOT NULL,
  `po_id`      INT(11) NOT NULL,
  `received_on` DATE NOT NULL,
  `received_by` INT(11) NULL,
  `notes`      VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`grn_id`),
  UNIQUE KEY `uq_grn_number` (`grn_number`),
  KEY `idx_grn_po` (`po_id`),
  CONSTRAINT `fk_grn_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`po_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `goods_receipt_items` (
  `item_id`  INT(11) NOT NULL AUTO_INCREMENT,
  `grn_id`   INT(11) NOT NULL,
  `po_item_id` INT(11) NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_id`),
  KEY `idx_grni_grn` (`grn_id`),
  CONSTRAINT `fk_grni_grn` FOREIGN KEY (`grn_id`) REFERENCES `goods_receipts`(`grn_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**API surface.** `/admin/purchase-orders` (CRUD), `/{id}/issue`, `/{id}/cancel`,
`/{id}/convert-from-pr/{prId}`, `/{id}/receipts` (create GRN), `/admin/goods-receipts` (list).

**Business rules.**
- PO total = Σ line_total + tax (GST via shared `GstCalculator`, seller vs vendor state) +
  other charges, whole-rupee rounded.
- GRN cannot receive more than `quantity - received_qty` per line; updates `received_qty`;
  recomputes PO status `partially_received`/`received`.
- On GRN commit → write `stock_movements` (+IN) (Batch 1.3) inside one transaction.
- Optional "create bill" action posts an `expenses` row (category = material) and/or a payable
  for finance (links cost into P&L). **Open Question OQ-2:** treat purchases as expenses vs a
  separate payables ledger — recommend expenses for v1, payables later.

**Frontend.** `PurchaseOrders.tsx` (list + create from PR or blank), PO detail with "Receive"
dialog (GRN), printable PO PDF (reuse jsPDF template approach). Status timeline component.

**Acceptance criteria.** Convert approved PR → PO (lines copied); issue; partial receive (2 of
5); status `partially_received`; receive remainder → `received`; stock increased exactly.

**Effort:** 8 dev-days. **Risks:** over-receipt and double-post (mitigated by transactional GRN
+ server-side residual-qty check).

### 7.3 Batch 1.3 — Inventory / Stock (feature #7)

**Business intent.** Real-time stock per product/location using an **immutable movement ledger**
(auditable) with a cached on-hand quantity; manual adjustments; low-stock alerts; valuation.

**Data model.**

```sql
CREATE TABLE IF NOT EXISTS `inventory_locations` (
  `location_id` INT(11) NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(80) NOT NULL,
  `is_default`  TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_items` (
  `stock_id`     INT(11) NOT NULL AUTO_INCREMENT,
  `product_id`   INT(11) NOT NULL,
  `location_id`  INT(11) NOT NULL,
  `on_hand`      DECIMAL(14,3) NOT NULL DEFAULT 0,   -- cached, derived from movements
  `reorder_level` DECIMAL(14,3) NOT NULL DEFAULT 0,
  `avg_cost`     DECIMAL(12,2) NOT NULL DEFAULT 0,   -- moving average cost
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `uq_stock_product_loc` (`product_id`,`location_id`),
  KEY `idx_stock_low` (`on_hand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_movements` (
  `movement_id` INT(11) NOT NULL AUTO_INCREMENT,
  `product_id`  INT(11) NOT NULL,
  `location_id` INT(11) NOT NULL,
  `direction`   VARCHAR(3) NOT NULL,        -- 'in' | 'out'
  `quantity`    DECIMAL(14,3) NOT NULL,
  `unit_cost`   DECIMAL(12,2) NULL,
  `ref_type`    VARCHAR(20) NOT NULL,       -- 'grn','order','adjustment','opening'
  `ref_id`      INT(11) NULL,
  `note`        VARCHAR(255) NULL,
  `created_by`  INT(11) NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movement_id`),
  KEY `idx_mov_product_date` (`product_id`,`created_at`),
  KEY `idx_mov_ref` (`ref_type`,`ref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Business rules.**
- Every stock change writes a `stock_movements` row and updates `stock_items.on_hand`
  (+in/−out) in one transaction; `on_hand` is a cache that must always equal Σ movements
  (a nightly/manual **reconciliation** endpoint verifies and repairs).
- **GRN (in)** sets `unit_cost` and recomputes moving-average `avg_cost`.
- **Sales fulfilment (out):** when an order ships, post an `out` movement (integrates with
  existing `orders`; behind a setting so it can be enabled when opening stock is loaded).
- **Adjustments:** `/admin/inventory/adjustments` with reason; writes movement.
- **Opening balances:** loaded via the import engine (`module='opening_stock'`).

**API surface.** `/admin/inventory` (on-hand list + valuation + low-stock flag),
`/admin/inventory/{productId}/movements` (ledger), `/admin/inventory/adjustments` (POST),
`/admin/inventory/reconcile` (POST, owner only), `/admin/inventory/locations` (CRUD).

**Frontend.** `Inventory.tsx`: stock table (on-hand, reorder level, value = on_hand×avg_cost,
low-stock badge), product drill-down ledger, adjustment dialog, valuation summary card.
Dashboard tile "Low stock items".

**Acceptance criteria.** Receiving a PO increases on-hand and recomputes avg cost; adjustment
−5 with reason reflected in ledger and on-hand; reconcile reports 0 discrepancies; low-stock
list correct vs reorder level.

**Effort:** 9 dev-days. **Risks:** cache drift (mitigated by reconcile + always-transactional
writes); negative stock (configurable allow/deny).

---

## 8. Phase 2 — Sales, Billing & Compliance Documents

### 8.1 Batch 2.1 — Payment Entry at Invoice Section (feature #1)

**Business intent.** Record actual customer **payments/receipts** against invoices (full or
partial), auto-maintain invoice `payment_status`, and feed real cash into revenue/P&L (Phase 1
keyed revenue on `payment_status='paid'`; payments make that automatic and accurate).

**Data model.**

```sql
CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id`   INT(11) NOT NULL AUTO_INCREMENT,
  `payment_number` VARCHAR(30) NOT NULL,
  `invoice_id`   INT(11) NULL,                  -- nullable for on-account receipts
  `customer_id`  INT(11) NULL,                  -- users.user_id
  `direction`    VARCHAR(3) NOT NULL DEFAULT 'in', -- 'in' receipt | 'out' refund/vendor pay
  `amount`       DECIMAL(12,2) NOT NULL,
  `method`       VARCHAR(20) NOT NULL,          -- cash,upi,bank_transfer,cheque,card
  `reference`    VARCHAR(100) NULL,             -- UTR/cheque no
  `paid_on`      DATE NOT NULL,
  `notes`        VARCHAR(255) NULL,
  `created_by`   INT(11) NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `uq_payment_number` (`payment_number`),
  KEY `idx_payments_invoice` (`invoice_id`),
  KEY `idx_payments_paid_on` (`paid_on`),
  KEY `idx_payments_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Add to `invoices`: `amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0` (cached sum of receipts).
`payment_status` derivation: `0 → unpaid`, `0<paid<total → partial`, `paid≥total → paid`.

**Business rules.**
- On payment create/void → recompute `invoices.amount_paid` and `payment_status` in a
  transaction; write `audit_log`.
- Over-payment beyond invoice total warned (allowed → becomes advance/on-account).
- A receipt PDF can be generated (reuse jsPDF).
- Revenue/finance: payments are the **canonical cash signal**; `AdminFinanceController`
  payments/inflows already key on `payment_status` — keep consistent.

**API surface.** `/admin/payments` (list, filter by invoice/customer/date),
`/admin/invoices/{id}/payments` (list + POST receipt), `/admin/payments/{id}` (GET/void).
Invoice detail returns `amount_paid`, `balance_due`.

**Frontend.** In `Invoices.tsx` invoice view: a **Payments panel** (list of receipts + "Record
Payment" dialog: amount default = balance due, method, reference, date). Show
Paid/Partial/Unpaid chips and balance due. Optional standalone `Payments.tsx` ledger.

**Acceptance criteria.** Partial payment moves invoice to `partial` and reduces balance due;
final payment → `paid`; voiding a payment reverts status; P&L revenue reflects only received
cash for manual invoices.

**Effort:** 6 dev-days. **Risks:** rounding vs invoice whole-rupee totals (use balance ≤ ₹0.50
tolerance to mark paid).

### 8.2 Batch 2.2 — Quotation + Proforma Invoice (features #11, #10)

**Business intent.** Formal **Quotation** (price offer, no GST liability) → **Proforma Invoice**
(commitment doc) → convert to a **Tax Invoice** (existing). Reuse the invoice line-item + GST
engine; these are "draft invoices" with different document types and no ledger/GST posting until
converted.

**Design decision.** Introduce a single `sales_documents` table with `doc_type` =
`quotation|proforma`, sharing one items table, rather than three near-identical schemas. The
existing `quotes`/`quote_requests` tables remain for the public website quote-request flow;
the new quotation here is the internal sales document. (Reconcile/merge is **OQ-3**.)

```sql
CREATE TABLE IF NOT EXISTS `sales_documents` (
  `doc_id`      INT(11) NOT NULL AUTO_INCREMENT,
  `doc_type`    VARCHAR(12) NOT NULL,        -- 'quotation' | 'proforma'
  `doc_number`  VARCHAR(30) NOT NULL,
  `customer_id` INT(11) NULL,
  `customer_name` VARCHAR(200) NULL,
  `customer_gstin` VARCHAR(20) NULL,
  `customer_state` VARCHAR(80) NULL,
  `seller_state` VARCHAR(80) NULL,
  `doc_date`    DATE NOT NULL,
  `valid_until` DATE NULL,
  `subtotal`    DECIMAL(12,2) NOT NULL DEFAULT 0,
  `discount`    DECIMAL(12,2) NOT NULL DEFAULT 0,
  `tax_amount`  DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total`       DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status`      VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft,sent,accepted,declined,converted,expired
  `converted_invoice_id` INT(11) NULL,
  `terms`       TEXT NULL,
  `notes`       VARCHAR(500) NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`doc_id`),
  UNIQUE KEY `uq_sales_doc_number` (`doc_number`),
  KEY `idx_sales_doc_type_status` (`doc_type`,`status`),
  KEY `idx_sales_doc_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_document_items` (
  `item_id`    INT(11) NOT NULL AUTO_INCREMENT,
  `doc_id`     INT(11) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `hsn_code`   VARCHAR(20) NULL,
  `quantity`   DECIMAL(12,3) NOT NULL DEFAULT 0,
  `unit`       VARCHAR(20) NOT NULL DEFAULT 'Nos',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `gst_rate`   DECIMAL(5,2) NOT NULL DEFAULT 0,
  `line_total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `sort_order` INT(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_id`),
  KEY `idx_sdi_doc` (`doc_id`),
  CONSTRAINT `fk_sdi_doc` FOREIGN KEY (`doc_id`) REFERENCES `sales_documents`(`doc_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**API surface.** `/admin/sales-documents?type=quotation|proforma` (CRUD),
`/{id}/send`, `/{id}/accept`, `/{id}/decline`, `/{id}/convert` (→ creates an invoice via the
existing invoice store, copying lines; sets `converted_invoice_id`, status `converted`),
`/{id}/pdf`.

**Frontend.** `Quotations.tsx` and `Proforma.tsx` (or one page with a type tab) reusing the
invoice line-item editor and the jsPDF template (different title/labels, no "Tax Invoice"
wording for quotation/proforma; proforma shows "PROFORMA INVOICE — not a tax invoice").
"Convert to Invoice" button opens the prefilled invoice flow.

**Acceptance criteria.** Create quotation → PDF → accept → convert to proforma → convert to tax
invoice; line items and GST identical end-to-end; converted docs are read-only and link to the
invoice.

**Effort:** 8 dev-days. **Risks:** divergence from invoice GST math → mitigated by the shared
`GstCalculator` extracted here and retrofitted to invoices.

### 8.3 Batch 2.3 — Test Certificates (feature #8)

**Business intent.** Quality/test certificates per product batch, surfaced in **(a)** admin
dashboard, **(b)** customer app/portal, and **(c)** public website (downloadable proof of
quality for biomass pellet buyers).

```sql
CREATE TABLE IF NOT EXISTS `test_certificates` (
  `cert_id`     INT(11) NOT NULL AUTO_INCREMENT,
  `cert_number` VARCHAR(40) NOT NULL,
  `product_id`  INT(11) NULL,
  `batch_no`    VARCHAR(60) NULL,
  `title`       VARCHAR(160) NOT NULL,        -- e.g. 'Calorific Value Report'
  `parameters_json` TEXT NULL,                -- [{name,value,unit,spec}]
  `issued_on`   DATE NULL,
  `valid_until` DATE NULL,
  `lab_name`    VARCHAR(160) NULL,
  `file_path`   VARCHAR(255) NULL,            -- PDF via FileStore/attachments
  `is_public`   TINYINT(1) NOT NULL DEFAULT 0,-- show on website
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cert_id`),
  UNIQUE KEY `uq_cert_number` (`cert_number`),
  KEY `idx_cert_product` (`product_id`),
  KEY `idx_cert_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**API surface.** Admin: `/admin/test-certificates` (CRUD + upload). Public: `GET
/test-certificates?product=…` (only `is_public=1`, no auth) for the website; customer portal
reuses the same public/auth, scoped list.

**Frontend.** `TestCertificates.tsx` (admin CRUD + PDF upload + parameters editor + public
toggle); website integration is a read-only list/section (separate website codebase — provide
the endpoint + a sample embed snippet); dashboard tile "Latest certificates".

**Acceptance criteria.** Upload a certificate PDF with parameters; mark public; it appears on
the public endpoint and not when unpublished; invalid file type rejected.

**Effort:** 5 dev-days. **Risks:** public endpoint exposure → strict `is_public` filter + no
internal fields leaked; rate-limit public route.

### 8.4 Batch 2.4 — Auto GST Compliance Tracking (feature #20)

**Business intent.** Automatically track GST filing obligations (GSTR-1, GSTR-3B) per tax
period from invoices/`gst_records`: tax collected, due dates, filing status, and alerts for
upcoming/overdue filings. (Not e-filing; a **compliance tracker/dashboard**.)

```sql
CREATE TABLE IF NOT EXISTS `gst_compliance_periods` (
  `period_id`   INT(11) NOT NULL AUTO_INCREMENT,
  `period`      VARCHAR(7) NOT NULL,          -- 'YYYY-MM'
  `return_type` VARCHAR(10) NOT NULL,         -- 'GSTR1','GSTR3B'
  `taxable_value` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `cgst`        DECIMAL(14,2) NOT NULL DEFAULT 0,
  `sgst`        DECIMAL(14,2) NOT NULL DEFAULT 0,
  `igst`        DECIMAL(14,2) NOT NULL DEFAULT 0,
  `invoice_count` INT(11) NOT NULL DEFAULT 0,
  `due_date`    DATE NULL,
  `status`      VARCHAR(20) NOT NULL DEFAULT 'open', -- open,ready,filed,overdue
  `filed_on`    DATE NULL,
  `arn`         VARCHAR(40) NULL,             -- acknowledgement ref after filing
  `notes`       VARCHAR(255) NULL,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`period_id`),
  UNIQUE KEY `uq_gst_period_type` (`period`,`return_type`),
  KEY `idx_gst_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Business rules.** A **recompute** endpoint aggregates invoices per period into the tax
buckets; due dates computed by Indian GST calendar (GSTR-1 ~11th, GSTR-3B ~20th of next
month — configurable in `settings`); status auto-flips to `overdue` past due if not `filed`.
Owner marks `filed` with ARN. Dashboard alert for due-soon/overdue.

**API surface.** `/admin/gst-compliance` (list periods), `/recompute` (POST),
`/{id}/mark-filed` (POST), `/summary` (counts: open/overdue, tax payable est.).
Export GSTR-1-style line list to Excel (reuse exporter) to assist manual filing.

**Frontend.** `GstCompliance.tsx`: period grid with status chips, tax breakdown, due-date
countdown, "Mark filed" action, Excel export. Dashboard compliance tile.

**Acceptance criteria.** Recompute builds periods from existing invoices with correct
CGST/SGST/IGST sums; overdue auto-flag; export matches invoice tax totals.

**Effort:** 6 dev-days. **Risks:** double counting cancelled invoices → exclude
`status in (Cancelled)`; period boundary by invoice date.

---

## 9. Phase 3 — Dealer Network & Customer Intelligence

### 9.1 Batch 3.1 — Dealer Page Mapping + Price Mapping + Customer Dedupe (feature #5)

**Business intent.** Each **dealer** gets a landing/workspace to add **their** customers, with
**dealer-specific price lists** (different pricing per dealer/product). When a customer
registers directly in the app, the system must **detect existing customers already mapped to a
dealer** (dedupe by phone/email/GSTIN) and link/flag appropriately.

**Data model.**

```sql
-- Dealers are users with user_type='dealer'; this adds their pricing + customer mapping.
CREATE TABLE IF NOT EXISTS `dealer_price_lists` (
  `price_list_id` INT(11) NOT NULL AUTO_INCREMENT,
  `dealer_id`   INT(11) NOT NULL,             -- users.user_id (dealer)
  `name`        VARCHAR(120) NOT NULL,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`price_list_id`),
  KEY `idx_dpl_dealer` (`dealer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dealer_price_items` (
  `id`          INT(11) NOT NULL AUTO_INCREMENT,
  `price_list_id` INT(11) NOT NULL,
  `product_id`  INT(11) NOT NULL,
  `unit_price`  DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dpl_product` (`price_list_id`,`product_id`),
  CONSTRAINT `fk_dpi_list` FOREIGN KEY (`price_list_id`) REFERENCES `dealer_price_lists`(`price_list_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dealer_customers` (
  `id`          INT(11) NOT NULL AUTO_INCREMENT,
  `dealer_id`   INT(11) NOT NULL,
  `customer_id` INT(11) NULL,                 -- users.user_id if registered
  `name`        VARCHAR(200) NOT NULL,
  `phone`       VARCHAR(20) NULL,
  `email`       VARCHAR(120) NULL,
  `gstin`       VARCHAR(20) NULL,
  `address`     VARCHAR(255) NULL,
  `price_list_id` INT(11) NULL,
  `link_status` VARCHAR(20) NOT NULL DEFAULT 'dealer_added', -- dealer_added,linked,conflict
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dc_dealer` (`dealer_id`),
  KEY `idx_dc_phone` (`phone`),
  KEY `idx_dc_email` (`email`),
  KEY `idx_dc_gstin` (`gstin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Dedupe logic.** On direct app registration (existing `AuthController` register), run a match
against `dealer_customers` + `users` by normalized phone/email/GSTIN. If a match exists →
create the user but **link** to the dealer mapping (`link_status='linked'`, set `customer_id`)
and notify the dealer; on ambiguous match → `conflict` for manual review. Provide an admin
"Customer–Dealer conflicts" queue.

**Pricing application.** When an order/invoice is created for a customer mapped to a dealer
price list, default unit prices from `dealer_price_items` (override allowed).

**API surface.** Dealer-guarded: `/dealer/customers` (CRUD own), `/dealer/price-lists`
(read own). Admin: `/admin/dealers`, `/admin/dealer-price-lists` (CRUD), `/admin/dealer-customers`
(list + conflict queue + resolve). Public/auth registration hook returns dealer-link info.

**Frontend.** Extend `Dealers.tsx` (admin) with price-list editor + mapped-customers + conflict
queue. New **dealer landing** page/route (role `dealer`) to add customers and see their price
list. Reuse customer form components.

**Acceptance criteria.** Dealer adds a customer with a price list; that price defaults on the
customer's invoice; a direct registration matching an existing dealer customer is auto-linked
and the dealer is notified; ambiguous case lands in the conflict queue.

**Effort:** 9 dev-days. **Risks:** false-positive matches (use exact normalized phone/GSTIN, not
fuzzy name) → conflict queue prevents silent wrong links; multi-tenant data isolation for
dealer routes (enforce `dealer_id = auth user`).

### 9.2 Batch 3.2 — Customer Data Analytics (feature #6)

**Business intent.** Per-customer intelligence: monthly purchase trend, total/average order
value, **payment behaviour** (average days from invoice to payment = "how quick is payment
made"), outstanding balance, last purchase recency, and segmentation (e.g. RFM-lite).

**Approach.** Pure analytics over `orders`, `invoices`, `payments` — **no new core tables**;
add a couple of summary endpoints + optional materialized snapshot for speed.

```sql
-- Optional nightly snapshot to keep dashboards fast on shared hosting
CREATE TABLE IF NOT EXISTS `customer_metrics` (
  `customer_id`  INT(11) NOT NULL,
  `total_orders` INT(11) NOT NULL DEFAULT 0,
  `total_spend`  DECIMAL(14,2) NOT NULL DEFAULT 0,
  `avg_order_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `outstanding`  DECIMAL(14,2) NOT NULL DEFAULT 0,
  `avg_payment_days` DECIMAL(6,1) NULL,
  `last_order_date` DATE NULL,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Metrics defined.**
- **avg_payment_days** = mean of `(payments.paid_on − invoices.invoice_date)` over paid
  invoices for that customer.
- **outstanding** = Σ invoice totals − Σ payments (unpaid/partial).
- **monthly purchase** = Σ invoice/order totals grouped by `YYYY-MM`.

**API surface.** `/admin/customers/{id}/analytics` (detail: monthly series, payment-speed,
outstanding), `/admin/customers/analytics/summary` (top customers, slow payers, churn-risk =
no order in N days), `/admin/customer-metrics/recompute`.

**Frontend.** Extend `Customers.tsx` with an **Analytics** tab per customer (charts via
recharts: monthly spend bar, payment-speed gauge, outstanding) + a portfolio dashboard
(top customers, slowest payers table). Reuse export.

**Acceptance criteria.** Customer with 6 invoices and varied payment dates shows correct
avg-payment-days and monthly trend; slow-payer list ranks by avg-payment-days desc;
outstanding equals invoices − payments.

**Effort:** 5 dev-days. **Risks:** heavy live aggregation on shared hosting → use the snapshot
table + the new indexes from the performance migration; recompute on a schedule or on demand.

---

## 10. Phase 4 — Finance Analytics & Planning

### 10.1 Batch 4.1 — Expense Analysis with Graphics + Reports Analytics (features #13, #12)

**Business intent.** Visual expense analytics (by category, vendor, month, trend, top spends)
and a richer reports-analytics layer over the existing `AdminReportsController` (sales,
orders, payments, expenses, forecast) with charts and Excel/PDF export.

**Approach.** Mostly **read-only analytics endpoints** + frontend charts; no schema changes
beyond reusing `expenses`, `purchase_orders`, `payments`, `orders`, `invoices`.

**API surface.**
- `/admin/expenses/analytics?from&to` → totals, by-category breakdown, monthly trend,
  top-10 vendors/categories, month-over-month delta.
- `/admin/reports/analytics?module&from&to` → series + aggregates for charts (extends the
  existing reports module which currently returns rows + total).

**Frontend.** Enhance `Expenses.tsx` with an **Analytics** tab (pie by category, stacked bar by
month, trend line, top-spend list). Enhance `Reports.tsx` with chart views per module and
combined revenue-vs-expense overlays. Reuse recharts + exporters.

**Acceptance criteria.** Expense analytics totals reconcile with the expense list for the same
window; charts render for empty and large datasets; export matches on-screen figures.

**Effort:** 6 dev-days. **Risks:** date-window mismatches → single shared window param + server
truth.

### 10.2 Batch 4.2 — Budget vs Actual + Benchmark Values (features #15, #14)

**Business intent.** Define **budgets** (by category and month/quarter/year) and compare to
**actuals** (expenses + COGS + revenue); define **benchmark** target values (e.g. target gross
margin %, max expense ratio, target revenue) and show variance/RAG status. Extends the existing
`finance_config` ratio targets.

```sql
CREATE TABLE IF NOT EXISTS `budgets` (
  `budget_id`   INT(11) NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120) NOT NULL,
  `fiscal_year` VARCHAR(9) NOT NULL,          -- '2026-27'
  `period_type` VARCHAR(10) NOT NULL DEFAULT 'monthly', -- monthly,quarterly,yearly
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`budget_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `budget_lines` (
  `line_id`    INT(11) NOT NULL AUTO_INCREMENT,
  `budget_id`  INT(11) NOT NULL,
  `category`   VARCHAR(80) NOT NULL,          -- matches expense categories / 'revenue'
  `period`     VARCHAR(7) NOT NULL,           -- 'YYYY-MM' or 'YYYY-Qn'
  `amount`     DECIMAL(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`line_id`),
  KEY `idx_budget_lines_budget` (`budget_id`),
  UNIQUE KEY `uq_budget_cat_period` (`budget_id`,`category`,`period`),
  CONSTRAINT `fk_budget_lines_budget` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`budget_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `benchmarks` (
  `benchmark_id` INT(11) NOT NULL AUTO_INCREMENT,
  `metric`      VARCHAR(60) NOT NULL,         -- 'gross_margin','expense_ratio','revenue','aov'
  `target_value` DECIMAL(14,4) NOT NULL,
  `unit`        VARCHAR(10) NULL,             -- '%','INR','x'
  `comparison`  VARCHAR(4) NOT NULL DEFAULT 'gte', -- gte,lte
  `notes`       VARCHAR(255) NULL,
  PRIMARY KEY (`benchmark_id`),
  UNIQUE KEY `uq_benchmark_metric` (`metric`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Business rules.** Budget vs Actual = per category/period budget amount vs actual (expenses
for that category; revenue from invoices/payments) → variance ₹ and %, RAG colour. Benchmarks
compared to live computed ratios (reuse `AdminFinanceController::ratios`).

**API surface.** `/admin/budgets` (CRUD + lines), `/admin/budgets/{id}/vs-actual?period`,
`/admin/benchmarks` (CRUD), `/admin/benchmarks/status` (target vs actual + RAG).

**Frontend.** `Budgeting.tsx`: budget editor grid (category × period), Budget-vs-Actual view
(bar overlay + variance table, RAG), Benchmarks panel (target vs actual gauges). Tie into
`Finance.tsx`.

**Acceptance criteria.** Define a monthly marketing budget; actual expenses in that category
show variance and RAG; benchmark gross-margin target shows green when actual ≥ target.

**Effort:** 8 dev-days. **Risks:** category taxonomy mismatch between budget lines and expense
categories → drive both from a shared category list in `settings`.

---

## 11. Phase 5 — HR, Compliance & Media

### 11.1 Batch 5.1 — Employee Compliance / Insurance (feature #9)

**Business intent.** Track statutory/insurance compliance **per employee**: insurance policies
(health/accident), ESI/PF/EPF, licenses, with provider, policy number, coverage, start/expiry,
document upload, and **expiry alerts**.

```sql
CREATE TABLE IF NOT EXISTS `employee_compliance` (
  `compliance_id` INT(11) NOT NULL AUTO_INCREMENT,
  `employee_key`  VARCHAR(40) NOT NULL,        -- FK to employees.employee_key
  `type`          VARCHAR(30) NOT NULL,        -- insurance,esi,pf,license,medical
  `provider`      VARCHAR(160) NULL,
  `policy_number` VARCHAR(80) NULL,
  `coverage_amount` DECIMAL(12,2) NULL,
  `premium`       DECIMAL(12,2) NULL,
  `start_date`    DATE NULL,
  `expiry_date`   DATE NULL,
  `status`        VARCHAR(20) NOT NULL DEFAULT 'active', -- active,expiring,expired
  `file_path`     VARCHAR(255) NULL,
  `notes`         VARCHAR(255) NULL,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`compliance_id`),
  KEY `idx_emp_compliance_emp` (`employee_key`),
  KEY `idx_emp_compliance_expiry` (`expiry_date`),
  KEY `idx_emp_compliance_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Business rules.** Status auto-derived from `expiry_date` (expiring within N days →
`expiring`; past → `expired`). Dashboard/HR alert list for upcoming expiries. Document via
FileStore.

**API surface.** `/admin/employees/{key}/compliance` (list + POST), `/admin/compliance`
(portfolio: filter by type/status/expiry), `/admin/compliance/expiring?days=30`.

**Frontend.** Employee detail → **Compliance** tab (records + upload + expiry chips); HR
dashboard "Compliance expiring" widget. Reuse `Employees.tsx`.

**Acceptance criteria.** Add an insurance policy with expiry next week → shows `expiring` and in
the alert list; expired policy flagged; document downloadable.

**Effort:** 5 dev-days. **Risks:** PII in documents → access restricted to HR/owner roles.

### 11.2 Batch 5.2 — Attendance Analytics + Employee/TMS Upload (features #16, #18)

**Business intent.** (a) Analytics over existing `attendance` (present/absent/late/overtime
trends, per-employee + department summaries, monthly heatmap), and (b) a **bulk upload
facility** for employee master data and **TMS/biometric attendance logs** (device punch
exports) via the import engine.

**Clarification (OQ-4):** "TMS" is assumed to be the **Time/attendance Management System**
(biometric device logs). Confirm device/export format (CSV of employee_id, timestamp, in/out).
The importer maps punches → `attendance` rows (pair in/out → hours, late vs shift).

**Approach.** Analytics = read-only endpoints over `attendance`/`attendance_shifts`/`payroll`.
Upload = import-engine mappers (`module='employees'`, `module='attendance_punches'`).

**API surface.** `/admin/attendance/analytics?from&to&dept` (summaries, trends, late/overtime),
`/admin/attendance/import` (punch file → dry-run → commit), `/admin/employees/import`
(bulk master upload).

**Frontend.** Extend `Attendance.tsx` with an **Analytics** tab (present/absent trend, late
count, overtime hours, department comparison, monthly calendar heatmap) + an **Import** dialog
(upload → map → preview → commit). `Employees.tsx` gets a bulk-import button.

**Acceptance criteria.** A punch CSV imports into attendance with correct in/out pairing and
late flagging vs shift; analytics totals match raw attendance; employee bulk upload creates/updates
by `employee_key`.

**Effort:** 7 dev-days. **Risks:** device format variance (OQ-4) → configurable column mapping;
duplicate punches → idempotent by (employee, timestamp).

### 11.3 Batch 5.3 — Meeting Events Photos & Videos Upload (feature #19)

**Business intent.** Attach photos and videos to `meetings` (events), with gallery view and
download; large-file handling.

**Approach.** Reuse `attachments` (entity_type `meeting`, category `photo`/`video`). **Videos
go to external object storage** per OQ-1 (store URL); photos local with generated thumbnails.

**API surface.** `/admin/meetings/{id}/media` (list + upload), `DELETE
/admin/meetings/{id}/media/{attachmentId}`. Upload returns the stored URL/path.

**Frontend.** Extend `Meetings.tsx` meeting detail with a **Media gallery** (grid of photo
thumbnails + video players/links, upload dropzone, delete). Lazy-load thumbnails.

**Acceptance criteria.** Upload 5 photos + 1 video to a meeting; gallery renders thumbnails and
plays/links video; oversize video routed to external storage or rejected with guidance; delete
removes file + row.

**Effort:** 6 dev-days. **Risks:** Hostinger upload limits/disk (OQ-1) → enforce per-file caps,
prefer external storage for video, chunked upload if needed.

---

## 12. Phase 6 — Data Migration & Interop Platform (feature #17)

Builds the **end-user** import/export experience on top of the Batch 0.3 engine, with
per-module mappers and a clean UI, plus scheduled backups/exports.

### 12.1 Batch 6.1 — Per-Module Import Mappers + Import UI

- Mappers for: vendors, customers/users, products, opening stock, expenses, employees,
  attendance punches, invoices (historical, optional). Each declares required/optional fields,
  validators, and a natural key for idempotent upsert.
- **Import UI** (`DataImport.tsx`): pick module → upload CSV/XLSX → auto-map columns (with
  manual override) → dry-run preview (valid/invalid counts + downloadable error report) →
  commit → result summary. Uses `import_jobs`/`import_job_rows` from Batch 0.3.

### 12.2 Batch 6.2 — Exports + Scheduled Backups

- **Per-module export** (CSV/XLSX/PDF) reusing `src/lib/exporters` and server-side streaming
  for large tables.
- **Full data export** ("download everything") + a **scheduled DB backup** guidance/script for
  Hostinger (cron or manual mysqldump) — operational runbook, not just code.
- **Acceptance:** round-trip — export customers, re-import into a staging copy with zero data
  loss; large export does not exhaust memory (chunked).

**Effort:** 10 dev-days across 6.1/6.2. **Risks:** encoding/locale (₹, dates) → normalize to
UTF-8 + ISO dates; partial commits → transactional batches with resumable jobs.

---

## 13. Non-Functional Requirements (NFRs)

- **Performance:** every new list endpoint paginated (default 25, max 100) and indexed on its
  filter/sort columns (follow the Phase-1.5 indexing discipline). Heavy analytics use snapshot
  tables (`customer_metrics`, `gst_compliance_periods`) refreshed on demand/scheduled.
  Frontend lists use React Query caching (already standardised).
- **Security:** all new admin routes behind the `'admin'`/role guard; dealer routes strictly
  scoped to `dealer_id = auth user`; public endpoints (test certs) expose only whitelisted
  fields and are rate-limited; uploads validated by MIME+extension+size; SQL strictly via
  prepared statements (existing `Database` helper); text sanitised with `Request::sanitize`.
- **Auditability:** all state transitions (approve, convert, receive, post payment, file GST,
  void) write `audit_log` with actor, entity, before/after status.
- **Data integrity:** money `DECIMAL`; multi-row writes transactional; cached aggregates
  (`on_hand`, `amount_paid`) always reconcilable to their ledgers; foreign keys with sensible
  cascade.
- **Consistency:** one shared `GstCalculator` and one numbering service; no duplicated tax or
  numbering logic.
- **Accessibility/UX:** consistent shadcn components, keyboard-navigable dialogs, loading and
  empty states on every page, optimistic-free mutations with clear toasts.
- **Observability:** structured `error_log` on server exceptions; a lightweight `/admin/health`
  endpoint (DB connectivity, disk free, pending import jobs).

---

## 14. Testing & QA Strategy

- **Backend unit/integration:** for each controller, test happy path + validation failures +
  permission failures + transactional rollback (simulate mid-transaction error). Use a staging
  DB seeded from a prod copy.
- **Numbering concurrency test:** N parallel allocations → unique sequence (Batch 0.1).
- **Money/GST tests:** intra-state vs inter-state, multi-rate lines, discount, rounding — assert
  against known-good invoice totals; reuse as regression for quotation/proforma/PO.
- **Inventory ledger tests:** receive → adjust → fulfil → reconcile == 0 discrepancy.
- **Payment status state machine:** unpaid→partial→paid→void transitions.
- **Import engine:** malformed rows, duplicate natural keys, partial-failure rollback, encoding.
- **Frontend:** `tsc --noEmit` + `npm run build` gate every batch; manual smoke script per page
  (create/edit/list/delete/convert); visual check of charts with empty/large data.
- **Regression pack:** a checklist re-run before each deploy covering invoices, payments, P&L,
  stock, since these are financially sensitive.
- **UAT:** business owner signs off each batch against its Acceptance Criteria before the next
  batch starts.

**QA exit criteria per batch:** 0 known Sev-1/Sev-2 defects; acceptance criteria met; rollback
rehearsed.

---

## 15. Deployment & Release Management (Hostinger)

- **Environment:** PHP + MySQL/MariaDB on Hostinger shared hosting; admin SPA built locally
  (`npm run build`) and copied into `admin/`, uploaded via SFTP; API files uploaded directly.
- **Release order per batch:** (1) run SQL migration in phpMyAdmin on a **backup-first** basis;
  (2) upload new/changed PHP controllers + `api/index.php` routes; (3) upload built `admin/`;
  (4) hard-refresh + smoke test; (5) tag the release.
- **Migrations:** one `.sql` per batch, idempotent where possible, documented "skip on
  duplicate"; always **export a DB backup** before running (mysqldump or phpMyAdmin export).
- **Zero-downtime caveat:** shared hosting has no blue/green; keep migrations **additive**
  (new tables/columns, no destructive drops) so old code keeps working if a rollback is needed.
- **Rollback:** because migrations are additive, rollback = re-upload previous PHP/admin build;
  data remains forward-compatible. Destructive cleanups (if ever) are separate, late, and
  backed up.
- **Config/secrets:** new prefixes/limits live in `settings`/`finance_config`; external storage
  keys (if OQ-1 approved) in server env, never committed.
- **Caching:** keep the `Access-Control-Max-Age` preflight cache and React Query defaults from
  Phase 1.5; ensure OPcache stays enabled.

---

## 16. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Shared-hosting disk/upload limits break video upload (#19) | High | High | External object storage for video (OQ-1); per-file caps; photos local |
| R2 | Inventory cache (`on_hand`) drifts from ledger | Med | High | Always-transactional movements + reconcile endpoint + tests |
| R3 | Duplicate/gap document numbers under concurrency | Med | Med | `document_sequences` atomic allocator (Batch 0.1) |
| R4 | Wrong customer↔dealer auto-link (#5) | Med | Med | Exact-key match only; conflict queue; dealer notification |
| R5 | GST math diverges across invoice/proforma/PO | Med | High | Single shared `GstCalculator`; shared test pack |
| R6 | Legacy import data quality (#17) | High | Med | Dry-run + per-row errors + transactional commit |
| R7 | Analytics queries slow on shared hosting | Med | Med | Snapshot tables + indexes + React Query caching |
| R8 | Scope creep vs "refer Zoho" expectations | High | Med | Lock per-batch acceptance criteria with owner before build |
| R9 | PII exposure (employee insurance, certs) | Low | High | Role-scoped access; whitelist public fields |
| R10 | Destructive migration on live DB | Low | High | Additive-only migrations; mandatory backup before run |

---

## 17. Effort, Timeline & Team

**Effort (1 full-stack dev, dev-days):**

| Phase | Batches | Dev-days |
|---|---|---|
| 0 Foundations | 0.1–0.4 | 10 |
| 1 Procurement & Inventory | 1.1–1.3 | 22 |
| 2 Sales/Billing/Compliance | 2.1–2.4 | 25 |
| 3 Dealer & Customer | 3.1–3.2 | 14 |
| 4 Finance Analytics | 4.1–4.2 | 14 |
| 5 HR/Compliance/Media | 5.1–5.3 | 18 |
| 6 Data Migration | 6.1–6.2 | 10 |
| **Total** | | **≈113 dev-days** |

Add ~15% QA/PM/buffer → **~130 dev-days ≈ 6 calendar months** solo at a sustainable pace, or
**~3 months with 2 developers** (one owning procurement/inventory/finance, one owning
sales/dealer/HR/media), sharing the Phase-0 foundations.

**Roles:** 1–2 full-stack devs; the business owner as Product Owner for per-batch UAT; optional
part-time QA for the regression pack on financially sensitive batches (payments, inventory, GST).

**Suggested sprint cadence:** 2-week sprints, 1 batch per sprint for larger batches (1.2, 1.3,
2.2, 3.1) and 2 small batches per sprint otherwise.

---

## 18. Definition of Done (global, applies to every batch)

1. Migration written, idempotent, runs clean on a prod copy; backup taken before prod run.
2. Backend: `php -l` clean; endpoints return documented shapes; validation + permission +
   transactional rollback covered; `audit_log` on state changes.
3. Frontend: `tsc --noEmit` and `npm run build` pass; page registered in router + sidebar;
   list/empty/loading/error states; React Query caching; toasts.
4. Acceptance criteria demonstrably met (recorded in the batch's UAT note).
5. Smoke test of happy path + ≥1 failure path; regression pack green for money-touching batches.
6. Rollback documented; release tagged; deploy notes updated.
7. No new Sev-1/Sev-2 defects open.

---

## 19. Appendices

### 19.1 Document numbering schemes

| Doc | Prefix | Format | Setting key |
|---|---|---|---|
| Purchase Request | PR | `PR-YYYY-####` | `pr_prefix` |
| Purchase Order | PO | `PO-YYYY-####` | `po_prefix` |
| Goods Receipt | GRN | `GRN-YYYY-####` | `grn_prefix` |
| Quotation | QTN | `QTN-YYYY-####` | `quotation_prefix` |
| Proforma | PFI | `PFI-YYYY-####` | `proforma_prefix` |
| Payment/Receipt | PAY | `PAY-YYYY-####` | `payment_prefix` |
| Stock Adjustment | ADJ | `ADJ-YYYY-####` | `adjustment_prefix` |
| Budget | BUD | `BUD-FY####` | `budget_prefix` |

### 19.2 Status enums (canonical)

- **PR:** draft, submitted, approved, rejected, converted, closed
- **PO:** draft, issued, partially_received, received, billed, cancelled
- **PO payment:** unpaid, partial, paid
- **Sales doc (quotation/proforma):** draft, sent, accepted, declined, converted, expired
- **Invoice payment:** unpaid, partial, paid (existing `payment_status`)
- **GST period:** open, ready, filed, overdue
- **Compliance:** active, expiring, expired
- **Import job:** pending, validating, dry_run, committed, failed
- **Stock movement direction:** in, out

### 19.3 New tables summary (Phase 2)

`document_sequences`, `attachments`, `import_jobs`, `import_job_rows`, `vendors`,
`purchase_requests`, `purchase_request_items`, `purchase_orders`, `purchase_order_items`,
`goods_receipts`, `goods_receipt_items`, `inventory_locations`, `stock_items`,
`stock_movements`, `payments`, `sales_documents`, `sales_document_items`, `test_certificates`,
`gst_compliance_periods`, `dealer_price_lists`, `dealer_price_items`, `dealer_customers`,
`customer_metrics`, `budgets`, `budget_lines`, `benchmarks`, `employee_compliance`.
Column additions: `users.staff_role`, `invoices.amount_paid`.

### 19.4 New frontend pages/clients

Pages: `Vendors`, `PurchaseRequests`, `PurchaseOrders`, `Inventory`, `Payments` (or invoice
panel), `Quotations`, `Proforma`, `TestCertificates`, `GstCompliance`, dealer landing,
`Budgeting`, `DataImport`; analytics tabs added to `Customers`, `Expenses`, `Reports`,
`Attendance`, `Employees`, `Meetings`. API clients mirror each.

### 19.5 Open questions (resolve before the dependent batch)

- **OQ-1 (before 5.3/0.2):** storage budget — approve external object storage (R2/S3) for
  videos/large files? Affects FileStore design.
- **OQ-2 (before 1.2):** purchases posted as `expenses` (v1) or a separate **payables** ledger?
- **OQ-3 (before 2.2):** merge internal quotation with existing website `quotes`/`quote_requests`
  or keep separate?
- **OQ-4 (before 5.2):** exact TMS/biometric export format + meaning of "TMS".
- **OQ-5 (before 1.3):** allow negative stock? single vs multi-location at launch?
- **OQ-6 (general):** which features are "must-have for go-live" vs "fast-follow" to allow
  re-prioritising batches?

### 19.6 Glossary

PR — Purchase Request · PO — Purchase Order · GRN — Goods Receipt Note · COGS — Cost of Goods
Sold · RAG — Red/Amber/Green status · RFM — Recency/Frequency/Monetary · TMS — Time Management
System (biometric attendance) · UAT — User Acceptance Testing · NFR — Non-Functional
Requirement · ARN — Acknowledgement Reference Number (GST filing).

---

*End of Phase 2 Implementation Plan v1.0. Build batch-by-batch in the stated order; resolve the
open questions for each batch before starting it; keep every migration additive and every
money-touching change covered by the regression pack.*
