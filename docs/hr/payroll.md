# Payroll Module

**UI file:** [`eco-sudar-control/src/pages/Payroll.tsx`](../../eco-sudar-control/src/pages/Payroll.tsx)
**API module:** [`eco-sudar-control/src/lib/api/hr.ts`](../../eco-sudar-control/src/lib/api/hr.ts) — `payrollApi`, `workingDaysInMonth`
**Backend:** [`api/controllers/admin/AdminPayrollController.php`](../../api/controllers/admin/AdminPayrollController.php)
**Model:** [`api/models/Payroll.php`](../../api/models/Payroll.php)
**DB table:** `payroll`

---

## Scope

Auto-computes monthly salary for all active employees from their attendance records. Supports preview (no DB write), full run (upsert-safe), and mark-as-Processed/Paid. Admin can override the working-day count for months with public holidays. Payslips are downloadable as individual PDFs or a bulk register PDF/Excel.

---

## Salary Calculation Formula

```
Working days    = non-Sunday calendar days in the month (or admin override)

Per-day rate    = base_salary / working_days
Earned basic    = per_day_rate × days_worked
HRA             = (base_salary × 0.10 / working_days) × days_worked
Allowances      = (base_salary × 0.05 / working_days) × days_worked

PF              = earned_basic × 0.12
Professional tax= ₹200 (flat)
Total deductions= PF + professional_tax

Net pay         = earned_basic + HRA + allowances − deductions  (floor 0)
```

### Attendance → days_worked

| Daily hours | Contribution |
|---|---|
| ≥ 8 hours | 1.0 day |
| ≥ 4 hours | 0.5 day (Half-day) |
| < 4 hours | 0.0 day (Absent) |
| Status = `Leave` | 0.0 day (counted separately as `leaves`) |

Multiple attendance rows for the same date are summed before applying the threshold.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `POST /admin/payroll/run`
Compute and **persist** payroll for all active employees for a given month. Safe to re-run — uses `INSERT … ON DUPLICATE KEY UPDATE`.

**Body:**
```json
{ "month": "2026-04", "workingDays": 26 }
```

- `workingDays` is optional. If omitted, auto-calculated (non-Sunday days in the month, minimum 1).
- Fetches all active employees + their attendance in **2 queries** (bulk load, no N+1).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "employeeId":      "EMP-001",
      "employeeName":    "Arun Prakash",
      "designation":     "Shift Supervisor",
      "month":           "2026-04",
      "workingDays":     26,
      "presentDays":     22.5,
      "leaves":          1,
      "baseSalary":      32000.00,
      "earnedSalary":    27692.31,
      "hra":             2769.23,
      "allowances":      1384.62,
      "pf":              3323.08,
      "professionalTax": 200.00,
      "deductions":      3523.08,
      "netPay":          28323.08,
      "status":          "Draft",
      "processedAt":     null,
      "paidAt":          null
    }
  ],
  "message": "Payroll computed"
}
```

---

### `POST /admin/payroll/calculate`
**Preview only** — computes slips without writing to DB. Returns the same shape as `/run` but data is not persisted.

**Body:** `{ "month": "2026-04" }` (no `workingDays` override — always auto-calculated for preview).

**Response `200`:** Array of slip objects, `message: "Preview (not saved)"`.

---

### `GET /admin/payroll`
Fetch persisted payroll for a month.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `month` | `YYYY-MM` | Default: current month |
| `search` | string | Partial match on employee name |
| `employeeId` | string | Exact match on `employee_key` |

**Response `200`:** Array of persisted payslip objects (same shape as `/run`).

---

### `GET /admin/payroll/report`
Month-level aggregate totals.

**Query param:** `?month=YYYY-MM`

**Response `200`:**
```json
{
  "data": {
    "month": "2026-04",
    "summary": {
      "employees": 5,
      "totalEarned": 138461.55,
      "totalHra": 13846.15,
      "totalAllowances": 6923.08,
      "totalPf": 16615.39,
      "totalProfTax": 1000.00,
      "totalDeductions": 17615.39,
      "totalNetPay": 141615.39
    },
    "byStatus": [
      { "status": "Draft", "count": 5 }
    ]
  }
}
```

---

### `GET /admin/payroll/{id}`
Single payslip by numeric `payroll_id`.

**Response `200`:** Single payslip object.

**Errors:** `404` — slip not found.

---

### `GET /admin/payroll/{employee_id}/history`
Full payroll history for one employee, ordered newest first.

**Response `200`:** Array of payslip objects.

---

### `POST /admin/payroll/process`
Mark all slips in a month as `Processed` or `Paid` and stamp the timestamp column.

**Body:**
```json
{ "month": "2026-04", "status": "Paid" }
```

**Valid status values:** `Processed` · `Paid`

| Status | Column stamped |
|---|---|
| `Processed` | `processed_at = NOW()` |
| `Paid` | `paid_at = NOW()` |

**Response `200`:**
```json
{
  "data": {
    "month": "2026-04",
    "status": "Paid",
    "affected": 5,
    "slips": [ …updated slip objects ]
  }
}
```

---

## Data Model

### `payroll` table

| Column | Type | Notes |
|---|---|---|
| `payroll_id` | int | PK, auto-increment |
| `employee_key` | varchar | FK → `employees.employee_key` |
| `month` | date | Stored as `YYYY-MM-01`; queried with `DATE_FORMAT(month, '%Y-%m')` |
| `working_days` | int | Days in month used for proration |
| `present_days` | decimal | Fractional (e.g. `22.5`) |
| `leaves` | int | Count of Leave-status days |
| `base_salary` | decimal | Snapshot of employee's base at run time |
| `earned_salary` | decimal | Prorated basic |
| `hra` | decimal | 10% of base, prorated |
| `allowances` | decimal | 5% of base, prorated |
| `pf` | decimal | 12% of `earned_salary` |
| `professional_tax` | decimal | ₹200 flat |
| `deductions` | decimal | `pf + professional_tax` |
| `net_pay` | decimal | Take-home (floor 0) |
| `status` | enum | `Draft / Processed / Paid` |
| `processed_at` | datetime | Set by `/process` with `status=Processed` |
| `paid_at` | datetime | Set by `/process` with `status=Paid` |
| `generated_at` | datetime | Set/updated on each `/run` |

Unique key on `(employee_key, month)` — enables safe re-run via `ON DUPLICATE KEY UPDATE`.

---

## Frontend API (`hr.ts` — `payrollApi`)

| Method | Real backend call | Mock behaviour |
|---|---|---|
| `run(month, workingDaysOverride?)` | `POST /admin/payroll/run` → `.data` | Computes in-memory from `MOCK_ATTENDANCE` using same formula |

**Mock formula** is identical to the backend: hours-based day fractions, prorated components, PF on earned basic, ₹200 PT.

---

## UI Features

| Feature | Detail |
|---|---|
| Month picker | `<input type="month">` — changing auto-recalculates working days |
| Working Days override | Editable number input (1–31); changing triggers `Re-run` when clicked |
| Session persistence | `month` + `workingDays` stored in `sessionStorage` under key `payroll_state` — survives tab navigation |
| Re-run button | Calls `payrollApi.run(month, workingDays)` and refreshes table |
| Stat cards | Employees count, Working Days, Gross Payable (basic + HRA + allow.), Net Payout |
| Excel export | `exportToExcel()` — all slip columns |
| Register PDF | `exportToPdf()` — formatted payroll register |
| Individual payslip | jsPDF + jspdf-autotable — earnings table, deductions table, net pay footer |
| View dialog | Modal showing full slip breakdown with download button |

---

## Working Days Helper (`hr.ts`)

```typescript
workingDaysInMonth(month: string): number
```

Counts non-Sunday days for a `YYYY-MM` string. Returns minimum 1 (guard against invalid input). Used to pre-fill the working-days input on month change. Identical logic exists in `AdminPayrollController::countWorkingDays()`.

---

## Error Codes

| Code | Meaning |
|---|---|
| `401` | Missing or invalid admin token |
| `404` | Payroll slip not found |
| `422` | Missing or invalid `month` (must match `YYYY-MM`) |
| `422` | `status` not `Processed` or `Paid` in `/process` |
