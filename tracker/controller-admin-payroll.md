# Change: api/controllers/admin/AdminPayrollController.php

**Type:** New file created
**Date:** 2026-04-23
**Module:** HR — Payroll

---

## What This File Is

`AdminPayrollController.php` handles all payroll-related HTTP requests under the `/admin/payroll` prefix. It exposes 7 routes: listing slips by month, running full payroll calculation with persistence, a dry-run preview (no DB write), marking a month as Processed or Paid, single-slip lookup, employee payroll history, and a monthly financial report.

---

## Endpoints Handled

### GET /admin/payroll
Handler: `index()`

Returns all payroll slips for a given month. Accepts `?month=YYYY-MM` query param (defaults to current month). Calls `Payroll::forMonth()` which JOINs with employees to include name and designation. Maps through `Payroll::format()`.

### POST /admin/payroll/run
Handler: `run()`

Calculates and saves payroll for all active employees for the given month. Steps:

1. Counts working days in the month by iterating each day and excluding Sundays
2. Fetches all active employees
3. For each employee, fetches their attendance records for the month
4. Counts present days (Present = 1.0, Half-day = 0.5), leave days
5. Computes salary components using the standard formula (HRA 10%, allowances 5%, PF 12%, professional tax ₹200)
6. Calls `Payroll::upsert()` — safe to re-run; updates numbers but preserves approval status

Returns all slips for the month after saving.

### POST /admin/payroll/calculate
Handler: `calculate()`

Dry-run version of `run()`. Performs the exact same calculation logic but does NOT call `Payroll::upsert()` — nothing is written to the database. Returns the preview slips with the message "Preview (not saved)". Useful for showing a finance officer what payroll will look like before committing it.

### POST /admin/payroll/process
Handler: `process()`

Marks all payroll slips for a given month as either `Processed` or `Paid`. Accepts `month` and `status` in the request body. Status must be `Processed` or `Paid`. Sets the corresponding timestamp column:
- `Processed` → sets `processed_at = NOW()`
- `Paid` → sets `paid_at = NOW()`

A single UPDATE affects all rows for that month. Returns the count of affected rows plus all slips in their updated state.

### GET /admin/payroll/{id}
Handler: `show()`

Returns a single payroll slip by its numeric `payroll_id`. JOINs with employees for name and designation. Returns 404 if not found.

### GET /admin/payroll/{employee_id}/history
Handler: `history()`

Returns all payroll history for a specific employee, ordered by `month DESC`. Validates the employee exists first. Useful for viewing a complete salary timeline for an employee.

### GET /admin/payroll/report
Handler: `report()`

Monthly financial summary. Accepts `?month=YYYY-MM`. Returns:

- Summary block with aggregate totals: `employees` (count), `totalEarned`, `totalHra`, `totalAllowances`, `totalPf`, `totalProfTax`, `totalDeductions`, `totalNetPay`
- `byStatus` breakdown showing how many slips are in each status (`Draft`, `Processed`, `Paid`)

---

## Salary Calculation Formula (implemented in both run() and calculate())

Working days = all days in the month except Sundays.
Present days = Present records + (0.5 × Half-day records).
Earned salary = base_salary / working_days × present_days.
HRA = base_salary × 0.10.
Allowances = base_salary × 0.05.
PF = base_salary × 0.12.
Professional tax = ₹200 (fixed).
Deductions = PF + Professional tax.
Net pay = Earned salary + HRA + Allowances − Deductions.

---

## Route Registration Order Note

In `api/index.php`, `/admin/payroll/report` is registered BEFORE `/admin/payroll/{id}/history` which is registered BEFORE `/admin/payroll/{id}`. This ordering is required because the router matches in registration order. Without it, `report` would be matched as a payroll ID, and `{id}/history` would never be reached before `{id}` captures everything.
