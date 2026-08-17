# Change: api/models/Attendance.php

**Type:** New file created
**Date:** 2026-04-23
**Module:** HR — Attendance

---

## What This File Is

`api/models/Attendance.php` is the data-access layer for the `attendance` table. It provides filtered list queries, a single-record lookup by employee-and-date, and the standard `format()` method that converts raw DB rows to the camelCase shape the frontend expects.

---

## Methods

### `list(array $filters = []): array`

Fetches attendance records ordered by `date DESC, check_in DESC`. Three optional filters are supported:

- `employee_key` — narrows results to a specific employee
- `from` — lower bound on the `date` column (`>=`)
- `to` — upper bound on the `date` column (`<=`)

All three can be combined. The query builds the WHERE clause dynamically using the same `1=1` + array-push pattern used in the other models.

### `findByEmployeeAndDate(string $employeeKey, string $date): ?array`

Returns the single attendance row for a given employee on a given date (`YYYY-MM-DD`). Returns `null` if no record exists for that day. Used by the attendance controller during check-in and check-out to decide what action to take:

- No row → insert a new check-in
- Row exists, no `check_out` → update with check-out time
- Row exists, `check_out` already set → return an error ("already checked out")

### `format(array $row): array`

Converts a raw DB row into the camelCase shape the frontend uses:

- `attendance_id` is not exposed directly
- `id` is a composite string: `ATT-{employee_key}-{date}` (e.g. `ATT-EMP-001-2026-04-23`), matching the format the frontend mock data uses
- `employee_key` → `employeeId`
- `check_in` → `checkIn` (ISO 8601 via `date('c', strtotime(...))`, or `null`)
- `check_out` → `checkOut` (ISO 8601 or `null`)
- `hours_worked` → `hoursWorked` (float or `null`)
- `status` passed through unchanged

---

## Status Values

Attendance status is an ENUM at the DB level with four possible values:

- `Present` — full day, check-in and check-out recorded, 5+ hours worked
- `Half-day` — less than 5 hours worked (set automatically on check-out)
- `Absent` — inserted manually via the update endpoint
- `Leave` — inserted manually via the update endpoint

The `Half-day` determination is automatic: when a check-out is recorded (either via `scan`, `checkIn`/`checkOut` endpoints, or the manual update), the controller calculates `(check_out - check_in)` in hours. If less than 5, status becomes `Half-day`.

---

## How It Is Used

`AdminAttendanceController` calls `Attendance::list()` for the index and byEmployee endpoints, `Attendance::findByEmployeeAndDate()` for scan/checkIn/checkOut logic, and `Attendance::format()` wherever an attendance row is returned in a response.

`AdminEmployeeController::profile()` calls `Attendance::format()` on a direct DB query result to include 30-day attendance history in the profile response.
