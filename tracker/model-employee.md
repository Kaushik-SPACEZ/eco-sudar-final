# Change: api/models/Employee.php

**Type:** New file created
**Date:** 2026-04-23
**Module:** HR — Employees

---

## What This File Is

`api/models/Employee.php` is the data-access layer for the `employees` table. It handles all reads, writes and formatting for employee records. The controller (`AdminEmployeeController.php`) never writes SQL directly — all queries go through this model.

---

## Constants Defined

`VALID_DEPARTMENTS` (private) — the six allowed department values:

- `Production`
- `Quality`
- `Sales`
- `Admin`
- `Dispatch`
- `Maintenance`

This list is used in `all()` when filtering by department, and in `AdminEmployeeController` when validating the `department` field on create and update.

---

## Methods

### `all(array $filters = []): array`

Returns all employee rows ordered by `employee_key ASC`. Supports two optional filters:

- `department` — validated against `VALID_DEPARTMENTS`; added to WHERE clause only if the value is in the allowed list
- `is_active` — cast to `int` (1 or 0); the controller passes this in after checking the `?active=1` query param

### `findByKey(string $key): ?array`

Looks up one employee by `employee_key` (e.g. `EMP-003`). Returns the raw DB row or `null`.

### `findByQrToken(string $token): ?array`

Looks up one employee by their `qr_token` value. Used by the attendance controller when a QR code is scanned — the token is decoded from the QR payload and passed here to resolve which employee is checking in.

### `create(array $data): int`

Inserts a new employee row. Two things are auto-generated:

**Employee key** — `EMP-` followed by the next sequential number, zero-padded to 3 digits. The count of existing employees is fetched first so the key is deterministic.

**QR token** — format is `ESD-{INITIALS}-{NUM}-{RAND4}`. Initials are taken from the first letter of each word in the employee's name (max 2 letters), uppercased. The 4-character random suffix comes from `bin2hex(random_bytes(3))` sliced and uppercased. Example: for `Arun Prakash`, employee #1, a token like `ESD-AP-001-7Q9X` is generated.

The email is lowercased and trimmed on insert. Returns the raw `employee_id` (auto-increment) so the controller can immediately fetch the newly created row.

### `format(array $row): array`

Converts a raw DB row into the camelCase shape the frontend uses:

- `employee_key` → `id`
- `base_salary` → `baseSalary` (cast to float)
- `joined_at` → `joinedAt`
- `qr_token` → `qrToken`
- `is_active` → `active` (cast to bool)

All other fields (`name`, `email`, `phone`, `department`, `designation`) are passed through unchanged.

---

## How It Is Used

`AdminEmployeeController` calls `Employee::all()`, `Employee::findByKey()`, `Employee::create()`, and `Employee::format()` for its CRUD operations.

`AdminAttendanceController` calls `Employee::findByQrToken()` and `Employee::findByKey()` to resolve employees during check-in and check-out.

`AdminPayrollController` calls `Employee::findByKey()` to validate the employee exists before returning payroll history.

`AdminEmployeeController::profile()` also calls `Attendance::format()` and `Payroll::format()` after fetching related rows for the profile endpoint.
