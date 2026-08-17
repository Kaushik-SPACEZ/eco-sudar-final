# Module 00 — Foundations & Cross-Cutting Architecture

**Part of:** Eco Sudar ERP Phase 2 specification suite
**Audience:** architects (planner view) + developers (builder view)
**Status:** Deep-dive spec v1.0
**Read order:** read this first — every other module depends on these shared services.

> **Business-optimizer thesis.** An ERP creates value not from individual screens but from the
> *connective tissue* between them: one number entered once, flowing automatically into stock,
> cost, tax, cash, and analytics. This module builds that connective tissue — numbering,
> documents, files, roles, audit, money/tax math, notifications, and the data-import spine — so
> every later module is cheaper to build, consistent to use, and trustworthy to report on.

---

## 0. Contents

1. Architectural principles & the optimization lens
2. System & deployment architecture
3. Domain model overview (how everything connects)
4. Cross-cutting service: Document Numbering
5. Cross-cutting service: File & Media Storage
6. Cross-cutting service: Identity, Roles & Permissions (RBAC)
7. Cross-cutting service: Audit & Activity Trail
8. Cross-cutting service: Money, Tax & Rounding (GstCalculator)
9. Cross-cutting service: Notifications & Alerts
10. Cross-cutting service: Configuration & Settings registry
11. Cross-cutting service: Import/Export spine
12. Cross-cutting service: Search, Pagination & Filtering conventions
13. Reporting & analytics architecture (snapshots vs live)
14. Frontend architecture & component system
15. Error handling, validation & API contract
16. Performance & caching architecture
17. Security architecture
18. Observability & health
19. Build/test/release engineering
20. Glossary of cross-cutting elements

---

## 1. Architectural principles & the optimization lens

Every design decision in Phase 2 is filtered through seven principles. When two options
compete, the one that better satisfies these wins.

| # | Principle | What it means in practice | Business value |
|---|---|---|---|
| P1 | **Enter once, reuse everywhere** | A product, customer, vendor, or price is captured once and referenced by ID elsewhere. | Eliminates re-keying, the #1 source of data drift and wasted staff time. |
| P2 | **Ledgers are truth, caches are speed** | Money and stock are immutable event ledgers (`payments`, `stock_movements`); fast columns (`amount_paid`, `on_hand`) are derived caches that are always reconcilable. | Auditable books + fast screens, without choosing one over the other. |
| P3 | **Documents have lifecycles, not flags** | PR→PO→GRN, Quotation→Proforma→Invoice→Payment are explicit state machines with allowed transitions. | Process discipline, clear approvals, no "mystery status". |
| P4 | **Additive, reversible change** | Migrations only add; old code keeps working; rollback = redeploy. | Safe to iterate on one live system on shared hosting. |
| P5 | **One engine per concept** | One numbering service, one tax calculator, one file store, one import spine. | No divergent GST math; fix once, fixed everywhere. |
| P6 | **Automate the boring, surface the exceptions** | The system computes due dates, statuses, totals, alerts; humans only handle exceptions (conflicts, approvals, overdue). | Staff attention spent on judgement, not clerical work — the core of business optimization. |
| P7 | **Every record is reportable** | Consistent timestamps, statuses, foreign keys, and category taxonomies so analytics is a query, not a project. | Decisions backed by data the system already holds. |

**Optimization is a first-class requirement, not an afterthought.** Each module spec ends with
an "Automation & Optimization Opportunities" section that names the manual work the module
removes and the decisions it improves.

---

## 2. System & deployment architecture

```
                       ┌──────────────────────────────────────────────┐
                       │  Admin SPA (React + Vite + TS, shadcn/ui)      │
   Staff / Owner ─────▶│  src/pages/*  ·  src/lib/api/*  ·  React Query │
                       └───────────────┬──────────────────────────────┘
                                       │  HTTPS JSON (Bearer JWT)
   Dealers ───────────▶ (role-scoped routes)                │
   Customers / Public ─▶ (public + auth routes)             ▼
                       ┌──────────────────────────────────────────────┐
                       │  PHP front controller (api/index.php + Router) │
                       │  Controllers → Services → Database (PDO)        │
                       │  Cross-cutting: Numbering · FileStore · RBAC ·  │
                       │  Audit · GstCalculator · Notifications · Import │
                       └───────────────┬──────────────────────────────┘
                                       │
                 ┌─────────────────────┼──────────────────────┐
                 ▼                     ▼                      ▼
          MySQL/MariaDB         uploads/ (local)      External object store
          (transactional)     photos, PDFs, docs       (videos / large files)
                                                       — OQ-1, recommended
```

- **Tier:** classic 3-tier (SPA → PHP API → RDBMS) on Hostinger shared hosting.
- **Statelessness:** API is stateless; auth via JWT; no server session affinity → safe under
  the host's process model.
- **Why this stack stays:** it already works, the team knows it, and Phase 2's complexity is in
  *domain logic and data flow*, not infrastructure. Rewrites are explicitly out of scope.
- **Where it strains & how we cope:** cold PHP + per-request DB connect + limited disk. Mitigated
  by (a) preflight caching + React Query (done in Phase 1.5), (b) snapshot tables for heavy
  analytics, (c) external storage for video, (d) additive migrations and chunked imports.

**Layering inside the API (new in Phase 2).** Introduce a thin **service layer** between
controllers and `Database` for the cross-cutting concerns and for multi-step domain operations
(e.g. `PurchaseOrderService::receive()`, `PaymentService::record()`). Controllers stay thin
(parse → authorize → call service → respond); services own transactions and business rules.
This keeps domain logic testable and out of HTTP handlers.

```
api/
  controllers/admin/*.php      # HTTP: parse, authorize, delegate, respond
  services/                    # NEW: domain logic, transactions, cross-module rules
    NumberSequence.php
    FileStore.php
    Rbac.php
    AuditTrail.php
    GstCalculator.php
    Notifier.php
    ImportEngine.php
    InventoryService.php
    PaymentService.php
    PurchaseOrderService.php
  core/ (Database, Router, Request, Response, Auth)  # existing
```

---

## 3. Domain model overview (how everything connects)

The Phase 2 entity map, grouped by the value chains they serve. Arrows = "references / flows into".

**Procure-to-Pay**
```
vendors ──▶ purchase_requests ──▶ purchase_orders ──▶ goods_receipts ──▶ stock_movements ──▶ stock_items
                                          │                                     │
                                          └────────────▶ expenses / payables    └──▶ products (catalog)
```

**Order-to-Cash**
```
products/price ──▶ quotation ──▶ proforma ──▶ invoice ──▶ payments ──▶ revenue / P&L
                                                  │            │
                                              gst_records   amount_paid (cache) → payment_status
                                                  └──▶ gst_compliance_periods
```

**Channel & Intelligence**
```
dealers (users) ──▶ dealer_price_lists/items ──▶ default pricing on orders/invoices
dealers ──▶ dealer_customers ──(dedupe)──▶ users (customers) ──▶ customer_metrics (analytics)
```

**Finance Planning**
```
expenses + invoices + payments + COGS ──▶ analytics ──▶ budgets/budget_lines (vs actual) + benchmarks
```

**HR & Documents**
```
employees ──▶ employee_compliance (insurance/statutory, expiry alerts)
attendance (+ TMS import) ──▶ attendance analytics ──▶ payroll
meetings ──▶ attachments (photos/videos)
test_certificates ──▶ products + public website
```

**Spine (touches all)**
```
document_sequences · attachments · import_jobs/import_job_rows · audit_log · settings · notifications
```

**Key relational anchors:** `users.user_id` (customers, dealers, staff), `employees.employee_key`
(HR), `products.product_id` (catalog & stock), `invoices.invoice_id` (billing & cash), and the
polymorphic `attachments(entity_type, entity_id)` for files.

---

## 4. Cross-cutting service: Document Numbering

**Purpose.** Guarantee unique, sequential, human-readable, gap-resistant document numbers across
PR/PO/GRN/QTN/PFI/PAY/ADJ/BUD — without the race conditions of `MAX(id)+1` on shared hosting.

**Functionalities → sub-functionalities → elements**

- **Allocate next number** (`NumberSequence::next(docType)`)
  - Atomic increment via `document_sequences` upsert (`ON DUPLICATE KEY UPDATE next_value =
    LAST_INSERT_ID(next_value+1)`), inside the caller's transaction.
  - Period scoping: yearly (`YYYY`) by default; configurable to monthly per doc type.
  - Format assembly: `PREFIX-PERIOD-#### `; width and prefix from `settings`.
- **Prefix management** (admin Settings screen): edit per-doc prefix, padding width, reset
  policy (calendar-year reset vs continuous).
- **Reservation & rollback:** numbers allocated inside the document's own transaction; if the
  document insert fails, the sequence increment rolls back with it (no orphan numbers).
- **Reprint safety:** the number is persisted on the document; PDFs render the stored number.

**Process flow (allocate within a document create)**
1. Service opens transaction.
2. `NumberSequence::next('PO')` → `PO-2026-0042`.
3. Insert `purchase_orders` row with that number + child items.
4. Commit (both succeed) or rollback (number not consumed).

**Business optimization.** Removes the recurring "duplicate/skipped invoice number" class of
bugs (already seen in Phase 1 with `MAX(invoice_id)+1`), and gives auditors clean sequences.
**Migration note:** retrofit invoices to this service during Batch 2.1 so all documents share
one mechanism (P5).

**Edge cases:** year rollover at 23:59:59; two docs created in the same millisecond (atomic
upsert handles it); manual override of a number (allowed for owner, validated unique).

---

## 5. Cross-cutting service: File & Media Storage

**Purpose.** One safe, consistent way to store and serve files (employee photos already do this
ad-hoc; Phase 2 standardizes it) for certificates, meeting media, employee documents, PO/vendor
attachments, and import files.

**Functionalities → sub-functionalities → elements**

- **Validated upload** (`FileStore::put(category, file)`)
  - MIME sniff + extension allow-list per category (e.g. `certificate`→pdf/jpg/png;
    `meeting_video`→mp4/mov/webm; `import`→csv/xlsx).
  - Size caps per category (config); reject with actionable error.
  - Safe naming: server-generated `uuid.ext`; original name stored separately; path
    `uploads/<module>/<yyyy>/<mm>/`.
  - Image post-processing: generate a thumbnail for photos (gallery performance).
- **Storage routing** (the key optimization decision):
  - **Local** (`uploads/`) for small files (photos, PDFs ≤ a few MB).
  - **External object store** (Cloudflare R2 / S3-compatible) for **video and large files** —
    store only the URL in `attachments`. (Decision **OQ-1**; strongly recommended because
    shared hosting disk and `upload_max_filesize` are unsuitable for video.)
- **Polymorphic linkage** via `attachments(entity_type, entity_id, category)` — any module
  attaches files without its own table.
- **Serving & access control:** downloads go through an authorized endpoint (except explicitly
  public test certificates); never expose the raw filesystem path; signed/expiring URLs for
  external store.
- **Lifecycle:** delete removes both row and blob; orphan-sweeper job reconciles.

**Process flow (attach a meeting photo)**
1. Frontend posts multipart to `/admin/meetings/{id}/media`.
2. Controller → `FileStore::put('meeting_photo', $file)` → validates, stores, returns path.
3. Insert `attachments` row (`entity_type='meeting'`, `entity_id={id}`, `category='photo'`).
4. Return attachment metadata; gallery refreshes.

**Business optimization.** Test certificates and meeting media become *assets the business can
showcase* (sales proof, event documentation) rather than files lost in WhatsApp. Centralized
validation prevents malicious uploads and storage bloat.

---

## 6. Cross-cutting service: Identity, Roles & Permissions (RBAC)

**Purpose.** Phase 2 adds non-admin actors (dealers) and internal role separation
(owner/accountant/store-keeper/HR/sales). Authorization must be explicit and least-privilege.

**Model.**
- `users.user_type` ∈ {admin, dealer, customer} (existing) — the *actor class*.
- `users.staff_role` ∈ {owner, accountant, store_keeper, hr, sales} (new, NULL for non-staff) —
  the *internal capability*.
- Router guard syntax extended: `'admin'` = any staff; `'admin:owner,accountant'` = restricted;
  `'dealer'` = dealer scope; `'auth'` = any logged-in user.

**Permission matrix (illustrative — full matrix per module).**

| Capability | owner | accountant | store_keeper | hr | sales | dealer |
|---|---|---|---|---|---|---|
| Approve PR/PO | ✓ | ✓ | – | – | – | – |
| Receive stock (GRN) | ✓ | – | ✓ | – | – | – |
| Record customer payment | ✓ | ✓ | – | – | – | – |
| Edit invoices/quotations | ✓ | ✓ | – | – | ✓ | – |
| File GST status | ✓ | ✓ | – | – | – | – |
| Manage budgets/benchmarks | ✓ | ✓ | – | – | – | – |
| Employee compliance/payroll | ✓ | – | – | ✓ | – | – |
| Manage own customers/pricing | – | – | – | – | – | ✓ (own only) |
| Data import/export | ✓ | ✓* | – | ✓* | – | – |

\* scoped to their module.

**Sub-functionalities:** role assignment screen (owner only), per-route enforcement, **data
scoping** (dealers see only `dealer_id = self`), graceful 403 with reason, audit of permission
denials.

**Business optimization.** Lets the owner delegate safely (e.g. an accountant manages cash, a
store-keeper manages stock) without exposing the whole system — a prerequisite for the business
growing beyond a single operator.

---

## 7. Cross-cutting service: Audit & Activity Trail

**Purpose.** Trustworthy "who did what, when" for every financially or operationally
significant action — reusing the existing `audit_log`.

- **What's logged:** state transitions (submit/approve/reject/issue/receive/convert/post/void/
  file), deletes, role changes, imports committed, payments, stock adjustments.
- **Record shape:** actor `user_id`, `action`, entity type+id, before→after status, timestamp,
  optional JSON diff for sensitive edits (price overrides, payment voids).
- **Surfacing:** per-document "Activity" timeline tab; global audit search (owner) with
  filters (actor, entity, date, action).
- **Immutability:** append-only; never updated/deleted by application code.

**Business optimization.** Converts disputes ("who changed this price?", "when was this paid?")
from arguments into lookups; a baseline for internal control as headcount grows.

---

## 8. Cross-cutting service: Money, Tax & Rounding (GstCalculator)

**Purpose.** One authoritative engine for line totals, discounts, GST split, and rounding —
shared by invoices (retrofit), quotations, proforma, POs, and GST compliance. Eliminates the
"two places compute tax differently" risk.

**Responsibilities.**
- **Line economics:** `line_total = round(qty × unit_price − line_discount, 2)`.
- **Document economics:** subtotal, invoice-level discount, taxable value = subtotal − discount,
  GST recomputed **proportionally** to the discounted taxable value.
- **Jurisdiction logic:** intra-state (seller state == party state) → CGST + SGST (rate/2 each);
  inter-state → IGST (full rate). Place-of-supply aware.
- **Multi-rate documents:** per-line GST rate; document tax = Σ line taxes; **no single blended
  rate shown** (lesson from Phase 1.5 — the "IGST 10.81%" bug).
- **Rounding policy:** whole-rupee round on grand total; `round_off` computed but, per business
  preference, **not printed as a line** (configurable).
- **Reverse calculation** (optional): given a tax-inclusive price, derive base + tax (useful for
  dealer/retail price lists).

**Interface (PHP):** `GstCalculator::forDocument(lines, discount, sellerState, partyState,
deliveryFee)` → `{ subtotal, taxable, cgst, sgst, igst, totalTax, grandTotal, roundOff,
perLine[] }`. Pure function, fully unit-tested with the Phase-1 invoice cases as fixtures.

**Business optimization + risk reduction.** Correct, consistent tax across every document type
is both a compliance necessity and a trust factor with B2B customers; one tested engine is far
cheaper to maintain than parallel implementations.

---

## 9. Cross-cutting service: Notifications & Alerts

**Purpose.** Turn time-based and threshold-based conditions into proactive nudges instead of
things someone must remember to check. Reuses the existing notification capability
(`AdminNotificationController`).

**Alert sources (declarative rules):**
- PR/PO pending approval; PO overdue (past expected date, not received).
- Invoice overdue (past due date, unpaid/partial); large outstanding per customer.
- Low stock (on_hand < reorder_level); negative/odd stock from reconcile.
- GST filing due-soon / overdue.
- Employee compliance expiring (insurance/license within N days).
- Budget breach (actual > budget by threshold); benchmark RAG turns red.
- Import job completed/failed.

**Delivery channels:** in-app notification center + dashboard alert tiles (must-have); email
(optional, where SMTP is available); each rule has audience by role.

**Process:** a lightweight scheduled scan (cron or on-login recompute) evaluates rules and
upserts notifications (idempotent, no spam). Each alert deep-links to the actionable screen.

**Business optimization.** This is where the ERP shifts from record-keeping to **management by
exception** — the owner sees the 5 things that need attention today instead of scrolling 12
screens.

---

## 10. Cross-cutting service: Configuration & Settings registry

**Purpose.** Make behavior tunable without code changes; centralize taxonomies so modules agree.

- **Reuses** `settings` (key/value) and `finance_config`.
- **Registry contents:** document prefixes & padding; GST due-date offsets; file size/type
  caps; reorder defaults; expiry alert windows (compliance, GST); shared **category taxonomies**
  (expense categories == budget categories); feature flags (e.g. "post stock-out on order ship",
  "allow negative stock"); company/seller state & GSTIN.
- **Admin Settings screen** groups these by domain; changes audited.

**Business optimization.** A taxonomy that is shared (not re-typed per module) is what makes
Budget-vs-Actual and expense analytics line up without reconciliation work.

---

## 11. Cross-cutting service: Import/Export spine

**Purpose.** The reusable engine behind feature #17 and every module's bulk load. (Full UX in
Module 06; the spine lives here because Phase 1 modules consume it for opening data.)

- **Pipeline:** upload → header detect → column→field **mapping** → **dry-run validation**
  (per-row, no writes) → preview (valid/invalid + downloadable error report) → **commit**
  (transactional, idempotent upsert by natural key) → result + audit.
- **Mapper contract:** each module registers a mapper declaring required/optional fields,
  per-field validators, and a natural key (e.g. vendor by `gstin` or `name`, customer by phone,
  product by code).
- **Idempotency & safety:** commits in batches of N within transactions; re-running the same
  file updates rather than duplicates; partial failure rolls back the batch and reports the row.
- **Export side:** per-module CSV/XLSX/PDF (reuse `src/lib/exporters`), server-side chunked for
  large tables; "export everything" + scheduled backup runbook.

**Business optimization.** De-risks go-live (legacy data loads cleanly), enables periodic
data exchange with accountants/auditors, and provides disaster-recovery exports.

---

## 12. Search, Pagination & Filtering conventions

Uniform across every list endpoint so the UI and indexes are predictable.

- **Pagination:** `?page` + `?limit` (default 25, max 100); response `Response::paginated`
  with `{page, limit, total, total_pages}`.
- **Search:** `?search=` does a scoped `LIKE` over a small set of natural columns (name, number,
  phone); documented per module (and noted as non-indexable for wildcard searches).
- **Filtering:** explicit params (`?status=`, `?from=&to=`, `?vendor_id=`) mapped to indexed
  columns; date ranges on `created_at`/document date.
- **Sorting:** `?sort=` + `?dir=` from an allow-list of columns (prevents SQL injection and
  guarantees an index exists for the sort).

**Builder rule:** every filter/sort column must be backed by an index (continue the Phase-1.5
discipline); add the index in the same migration as the feature.

---

## 13. Reporting & analytics architecture (snapshots vs live)

Two-speed analytics to stay fast on shared hosting:

- **Live aggregation** for small/bounded queries (single customer detail, one document's totals).
- **Snapshot tables** for portfolio dashboards that scan large tables (`customer_metrics`,
  `gst_compliance_periods`, and optionally daily finance rollups). Refreshed by an on-demand
  "recompute" endpoint and/or a scheduled job; screens read the snapshot (instant) and offer a
  "refresh" action.
- **Charting** via recharts on the frontend; endpoints return chart-ready series + aggregates,
  never raw rows for visualization.
- **Single source of truth:** revenue/cost definitions live in one place (Finance services) and
  are reused by Dashboard, Reports, Finance, and module tiles — so every screen agrees.

---

## 14. Frontend architecture & component system

- **Routing & nav:** each module = a page in `src/pages/` registered in the router and the
  sidebar, gated by role.
- **Data layer:** TanStack Query everywhere (`useQuery` lists with stable keys, `useMutation` +
  `invalidateQueries`); the Phase-1.5 cache defaults (1-min stale, 10-min gc, no refetch-on-focus)
  apply. No raw `useEffect` fetching for new pages.
- **Reusable building blocks (extend, don't reinvent):** `ScrollableX` tables with the floating
  scrollbar; shadcn `Dialog`/`Select`/`Command` combobox (the invoice line-item editor is the
  reference pattern); `StatCard`; status-badge colour maps; `exporters` for PDF/Excel; jsPDF
  document templates (invoice template is the reference).
- **New shared components to add (once, reused by many modules):**
  - `<DocumentLineEditor>` — the qty/unit/rate/GST line grid used by PR, PO, quotation, proforma,
    invoice (extract from `Invoices.tsx`).
  - `<StatusTimeline>` — document lifecycle/audit timeline.
  - `<EntityPicker>` — async combobox for vendor/customer/product (typeahead + create-new).
  - `<MoneyInput>`, `<QtyInput>`, `<DateRange>` — consistent typed inputs.
  - `<FileDropzone>` + `<MediaGallery>` — uploads and galleries.
  - `<KpiChartCard>` — recharts wrapper with empty/loading states.
- **State conventions:** loading, empty, error, and success states are mandatory on every screen
  (no silent blanks); destructive actions confirm; mutations toast.

---

## 15. Error handling, validation & API contract

- **Contract:** all responses use the existing envelope — `Response::success(data, message)`,
  `Response::error(message, httpCode)`, `Response::paginated(...)`. Frontend `apiFetch` already
  extracts `message`.
- **Validation tiers:** (1) frontend form validation for UX; (2) **authoritative server-side
  validation** (never trust the client) returning 422 with a clear message; (3) DB constraints
  (unique, FK) as the last line.
- **Domain errors:** 409 for illegal state transitions (e.g. receiving a cancelled PO), 403 for
  permission, 404 for missing, 422 for invalid input.
- **Transactions:** any multi-row write is atomic; on failure, roll back fully and return a
  single clear error (no partial documents).

---

## 16. Performance & caching architecture

- **DB:** every new filter/sort/join column indexed; composite indexes for hot (status, date)
  patterns; snapshot tables for heavy dashboards; pagination everywhere.
- **API:** keep `Access-Control-Max-Age` preflight caching; lightweight payloads; avoid N+1 by
  batching child fetches (e.g. items joined or fetched per parent set).
- **Frontend:** React Query caching + background refresh; lazy-load heavy media; code-split large
  pages if bundle grows.
- **Imports/exports:** chunked processing to respect memory/time limits on shared hosting.

---

## 17. Security architecture

- **AuthN:** JWT bearer; refresh/revoke tables exist; short-lived access tokens.
- **AuthZ:** role-based route guards + data scoping (esp. dealers); deny-by-default.
- **Input:** prepared statements only (existing `Database`); `Request::sanitize` for stored
  text; strict upload validation; output encoding in PDFs/HTML.
- **Public surface:** only whitelisted endpoints (public test certificates) with field
  whitelisting + rate limiting; no internal IDs/PII leaked.
- **Secrets:** external storage keys and SMTP creds in server env, never committed; the Phase-1
  finding about committed credentials remains a standing remediation item.
- **Transport:** HTTPS + HSTS (already configured); security headers retained.

---

## 18. Observability & health

- `/admin/health` — DB connectivity, disk-free %, pending/failed import jobs, last snapshot
  refresh times.
- Structured `error_log` on exceptions (no secrets); request id correlation where feasible.
- Lightweight metrics surfaced on an admin "System" panel: counts by document status, alert
  backlog, slow-query notes.

---

## 19. Build/test/release engineering

- **Per-batch gates:** migration runs clean on a prod copy (backup first); `php -l`;
  `tsc --noEmit`; `npm run build`; smoke happy-path + one failure path; rollback documented.
- **Test pyramid:** service-layer unit tests (tax, numbering, inventory, payments, import) →
  controller/integration tests → frontend type-check/build → manual UAT per acceptance criteria.
- **Regression pack:** money- and stock-touching flows re-verified before every deploy.
- **Release:** additive migration → upload PHP → upload built `admin/` → smoke → tag.

---

## 20. Glossary of cross-cutting elements

- **Service layer** — PHP classes owning domain logic/transactions, called by controllers.
- **Ledger** — append-only event table (`payments`, `stock_movements`) that is the source of truth.
- **Cache column** — derived value (`amount_paid`, `on_hand`) kept for speed, reconcilable to a ledger.
- **State machine** — the allowed status transitions of a document.
- **Snapshot table** — periodically computed analytics table for fast dashboards.
- **Mapper** — module-specific import definition (fields, validators, natural key).
- **Natural key** — business identifier used for idempotent upsert (GSTIN, phone, code).
- **Scoping** — restricting query results to the caller's permitted rows (e.g. dealer's own).
- **Recompute endpoint** — on-demand refresh of a snapshot/cache.

---

*This foundations module is the contract every other module builds on. Builders: implement the
service layer and these shared services in Phase 0 before module work; do not duplicate any of
these concerns inside feature controllers.*
