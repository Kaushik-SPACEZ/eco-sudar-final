# Eco Sudar Admin — Change Tracker

Track everything being added, modified, or removed across the project.

**Format:** `[DATE] | [FILE/FOLDER] | [WHAT YOU DID] | [STATUS]`
**Status legend:** ✅ Done · 🔄 In Progress · 🕐 Planned

---

# 📅 Day 1 — 2026-04-22 (Yesterday)

**Modules touched:** Tasks & Performance
**Goal:** Polish the Tasks UI, connect to MySQL via PHP backend, add month-over-month performance history.

---

## Phase 1 — UI Polish (Tasks module)

| File | Change | Status |
|------|--------|--------|
| `src/pages/Tasks.tsx` | Added date quick-filter chips (All / Today / This Week / This Month / Overdue) | ✅ |
| `src/pages/Tasks.tsx` | Added `createdAt` display on board cards and list view (Due / Created column) | ✅ |
| `src/pages/Tasks.tsx` | Fixed `assignedBy` — uses logged-in `adminEmail` from AuthContext instead of hardcoded "Admin" | ✅ |
| `src/pages/Tasks.tsx` | Added `fmtDate()` helper for human-readable dates (e.g. "22 Apr") | ✅ |
| `src/pages/Tasks.tsx` | Broadcasts `task-overdue-update` custom event when overdue count changes | ✅ |
| `src/components/AppSidebar.tsx` | Added overdue task count badge (red pill) on Tasks sidebar link | ✅ |
| `src/components/AppSidebar.tsx` | Added `useOverdueCount` hook — fetches on mount, listens to custom event | ✅ |

## Phase 2 — Connect Tasks to Database

| File | Change | Status |
|------|--------|--------|
| `database/tasks_migration.sql` | **NEW** — SQL for `tasks` table (all fields + indexes on status, assignee, due_date) | ✅ |
| `api/controllers/admin/AdminTaskController.php` | **NEW** — GET list, POST create, PATCH update, DELETE destroy | ✅ |
| `api/index.php` | Registered AdminTaskController + 4 task routes under `admin` middleware | ✅ |
| `src/lib/api/client.ts` | Added auto-unwrap of `{ success, data }` envelope from PHP backend | ✅ |
| `src/lib/api/tasks.ts` | Updated 4 API paths: `/tasks` → `/admin/tasks` | ✅ |
| `src/contexts/AuthContext.tsx` | `login()` is now async — calls `POST /api/auth/login`, stores real JWT in localStorage | ✅ |
| `src/pages/Login.tsx` | `handleSubmit` now awaits async `login()` with proper error handling | ✅ |

## Phase 3 — Performance History (month-over-month deltas)

| File | Change | Status |
|------|--------|--------|
| `src/pages/Tasks.tsx` | Added `perfMonth` state (defaults to current YYYY-MM) | ✅ |
| `src/pages/Tasks.tsx` | Added `buildLast6Months()` helper for dropdown options | ✅ |
| `src/pages/Tasks.tsx` | Added `prevMonthOf()` helper (handles year rollback) | ✅ |
| `src/pages/Tasks.tsx` | Added `perfTasks` memo — filters tasks by selected month's `createdAt` | ✅ |
| `src/pages/Tasks.tsx` | Added `prevPerfTasks` memo — filters by previous month for delta | ✅ |
| `src/pages/Tasks.tsx` | Updated `performance` memo to use `perfTasks` instead of all tasks | ✅ |
| `src/pages/Tasks.tsx` | Added `prevPerformance` record keyed by employeeId for O(1) delta lookup | ✅ |
| `src/pages/Tasks.tsx` | Added `DeltaBadge` component — ▲ +N (green) / ▼ -N (red) | ✅ |
| `src/pages/Tasks.tsx` | Added month selector dropdown on Performance tab | ✅ |
| `src/pages/Tasks.tsx` | Added "vs Last Month" delta column in ranking table + inside top-3 cards | ✅ |
| `src/lib/api/tasks.ts` | Added `type PerformanceRow` export | ✅ |

---

# 📅 Day 2 — 2026-04-23 (Today)

**Modules touched:** Employees · Attendance · Payroll · Dashboard · Config
**Goal:** Build backend + DB for the remaining HR modules, connect the Dashboard to live statistics, centralize API URL via `.env`.

---

## Phase 4 — HR Backend (Employees, Attendance, Payroll)

### Database

| File | Change | Status |
|------|--------|--------|
| `database/hr_migration.sql` | **NEW** — `employees` (QR token, department, base salary), `attendance` (unique per employee+date, FK to employees), `payroll` (monthly, unique per employee+month, FK to employees) | ✅ |

### PHP Models

| File | Change | Status |
|------|--------|--------|
| `api/models/Employee.php` | **NEW** — `all()`, `findByKey()`, `findByQrToken()`, `create()` auto-generates `EMP-XXX` + unique QR token, `format()` → camelCase | ✅ |
| `api/models/Attendance.php` | **NEW** — `list()` with date/employee filters, `findByEmployeeAndDate()`, `format()` | ✅ |
| `api/models/Payroll.php` | **NEW** — `forMonth()`, `upsert()` using `ON DUPLICATE KEY UPDATE` (re-run safe) | ✅ |

### PHP Controllers

| File | Change | Status |
|------|--------|--------|
| `api/controllers/admin/AdminEmployeeController.php` | **NEW** — index / store / update / destroy (soft-delete preserves history) / qr | ✅ |
| `api/controllers/admin/AdminAttendanceController.php` | **NEW** — index (filters: from, to, employeeId) / scan (QR → check-in or check-out, Half-day if < 5 hours) | ✅ |
| `api/controllers/admin/AdminPayrollController.php` | **NEW** — index (fetch by month) / run (compute from attendance: HRA 10%, allowances 5%, PF 12%, prof-tax ₹200) | ✅ |
| `api/controllers/StatisticsController.php` | Added `overview()` — orders/users/products/employees/tasks counts in a single call | ✅ |
| `api/controllers/StatisticsController.php` | Added `employees()` — total, present today, by-department breakdown | ✅ |
| `api/controllers/StatisticsController.php` | Added `tasks()` — total/pending/in-progress/completed/overdue counts | ✅ |

### Router

| File | Change | Status |
|------|--------|--------|
| `api/index.php` | `require_once` 3 new models (Employee, Attendance, Payroll) | ✅ |
| `api/index.php` | `require_once` 3 new controllers (Admin Employee/Attendance/Payroll) | ✅ |
| `api/index.php` | Registered **5 employee** routes (GET list, POST, PATCH, DELETE, GET qr) | ✅ |
| `api/index.php` | Registered **2 attendance** routes (GET list, POST scan) | ✅ |
| `api/index.php` | Registered **2 payroll** routes (GET by month, POST run) | ✅ |
| `api/index.php` | Registered **3 statistics** routes (overview, employees, tasks) | ✅ |

### Frontend API Wiring

| File | Change | Status |
|------|--------|--------|
| `src/lib/api/hr.ts` | All real API paths updated: `/employees` → `/admin/employees`, `/attendance` → `/admin/attendance`, `/attendance/scan` → `/admin/attendance/scan`, `/payroll/run` → `/admin/payroll/run` | ✅ |
| `src/lib/api/hr.ts` | Cleaned up outdated "future endpoints" comment, replaced with MOCK_MODE explanation | ✅ |

---

## Phase 5 — Dashboard Connected to Real Data

| File | Change | Status |
|------|--------|--------|
| `src/lib/api/statistics.ts` | **NEW** — `statisticsApi.overview()`, `.orders()`, `.activeOrders()` with MOCK_MODE support | ✅ |
| `src/pages/Dashboard.tsx` | Replaced all hardcoded data with real API via `useState` + `useEffect` + `statisticsApi` | ✅ |
| `src/pages/Dashboard.tsx` | Stat cards now live: Total Products · Total Orders (+ pending) · Revenue · Active Users · Cancelled Orders · Active Employees (+ overdue tasks) | ✅ |
| `src/pages/Dashboard.tsx` | Charts now use real daily order data, grouped by month for display | ✅ |
| `src/pages/Dashboard.tsx` | Recent Orders table uses real active orders from `/statistics/active-orders` | ✅ |
| `src/pages/Dashboard.tsx` | Added `fmtRupees()` helper — formats values as ₹X.XL / ₹X.Xk | ✅ |

---

## Phase 7 — Full API Endpoint Coverage (spec-compliant)

**Goal:** Implement the remaining 18 endpoints from the official API spec — single-item GETs, reports, summaries, dedicated single-field PUTs, task comments.

### Database (schema additions)

| File | Change | Status |
|------|--------|--------|
| `database/hr_migration.sql` | Added `payroll.status` ENUM('Draft','Processed','Paid') + `processed_at` + `paid_at` columns | ✅ |
| `database/tasks_migration.sql` | **NEW** table — `task_comments` (comment_id, task_key FK, author, body, created_at) | ✅ |

### AdminEmployeeController — 3 new endpoints

| Method + Path | Handler | Notes |
|---------------|---------|-------|
| `GET /admin/employees/{id}` | `show()` | Single employee by key |
| `GET /admin/employees/{id}/profile` | `profile()` | Employee + 30d attendance + last 3 payslips + task counts |
| `PUT /admin/employees/{id}/status` | `updateStatus()` | Dedicated active/inactive toggle |
| `PUT /admin/employees/{id}` | `update()` (alias for PATCH) | Full-update verb |

### AdminAttendanceController — 6 new endpoints

| Method + Path | Handler | Notes |
|---------------|---------|-------|
| `GET /admin/attendance/employee/{id}` | `byEmployee()` | Employee-scoped attendance list |
| `GET /admin/attendance/report` | `report()` | Date-range report with `from`/`to` + employee joined |
| `GET /admin/attendance/summary` | `summary()` | Per-employee month totals (present/half/absent/leave/hours) |
| `POST /admin/attendance/check-in` | `checkIn()` | Explicit check-in (accepts `token` OR `employeeId`) |
| `POST /admin/attendance/check-out` | `checkOut()` | Explicit check-out with auto Half-day logic |
| `PUT /admin/attendance/{id}` | `update()` | Manual correction by `attendance_id` |

### AdminPayrollController — 5 new endpoints

| Method + Path | Handler | Notes |
|---------------|---------|-------|
| `GET /admin/payroll/{id}` | `show()` | Single slip by `payroll_id` |
| `GET /admin/payroll/{employee_id}/history` | `history()` | Full payroll history for an employee |
| `POST /admin/payroll/calculate` | `calculate()` | Preview calc WITHOUT persisting (dry-run) |
| `POST /admin/payroll/process` | `process()` | Mark month as `Processed` or `Paid` (sets timestamps) |
| `GET /admin/payroll/report` | `report()` | Month-wide summary: totals + status breakdown |

### AdminTaskController — 8 new endpoints

| Method + Path | Handler | Notes |
|---------------|---------|-------|
| `GET /admin/tasks/{id}` | `show()` | Single task + comments |
| `GET /admin/tasks/statistics` | `statistics()` | Task counts by status + overdue |
| `GET /admin/tasks/performance` | `performance()` | Server-side `PerformanceRow[]` (matches frontend shape) |
| `GET /admin/tasks/employee/{id}` | `byEmployee()` | Path-param variant of `?assignee=` |
| `PUT /admin/tasks/{id}/status` | `updateStatus()` | Status only + auto `completed_at` |
| `PUT /admin/tasks/{id}/assign` | `assign()` | Reassign to a different employee |
| `PUT /admin/tasks/{id}/priority` | `updatePriority()` | Priority only |
| `POST /admin/tasks/{id}/comment` | `addComment()` | Writes to `task_comments` table |
| `PUT /admin/tasks/{id}` | `update()` (alias for PATCH) | Full-update verb |

### StatisticsController — 3 new endpoints

| Method + Path | Handler | Notes |
|---------------|---------|-------|
| `GET /statistics/sales` | `sales()` | 30d daily + 12m monthly sales + units sold |
| `GET /statistics/revenue` | `revenue()` | Lifetime/today/week/month/year + payment mix |
| `GET /statistics/customers` | `customers()` | Total + active + new-this-month + top 10 by LTV |

### New Task Model

| File | Change | Status |
|------|--------|--------|
| `api/models/Task.php` | **NEW** — `all(filters)`, `findByKey()`, `byEmployee()`, `create()` (auto TSK-XXX), `format()`, `comments()` — matches the pattern of Employee/Attendance/Payroll models | ✅ |
| `api/controllers/admin/AdminTaskController.php` | Refactored to use Task model — removed duplicate `formatTask()` logic, removed inline SQL for `findByKey`, `byEmployee`, `create`, `comments` | ✅ |

### Router

| File | Change | Status |
|------|--------|--------|
| `api/models/Payroll.php` | Extended `format()` to include `status`, `processedAt`, `paidAt` | ✅ |
| `api/index.php` | `require_once` for Task model + registered **27 new routes** with strict static-before-dynamic ordering (router matches in registration order) | ✅ |

### Endpoint Coverage — Before vs After

| Module | Before | After | Spec target |
|--------|--------|-------|-------------|
| Employees | 3/7 | **7/7** ✅ | 7 |
| Attendance | 1/7 | **7/7** ✅ | 7 |
| Payroll | 1/6 | **6/6** ✅ | 6 |
| Statistics | 4/7 | **7/7** ✅ | 7 |
| Tasks | 4/12 | **12/12** ✅ | 12 |
| **Total** | **13/39** | **39/39** ✅ | 39 |

Plus these extras kept from the earlier implementation (not in spec but useful):
- `GET /admin/employees/{id}/qr` — QR token payload for scanning
- `POST /admin/attendance/scan` — single-endpoint auto check-in/check-out (used by QR scanner UI)
- `POST /admin/payroll/run` — calculate+persist in one call (used by existing UI)
- `PATCH` aliases preserved for every resource alongside new `PUT` verbs

---

## Phase 6 — Configuration & Housekeeping

| File | Change | Status |
|------|--------|--------|
| `eco-sudar-control/.env` | Added `VITE_API_BASE_URL="https://api.ecosudar.com/api"` — single source of truth for API URL | ✅ |
| `src/lib/api/client.ts` | Updated header comment to document BASE_URL sourcing from `.env` | ✅ |
| `database/hr_migration.sql` | Renamed from `migrations_naresh.sql` (matches `tasks_migration.sql` naming pattern) | ✅ |
| `database/hr_migration.sql` | Updated header comment: "Naresh Modules Migration" → "HR Module Migration" | ✅ |
| `tracker/NARESH_WORK.md` | **NEW** — personal module tracker with status, file list, deploy checklist | ✅ |
| `tracker/NARESH_WORK.md` | Updated file references to new migration filename | ✅ |

---

# 📊 Summary — Files Touched (Day 1 + Day 2)

**New files created:** 13
- 2 DB migrations (`tasks_migration.sql`, `hr_migration.sql`)
- 4 PHP models (`Task.php`, `Employee.php`, `Attendance.php`, `Payroll.php`)
- 4 PHP controllers (Admin Task/Employee/Attendance/Payroll)
- 1 frontend API file (`statistics.ts`)
- 2 tracker files (`CHANGES.md`, `NARESH_WORK.md`)

**DB tables created:** 4 (`tasks`, `employees`, `attendance`, `payroll`) + 1 (`task_comments`)
**API endpoints exposed:** 39 admin + statistics endpoints — 100% of the official spec

**Files modified:** 9
- `api/index.php` (routes + requires)
- `api/controllers/StatisticsController.php` (3 new methods)
- `src/lib/api/client.ts` (env URL + envelope unwrap)
- `src/lib/api/hr.ts` (real paths)
- `src/lib/api/tasks.ts` (real paths + type export)
- `src/pages/Tasks.tsx` (Phase 1 + Phase 3)
- `src/pages/Dashboard.tsx` (connected to real APIs)
- `src/pages/Login.tsx` (async handleSubmit)
- `src/contexts/AuthContext.tsx` (async login)
- `src/components/AppSidebar.tsx` (overdue badge)
- `eco-sudar-control/.env` (`VITE_API_BASE_URL`)

---

# 🚀 Before Going Live (Action Required)

- [ ] Run `database/tasks_migration.sql` on Hostinger phpMyAdmin
- [ ] Run `database/hr_migration.sql` on Hostinger phpMyAdmin (employees, attendance, payroll)
- [ ] Ensure admin user exists in DB: `admin@ecosudar.com` with `user_type = 'admin'`
- [ ] Deploy updated `api/` folder to Hostinger `public_html/api/`
- [ ] Set `MOCK_MODE = false` in `src/lib/api/client.ts`
- [ ] Build and deploy frontend: `npm run build` → upload `dist/` to `public_html/`

---

## Notes

- Frontend dev: `cd eco-sudar-control && npm install && npm run dev`
- Backend deploys to: `public_html/api` on Hostinger
- `MOCK_MODE = true` (local dev) — switch to `false` after team deploys backend
- Login fallback: if backend unreachable, `admin@ecosudar.com / admin123` works locally
- API base URL is centralized in `.env` — no hardcoded URLs anywhere in `src/`
