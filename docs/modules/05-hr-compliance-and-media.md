# Module 05 — HR, Compliance & Media

**Covers features:** #9 Compliance — employee insurance · #16 Attendance data · #18 Employees
data / TMS uploading facility · #19 Meeting events photos & videos
**Value chain:** Human capital & statutory compliance + event documentation
**Depends on:** Module 00 (FileStore, RBAC, audit, import spine, notifications), existing HR
tables
**Status:** Deep-dive spec v1.0 (planner + builder view)

> **Business-optimizer thesis.** Eco Sudar already has employees, attendance, and payroll, but
> the *risk* and *insight* around its people are unmanaged: insurance/statutory documents expire
> silently (a real liability for a manufacturing/industrial workforce), attendance is captured
> but not analysed, biometric/TMS device logs aren't ingested, and event documentation is
> scattered. This module hardens HR compliance (expiry alerts), turns attendance into workforce
> insight, automates data entry via bulk/TMS upload, and centralizes meeting media — reducing
> legal risk and administrative load.

---

## 0. Contents

1. Module overview & optimization thesis
2. Personas & roles
3. Functional map
4. Sub-module A — Employee Compliance & Insurance (#9)
5. Sub-module B — Attendance Analytics (#16)
6. Sub-module C — Employee & TMS Data Upload (#18)
7. Sub-module D — Meeting Events Media (#19)
8. Data architecture
9. API surface
10. UX / screen specifications
11. Business rules, validations & exceptions
12. KPIs, dashboards & reports
13. Automation & optimization opportunities
14. Configuration & settings
15. Integrations
16. Acceptance criteria & test scenarios
17. Rollout plan
18. Open question — meaning of "TMS"

---

## 1. Module overview & optimization thesis

Four capabilities over the existing HR core (`employees`, `attendance`, `attendance_shifts`,
`payroll`, `meetings`):

- **Compliance (#9):** track each employee's insurance and statutory items with expiry alerts —
  manage legal/operational risk proactively.
- **Attendance analytics (#16):** present/absent/late/overtime trends, department comparison,
  monthly heatmap — workforce insight and payroll accuracy.
- **Bulk & TMS upload (#18):** import employee master and biometric/TMS punch logs via the data
  spine — eliminate manual attendance entry.
- **Meeting media (#19):** attach and showcase event photos/videos — documentation and culture.

**Optimization outcomes:** zero silently-expired insurance/licenses, attendance-driven payroll
accuracy, near-zero manual attendance entry (device import), and organized, shareable event
records.

---

## 2. Personas & roles

| Persona | Role | Does here |
|---|---|---|
| HR | `hr` | Manages compliance, imports employees/attendance, runs analytics. |
| Owner | `owner` | Oversight, approvals, sees risk/insight dashboards. |
| Supervisor (optional) | `hr`/`owner` | Reviews attendance, uploads meeting media. |

PII guard: compliance documents and personal data are restricted to `hr`/`owner` roles only.

---

## 3. Functional map

```
HR, Compliance & Media
├── Employee compliance
│   ├── Records per employee (insurance/ESI/PF/license/medical)
│   ├── Provider, policy no, coverage, premium, start/expiry, document
│   ├── Status engine (active/expiring/expired) + alerts
│   └── Compliance portfolio (by type/status/expiry)
├── Attendance analytics
│   ├── Present/absent/late/overtime trends
│   ├── Per-employee & per-department summaries
│   ├── Monthly calendar heatmap
│   └── Payroll-ready summaries
├── Employee & TMS upload
│   ├── Bulk employee master import
│   ├── TMS/biometric punch import → attendance
│   ├── Punch pairing (in/out) + late/overtime derivation
│   └── Idempotent, mapping-driven
└── Meeting media
    ├── Photo/video attach to meetings
    ├── Gallery + player + download
    ├── Thumbnails; external storage for video
    └── Delete & lifecycle
```

---

## 4. Sub-module A — Employee Compliance & Insurance (#9)

**Purpose.** Track statutory and insurance obligations per employee and never let them lapse
unnoticed.

**Functionalities & elements**
- **Records** (`employee_compliance`): type (insurance/ESI/PF/license/medical), provider, policy
  number, coverage amount, premium, start date, **expiry date**, document upload (FileStore),
  notes.
- **Status engine:** derived from `expiry_date` — `active`, `expiring` (within N days, config),
  `expired`. Auto-updated by the scheduled scan.
- **Portfolio view:** filter by type/status/expiry; "expiring in 30 days" worklist.
- **Alerts:** notify HR/owner of upcoming and lapsed items (and optionally the employee).
- **Document store:** policy PDFs restricted to HR/owner; downloadable.
- **Coverage summary:** total insured value, premium outflow (feeds expenses/budget).

**Business optimization.** For an industrial workforce, lapsed insurance is a serious liability;
proactive expiry alerts convert a latent risk into a routine renewal task — protecting the
business and the employees, and feeding premium costs into finance.

---

## 5. Sub-module B — Attendance Analytics (#16)

**Purpose.** Turn raw attendance into workforce insight and accurate payroll inputs.

**Functionalities & elements**
- **Summaries:** present/absent/half-day/leave counts; late arrivals (vs shift start); overtime
  hours; per-employee and per-department roll-ups; configurable window.
- **Trends:** daily/weekly/monthly attendance %, late trend, overtime trend.
- **Heatmap:** monthly calendar per employee (present/absent/late colour grid).
- **Anomalies:** chronic late, excessive overtime, frequent absence flags.
- **Payroll bridge:** attendance summaries feed the existing `payroll` (days present, OT) so
  payroll is attendance-accurate.
- **Source:** existing `attendance` + `attendance_shifts` (shift-aware late/OT).

**Business optimization.** Reveals attendance patterns that affect productivity and cost
(overtime, absenteeism), and makes payroll defensible by basing it on analysed attendance rather
than manual tallies.

---

## 6. Sub-module C — Employee & TMS Data Upload (#18)

**Purpose.** Remove manual data entry by bulk-importing employee master data and biometric/TMS
attendance device logs via the import spine (Module 00 §11).

**Functionalities & elements**
- **Employee master import:** CSV/XLSX → upsert by `employee_key` (create/update); mapping-driven;
  dry-run validation; idempotent.
- **TMS/biometric punch import:** device export (typically `employee_id, timestamp, in/out`) →
  map → pair in/out per day → derive hours, late (vs shift), overtime → upsert `attendance`
  rows; idempotent by (employee, date) or (employee, timestamp).
- **Mapping flexibility:** configurable column mapping to support different device export formats
  (see Open Question §18).
- **Validation & preview:** per-row errors (unknown employee, bad timestamp, duplicate punch);
  commit transactional in batches.
- **Reconciliation:** report unmatched employees and unpaired punches for correction.

**Business optimization.** Eliminates the daily/monthly manual attendance keying that is
error-prone and time-consuming; a biometric device + import = attendance that's both accurate
and effortless, feeding directly into analytics and payroll.

---

## 7. Sub-module D — Meeting Events Media (#19)

**Purpose.** Centralize photos and videos from meetings/events with a gallery and proper
large-file handling.

**Functionalities & elements**
- **Attach media** to a meeting (`attachments`, entity `meeting`, category `photo`/`video`):
  drag-drop upload; multiple files.
- **Storage routing (key decision, OQ-1):** photos local with **thumbnails**; **videos to
  external object storage** (URL stored) — shared hosting is unsuitable for video.
- **Gallery:** thumbnail grid (lazy-loaded), lightbox for photos, inline/linked player for video,
  download, delete.
- **Metadata:** uploaded-by, date, caption (optional); ties to the meeting's date/attendees.
- **Lifecycle:** delete removes blob + row; orphan sweeper reconciles.

**Business optimization.** Event documentation becomes an organized, retrievable asset (for
records, marketing, culture) instead of files scattered across personal phones/WhatsApp; proper
storage routing keeps the shared-hosting site fast and within limits.

---

## 8. Data architecture

**Tables:** `employee_compliance` (DDL in master plan §11), `attachments` (Module 00) for media,
`import_jobs`/`import_job_rows` (Module 00) for uploads. Analytics read existing `attendance`,
`attendance_shifts`, `payroll`, `employees`, `meetings`.

**Invariants**
- Compliance status derived from `expiry_date` (deterministic from the alert window).
- Imported attendance is idempotent (re-import doesn't duplicate).
- Media files reconcilable to `attachments` rows.

**State machine (compliance)**
```
active → expiring (≤ N days to expiry) → expired (past expiry)
        └────────── renewed (new record) ─────────┘
```

---

## 9. API surface

```
# Compliance
GET    /admin/employees/{key}/compliance        list for an employee
POST   /admin/employees/{key}/compliance        add (+ document)
PUT    /admin/compliance/{id}
DELETE /admin/compliance/{id}
GET    /admin/compliance                         portfolio (type/status/expiry)
GET    /admin/compliance/expiring?days=30        worklist

# Attendance analytics
GET    /admin/attendance/analytics?from&to&dept  summaries/trends/heatmap
GET    /admin/attendance/anomalies               late/OT/absence flags

# Uploads (via import spine)
POST   /admin/employees/import                    bulk master (dry-run/commit)
POST   /admin/attendance/import                   TMS/biometric punches
GET    /admin/attendance/import/{job}/errors      error report

# Meeting media
GET    /admin/meetings/{id}/media                 list
POST   /admin/meetings/{id}/media                 upload (photo/video)
DELETE /admin/meetings/{id}/media/{attachmentId}
```
HR/owner-guarded; media upload may also allow supervisors per config.

---

## 10. UX / screen specifications

- **Employees (`Employees.tsx`) — Compliance tab:** records list with type/expiry/status chips,
  add dialog (+ document upload), expiry countdown; HR dashboard "Compliance expiring" widget.
- **Attendance (`Attendance.tsx`) — Analytics tab:** present/absent/late/OT trend charts,
  department comparison bar, monthly calendar heatmap per employee, anomaly list; **Import**
  dialog (upload → map → preview → commit) for punches; date range + department filter.
- **Employees — Import:** bulk upload button → mapping → dry-run preview → commit summary.
- **Meetings (`Meetings.tsx`) — Media gallery:** thumbnail grid, lightbox/player, upload dropzone,
  delete; lazy-loaded thumbnails; video routed to external storage.
- **States:** PII screens role-gated; uploads show progress; oversize video rejected/redirected
  with guidance.

---

## 11. Business rules, validations & exceptions

- Compliance: valid file type/size; expiry required for status; documents HR/owner-only;
  status auto-derived.
- Attendance import: unknown employee_key → row error; duplicate punch idempotent; pairing
  handles missing out-punch (flag as incomplete); shift-aware late/OT.
- Media: type/size caps; video to external store or reject; delete removes blob+row.
- All imports transactional per batch with downloadable error report.

---

## 12. KPIs, dashboards & reports

| KPI | Definition | Decision |
|---|---|---|
| Compliance expiring/expired | counts by type within window | Renewal action / risk |
| Attendance % | present ÷ scheduled | Workforce availability |
| Late rate | late ÷ present | Punctuality / shift issues |
| Overtime hours | Σ OT | Cost / capacity planning |
| Absenteeism | absent ÷ scheduled (by dept) | Staffing decisions |
| Insurance coverage | Σ coverage / premium | Risk & cost |

Reports: Compliance register & expiry, Attendance summary (per employee/department/month),
Overtime report, Import audit.

---

## 13. Automation & optimization opportunities

1. **Expiry autopilot:** scheduled scan flips status and alerts HR/owner weeks ahead — renewals
   never lapse.
2. **Device-to-payroll pipeline:** biometric punches → analysed attendance → payroll inputs,
   with minimal human touch.
3. **Anomaly nudges:** chronic late/absent/OT flagged for supervisor action.
4. **Premium-to-finance:** insurance premiums auto-feed expense/budget categories.
5. **Self-service media:** event photos/videos uploaded once, reusable for marketing/records.
6. **Onboarding checklist (fast-follow):** new employee → required compliance items auto-created
   as pending.

---

## 14. Configuration & settings

- Compliance types list; expiry alert window N days; document size/type caps.
- Attendance: shift definitions (existing), late grace minutes, OT rules, working-days calendar.
- TMS import column mapping templates per device; pairing rules.
- Media size/type caps; external storage routing threshold.

---

## 15. Integrations

- **Payroll (existing):** attendance analytics → payroll days/OT.
- **Finance (Module 04):** insurance premiums → expenses/budget.
- **Import spine (Module 06/00):** employee + attendance uploads.
- **Files (Module 00):** compliance documents and meeting media via FileStore/attachments.
- **Notifications (Module 00):** expiry alerts, anomaly flags, import results.

---

## 16. Acceptance criteria & test scenarios

**Acceptance**
- Add insurance with expiry next week → status `expiring`, appears in worklist + alert; past
  expiry → `expired`; document downloadable (HR/owner only).
- Punch CSV imports into attendance with correct in/out pairing and late flag vs shift; re-import
  doesn't duplicate.
- Employee bulk upload creates/updates by `employee_key`.
- Upload 5 photos + 1 video to a meeting; gallery renders thumbnails and plays/links video;
  oversize video handled per policy; delete removes file+row.

**Test scenarios**
- Missing out-punch flagged incomplete, not silently zero-houred.
- Unknown employee in punch file → row error, batch still commits valid rows (or all-or-nothing
  per config).
- Compliance document access denied to non-HR roles (403).
- Video over local limit routed to external store (or rejected with guidance).

---

## 17. Rollout plan

| Step | Ship (Batch) | Why |
|---|---|---|
| 1 | Employee compliance (5.1) | Risk reduction; standalone; high value |
| 2 | Attendance analytics + TMS/employee import (5.2) | Needs import spine; feeds payroll |
| 3 | Meeting media (5.3) | Needs FileStore + external storage decision (OQ-1) |

---

## 18. Open question — meaning of "TMS"

"TMS uploading facility" (#18) is **assumed** to mean **Time Management System** — i.e.
biometric/attendance device punch logs imported into `attendance`. Before Batch 5.2, **confirm**:
(a) the exact meaning of TMS, (b) the device/export file format and columns, and (c) whether it
also includes any HR document set. The import mapper is built to be format-configurable to absorb
variations, but the canonical format must be confirmed to finalize pairing rules. (Tracked as
OQ-4 in the master plan.)

---

*HR, Compliance & Media reduces people-risk and people-admin: alert before things expire,
analyse attendance instead of tallying it, import device data instead of typing it, and keep
event media organized — all on the shared file/import/alert services from Module 00.*
