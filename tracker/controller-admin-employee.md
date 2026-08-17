# Change: api/controllers/admin/AdminEmployeeController.php

**Type:** New file created
**Date:** 2026-04-23
**Module:** HR — Employees

---

## What This File Is

`AdminEmployeeController.php` handles all employee management HTTP requests under the `/admin/employees` prefix. It exposes 9 routes covering listing, creating, updating, soft-deleting, retrieving the QR token payload, viewing a full employee profile, and toggling active status.

---

## Endpoints Handled

### GET /admin/employees
Handler: `index()`

Lists all employees. Accepts two optional query params:

- `department` — filters by department (e.g. `?department=Production`)
- `active` — filters by active status (`?active=1` for active, `?active=0` for inactive)

Delegates filtering to `Employee::all()` and maps results through `Employee::format()`.

### GET /admin/employees/{id}
Handler: `show()`

Returns a single employee by `employee_key`. Returns 404 if not found.

### POST /admin/employees
Handler: `store()`

Creates a new employee. Validates all required fields: `name`, `email`, `phone`, `department`, `designation`, `joinedAt`. Also validates that `department` is one of the six allowed values. Checks for duplicate email before inserting (returns HTTP 409 Conflict if email already exists). Calls `Employee::create()` which auto-generates both the `employee_key` and `qr_token`. Returns the full created employee with HTTP 201.

### PUT /admin/employees/{id} and PATCH /admin/employees/{id}
Handler: `update()` (both verbs route here)

Partial or full update. Accepted fields: `name`, `email`, `phone`, `department`, `designation`, `baseSalary`, `joinedAt`, `active`. Maps camelCase request fields to snake_case columns. Special handling per field:
- `email` is lowercased and trimmed
- `active` is cast to `1` or `0`
- `baseSalary` is cast to float
- `department` is validated against the allowed list

Always sets `updated_at = NOW()` alongside the changed fields.

### DELETE /admin/employees/{id}
Handler: `destroy()`

Soft-deletes by setting `is_active = 0` and `updated_at = NOW()`. Does not remove the row from the database. This preserves all related attendance and payroll history since those tables have a FK to employees and would cascade if the row were hard-deleted.

### GET /admin/employees/{id}/qr
Handler: `qr()`

Returns the employee's QR token value and a JSON-encoded payload string ready to embed in a QR code image. The payload is `{ token, employeeId }` serialised as JSON. The attendance scanner uses this token to identify the employee on scan.

### GET /admin/employees/{id}/profile
Handler: `profile()`

Returns a comprehensive view of the employee combining four data sources:

- `employee` — full employee record via `Employee::format()`
- `attendance` — last 30 days of attendance records (`date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`), formatted via `Attendance::format()`
- `payslips` — last 3 months of payroll slips (JOINed with employees for name and designation), formatted via `Payroll::format()`
- `tasks` — aggregated task counts for this employee: `total`, `completed`, `inProgress`, `pending`, `overdue`

### PUT /admin/employees/{id}/status
Handler: `updateStatus()`

Dedicated endpoint to activate or deactivate an employee. Requires an `active` boolean in the request body. Sets `is_active` to `1` or `0` and updates `updated_at`. Returns the updated employee.

---

## Route Registration Order Note

In `api/index.php`, the routes for `/admin/employees/{id}/qr` and `/admin/employees/{id}/profile` are registered BEFORE the generic `/admin/employees/{id}` route. This is required because the router matches routes in registration order — without this ordering, `qr` and `profile` would be captured by the dynamic `{id}` param and routed to `show()`.
