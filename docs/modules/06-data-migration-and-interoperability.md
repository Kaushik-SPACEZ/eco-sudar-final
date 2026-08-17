# Module 06 — Data Migration & Interoperability

**Covers feature:** #17 Existing / other software old data export and import facility
**Value chain:** Platform / data lifecycle
**Depends on:** Module 00 (import/export spine, FileStore, RBAC, audit) and every domain module's
mappers
**Status:** Deep-dive spec v1.0 (planner + builder view)

> **Business-optimizer thesis.** An ERP is only as good as the data in it. Eco Sudar has history
> in spreadsheets and possibly other software; on go-live it must load cleanly, and forever after
> the business must be able to get its data *out* — for the CA, the bank, audits, backups, and
> peace of mind (no lock-in). This module turns import/export from a risky one-off into a safe,
> repeatable, self-service capability: validated imports with dry-runs, per-module exports, and
> scheduled backups. It de-risks go-live and guarantees the business always owns its data.

---

## 0. Contents

1. Module overview & optimization thesis
2. Personas & roles
3. Functional map
4. Import architecture (recap of the spine) & module mappers
5. Sub-module A — Guided Import experience
6. Sub-module B — Per-module mappers
7. Sub-module C — Exports
8. Sub-module D — Backups & disaster recovery
9. Data architecture
10. API surface
11. UX / screen specifications
12. Business rules, validations & exceptions
13. Migration playbook (go-live sequence)
14. Automation & optimization opportunities
15. Configuration & settings
16. Integrations
17. Acceptance criteria & test scenarios
18. Rollout plan

---

## 1. Module overview & optimization thesis

Three capabilities:

- **Import:** load legacy/other-software data (vendors, customers, products, opening stock,
  expenses, employees, attendance, optionally historical invoices) safely — mapping + dry-run +
  transactional commit.
- **Export:** get any module's data out as CSV/XLSX/PDF, plus a full "download everything".
- **Backup/DR:** scheduled database backups and a documented recovery runbook.

**Optimization outcomes:** fast, low-risk go-live; no vendor lock-in; effortless data exchange
with accountants/auditors/banks; resilience against data loss.

---

## 2. Personas & roles

| Persona | Role | Does here |
|---|---|---|
| Owner | `owner` | Approves/commits imports; owns backups; full export. |
| Accountant/HR | `accountant`/`hr` | Imports/exports within their modules (scoped). |

Imports that create/overwrite master data are owner-gated; module-scoped imports allowed to the
module's role.

---

## 3. Functional map

```
Data Migration & Interoperability
├── Guided import
│   ├── Module select → upload (CSV/XLSX)
│   ├── Auto header detect → column→field mapping (with override)
│   ├── Dry-run validation (per-row, no writes)
│   ├── Preview (valid/invalid + error report)
│   └── Commit (transactional, idempotent) → result
├── Per-module mappers
│   ├── Required/optional fields + validators
│   ├── Natural key (idempotent upsert)
│   └── Cross-references (e.g. product code → product_id)
├── Exports
│   ├── Per-module CSV/XLSX/PDF
│   ├── Filtered exports (date/status)
│   └── Full export ("download everything")
└── Backups & DR
    ├── Scheduled DB backup (cron/manual mysqldump)
    ├── Retention & off-site copy
    └── Recovery runbook
```

---

## 4. Import architecture (recap) & module mappers

The reusable spine (built in Module 00 §11) handles the pipeline; this module adds the **UI** and
the **per-module mappers**. Pipeline: upload → detect → map → **dry-run** → preview → **commit**
(idempotent upsert by natural key, transactional batches) → audit + downloadable error report.

**Mapper contract (per module):**
- Field schema (name, required?, type, validator).
- Natural key for upsert (e.g. vendor by GSTIN/name, customer by phone, product by code,
  employee by employee_key).
- Cross-reference resolvers (e.g. resolve product code → `product_id`; unknown → row error).
- Post-commit hooks (e.g. opening stock → create `stock_movements(opening)`).

---

## 5. Sub-module A — Guided Import experience

**Purpose.** Make importing safe and self-service, even for non-technical staff.

**Functionalities & elements**
- **Step 1 — Module & file:** pick target module; upload CSV/XLSX; download a **template** with
  the expected columns and a sample row.
- **Step 2 — Mapping:** auto-match headers to fields; user overrides via dropdowns; remembers
  the last mapping per module (`mapping_json`).
- **Step 3 — Dry-run:** validate every row without writing; show counts (valid/invalid) and a
  per-row error table; downloadable error report (original row + reason).
- **Step 4 — Commit:** transactional, idempotent upsert; progress; result summary
  (created/updated/skipped); audit entry.
- **Resumability & safety:** large files chunked; a failed batch rolls back and is reported; re-
  running the same file updates rather than duplicates (natural-key upsert).

**Business optimization.** Turns the scariest part of ERP adoption (data migration) into a
controlled, repeatable, low-stress process — and the same tool serves ongoing bulk updates
(e.g. annual price refresh, bulk employee changes).

---

## 6. Sub-module B — Per-module mappers

Mappers shipped (in dependency order so references resolve):

| Module | Natural key | Notes |
|---|---|---|
| Vendors | GSTIN or name | Module 01 master |
| Customers (users) | phone (or GSTIN) | dedupe-aware (Module 03) |
| Products | product code | catalog master |
| Opening stock | product code (+ location) | posts `stock_movements(opening)` at given cost |
| Expenses | expense code or (date+vendor+amount) | finance history |
| Employees | employee_key | HR master |
| Attendance punches | employee_key + timestamp | TMS (Module 05) |
| Historical invoices (optional) | invoice number | for reporting continuity; no GST re-posting |

Each mapper validates types, formats (dates ISO, money numeric, GSTIN pattern), and references;
unknown references become row errors with guidance.

**Business optimization.** Standardized mappers mean every module is importable the same way; new
modules add a mapper, not a new tool.

---

## 7. Sub-module C — Exports

**Purpose.** Get data out, anytime, in the format the recipient needs.

**Functionalities & elements**
- **Per-module export:** any list endpoint → CSV/XLSX/PDF (reuse `src/lib/exporters`), respecting
  current filters (date/status/search).
- **Server-side streaming:** large tables chunked to respect shared-hosting memory/time limits.
- **Full export ("download everything"):** a bundle of all modules (zip of CSVs) for backup or
  migration off-platform — no lock-in.
- **Scheduled/standard exports:** e.g. monthly GST line list (Module 02), monthly P&L, payroll —
  pre-built for routine handoffs to the CA.

**Business optimization.** Eliminates the "can you send me the data in X format?" scramble;
guarantees the business can always leave with its data (trust + compliance).

---

## 8. Sub-module D — Backups & disaster recovery

**Purpose.** Protect against data loss — the existential risk for a single live database on
shared hosting.

**Functionalities & elements**
- **Scheduled DB backup:** automated `mysqldump` (cron where available) or a documented manual
  routine; compressed; timestamped.
- **Retention & off-site:** keep N daily/weekly copies; copy at least weekly to **off-site**
  storage (external object store / owner's drive) — never rely solely on the host.
- **Pre-change backups:** every production migration is preceded by a backup (already the release
  rule — formalized here).
- **Recovery runbook:** step-by-step restore (import dump into a fresh DB, point app, verify) with
  an RTO/RPO statement and a periodic **restore drill** (a backup you've never restored is not a
  backup).
- **Health surfacing:** `/admin/health` shows last backup time; alert if stale.

**Business optimization.** Converts an unmanaged existential risk into a routine with a tested
recovery path — cheap insurance for the whole ERP investment.

---

## 9. Data architecture

**Tables:** `import_jobs`, `import_job_rows` (Module 00 §5.3). Imports write into each module's
own tables via mappers. Exports are read-only. Backups are operational artifacts (files), not DB
tables. Every commit/backup writes an `audit_log` entry.

**Invariants**
- Imports are idempotent (re-run = update, not duplicate) and transactional per batch.
- Exports never mutate; full export is consistent (point-in-time per table).

---

## 10. API surface

```
# Import
GET  /admin/import/modules                 supported modules + templates
GET  /admin/import/{module}/template        download template (CSV)
POST /admin/import/{module}/upload          upload file → job (validating)
POST /admin/import/{module}/{job}/map       set column mapping
POST /admin/import/{module}/{job}/dry-run   validate (no writes)
GET  /admin/import/{job}                     status + counts
GET  /admin/import/{job}/errors             error report (download)
POST /admin/import/{module}/{job}/commit     transactional commit
# Export
GET  /admin/export/{module}?format&filters   per-module export (stream)
GET  /admin/export/all                        full bundle (zip)
# Backup (ops)
POST /admin/backup/run                         (owner) trigger backup
GET  /admin/backup/status                      last backup time, size, location
```
Owner-gated for master imports, full export, and backups; module-scoped imports/exports for the
module's role.

---

## 11. UX / screen specifications

- **Data Import (`DataImport.tsx`):** wizard — module picker (with template download) → upload →
  mapping grid (auto-matched, overridable) → dry-run preview (valid/invalid counts + error table
  + download) → commit → result summary. Job history list with statuses.
- **Exports:** an "Export" action on every module list (format menu) + a dedicated "Export
  everything" panel for the owner.
- **Backups (`Settings.tsx` → Data/System tab):** last backup time, size, location; "Run backup
  now"; retention config; restore runbook link.
- **States:** long-running jobs show progress; failures show actionable errors; destructive/
  overwrite imports confirm with a clear summary of what will change.

---

## 12. Business rules, validations & exceptions

- Dry-run never writes; commit is transactional per batch; partial failure rolls back the batch
  and is reported (no half-imported documents).
- Idempotent upsert by natural key; re-import updates, never duplicates.
- Reference resolution failures (unknown product/employee) → row errors, not silent nulls.
- Encoding normalized to UTF-8; dates to ISO; money to numeric; GSTIN/phone validated.
- Imports and full exports audited (who, when, counts).
- Backups precede every production migration; restore drills scheduled.

---

## 13. Migration playbook (go-live sequence)

Recommended order so references resolve and modules light up cleanly:

1. **Masters:** products → vendors → customers (dedupe-aware) → employees.
2. **Opening balances:** opening stock (posts opening movements) → outstanding invoices/receivables
   (optional historical invoices) → vendor balances.
3. **History (optional):** historical expenses, past invoices for reporting continuity.
4. **Switches:** enable `post_stock_out_on_ship` only after opening stock is loaded.
5. **Verify:** run each module's list + a reconciliation (stock, AR) against source totals.
6. **Backup:** take a clean post-migration backup as the new baseline.

Each step uses dry-run first; commit only after the preview is clean.

---

## 14. Automation & optimization opportunities

1. **Template-driven onboarding:** downloadable templates per module slash mapping effort.
2. **Mapping memory:** remembered mappings make recurring bulk updates one-click.
3. **Scheduled CA exports:** auto-generate the monthly GST list / P&L / payroll bundle.
4. **Backup monitoring:** alert if a scheduled backup is missed or stale.
5. **Reconciliation reports:** post-import "source vs imported totals" to catch silent gaps.
6. **Bulk update reuse:** the same import path serves annual price refreshes and mass edits.

---

## 15. Configuration & settings

- Supported modules & their mappers; batch size; encoding; date/number formats.
- Backup schedule, retention, off-site target; restore-drill cadence.
- Role permissions for import/export/backup.

---

## 16. Integrations

- **Every module:** provides a mapper (import) and a list endpoint (export).
- **FileStore (Module 00):** import files and export bundles.
- **Inventory (Module 01):** opening-stock import posts movements.
- **Customers (Module 03):** customer import is dedupe-aware.
- **Notifications/health (Module 00):** import results, backup staleness alerts.

---

## 17. Acceptance criteria & test scenarios

**Acceptance**
- A 1,000-row customer CSV dry-runs with per-row errors, then commits with zero partial state on
  failure; re-import updates (no duplicates).
- Opening-stock import posts correct `stock_movements(opening)` and on-hand/valuation.
- Per-module export reproduces the on-screen data; full export bundles all modules.
- Backup runs, is listed with timestamp/size, and a restore drill recreates the data on a staging
  DB.

**Test scenarios**
- Encoding/locale (₹, DD/MM vs ISO dates) normalized correctly.
- Unknown reference (bad product code) → row error; valid rows still handled per all-or-nothing
  policy.
- Large export streams without memory exhaustion.
- Interrupted commit leaves no partial batch (transactional).

---

## 18. Rollout plan

| Step | Ship (Batch) | Why |
|---|---|---|
| 0 | Import spine (Module 00, Batch 0.3) | Built early so masters load as modules go live |
| 1 | Per-module mappers + Import UI (6.1) | Full guided experience once modules exist |
| 2 | Exports + backups/DR (6.2) | Data-out + resilience |

The **spine ships in Phase 0**; the **UI and full mapper set complete in Phase 6** once all
target modules exist. Backups, however, should be operational from day one of Phase 2 (protect
the live system immediately).

---

*Data Migration & Interoperability guarantees the business owns and controls its data: safe,
repeatable imports for go-live and bulk updates; exports for every stakeholder; and tested
backups so a single shared-hosting database is never a single point of failure.*
