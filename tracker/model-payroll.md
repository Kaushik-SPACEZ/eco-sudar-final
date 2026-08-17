# Change: api/models/Payroll.php

**Type:** New file created
**Date:** 2026-04-23
**Module:** HR — Payroll

---

## What This File Is

`api/models/Payroll.php` is the data-access layer for the `payroll` table. It provides month-scoped list queries, an upsert operation that is safe to run multiple times for the same employee-month, and the format method that shapes raw DB rows into the frontend's expected structure.

---

## Methods

### `forMonth(string $month): array`

Fetches all payroll rows for a given month (`YYYY-MM`) with the employee's `name` and `designation` joined from the `employees` table. Results are ordered by `employee_key ASC`. Used by the controller's `index()`, `run()`, `process()`, and `report()` responses.

### `upsert(array $data): void`

Inserts a new payroll row or updates an existing one if the `(employee_key, month)` unique key already exists.

The `ON DUPLICATE KEY UPDATE` clause re-computes all salary component columns but intentionally does not update the `status` column. This means re-running payroll calculation for a month that has already been marked `Processed` or `Paid` will refresh the numbers without resetting the approval status back to `Draft`. This was a deliberate design choice to allow corrections without losing the approval trail.

Fields in `$data` required for upsert:
- `employeeKey`, `month`, `workingDays`, `presentDays`, `leaves`
- `baseSalary`, `earnedSalary`, `hra`, `allowances`
- `pf`, `professionalTax`, `deductions`, `netPay`

### `format(array $row): array`

Converts a raw DB row (which comes back from a JOIN with `employees`) into the camelCase shape the frontend uses:

- `employee_key` → `employeeId`
- `employee_name` → `employeeName` (from JOIN)
- `designation` → `designation` (from JOIN)
- `working_days` → `workingDays` (int)
- `present_days` → `presentDays` (float, allows 0.5 for half-days)
- `leaves` → `leaves` (int)
- `base_salary` → `baseSalary` (float)
- `earned_salary` → `earnedSalary` (float)
- `hra` → `hra` (float)
- `allowances` → `allowances` (float)
- `pf` → `pf` (float)
- `professional_tax` → `professionalTax` (float)
- `deductions` → `deductions` (float)
- `net_pay` → `netPay` (float)
- `status` → `status` (defaults to `'Draft'` if column is null)
- `processed_at` → `processedAt` (ISO 8601 string or null)
- `paid_at` → `paidAt` (ISO 8601 string or null)

---

## Salary Calculation Formula

The calculation is done in the controller, not the model. The model just stores and retrieves the computed values. The formula used:

- Earned salary = `(base_salary / working_days) * present_days`, rounded
- HRA = 10% of base salary
- Allowances = 5% of base salary
- PF (Provident Fund) = 12% of base salary
- Professional tax = fixed ₹200
- Deductions = PF + Professional tax
- Net pay = Earned salary + HRA + Allowances − Deductions

Half-days count as 0.5 present days. Sundays are excluded when counting working days.

---

## How It Is Used

`AdminPayrollController::run()` calls `Payroll::upsert()` for each active employee, then calls `Payroll::forMonth()` to return the saved slips.

`AdminPayrollController::calculate()` does NOT call `upsert()` — it computes the same numbers but only returns them as a preview without writing to the database.

`AdminPayrollController::process()` does NOT call model methods — it uses a direct UPDATE to set `status` and the relevant timestamp column. `Payroll::forMonth()` is called afterward to return the updated slips.

`AdminEmployeeController::profile()` calls `Payroll::format()` on raw query results to include the last 3 payslips in the profile response.
