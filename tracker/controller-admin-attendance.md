# Change: api/controllers/admin/AdminAttendanceController.php

**Type:** New file created
**Date:** 2026-04-23
**Module:** HR — Attendance

---

## What This File Is

`AdminAttendanceController.php` handles all attendance-related HTTP requests under the `/admin/attendance` prefix. It exposes 8 routes covering listing records, QR-based auto check-in/out, explicit check-in and check-out, employee-scoped listing, date-range reports, monthly summaries, and manual corrections.

---

## Endpoints Handled

### GET /admin/attendance
Handler: `index()`

Lists attendance records with optional filtering. Accepted query params:
- `from` — start date in `YYYY-MM-DD`
- `to` — end date in `YYYY-MM-DD`
- `employeeId` — employee key (e.g. `EMP-001`)

Delegates to `Attendance::list()` and maps results through `Attendance::format()`.

### POST /admin/attendance/scan
Handler: `scan()`

The main QR scanner endpoint. Receives a `token` string (the value encoded in the employee's QR code). Resolves the employee via `Employee::findByQrToken()`. Then:

- If no attendance row exists for today → inserts a check-in, returns action `"checked-in"`
- If a row exists but no `check_out` → calculates hours since check-in, sets `check_out`, determines status (`Half-day` if < 5 hours, otherwise `Present`), returns action `"checked-out"`
- If a row exists and `check_out` is already set → returns HTTP 400 error "Already checked out for today"

Response includes the resolved employee, the attendance entry, and the action string.

### POST /admin/attendance/check-in
Handler: `checkIn()`

Explicit check-in that accepts either a QR `token` or a direct `employeeId` field. Uses the private `resolveEmployee()` helper to find the employee. Rejects inactive employees. Rejects if a check-in already exists for today. Inserts the attendance row with `check_in = NOW()` and initial `status = 'Present'`.

### POST /admin/attendance/check-out
Handler: `checkOut()`

Explicit check-out — same employee resolution as `checkIn()`. Validates that a check-in exists for today and that `check_out` is not already set. Calculates hours worked, determines Half-day vs Present status, updates the row.

### GET /admin/attendance/employee/{id}
Handler: `byEmployee()`

Returns attendance records for a specific employee. Validates the employee exists first (404 if not). Accepts optional `from` and `to` query params to scope the date range. Delegates filtering to `Attendance::list()`.

### GET /admin/attendance/report
Handler: `report()`

Date-range attendance report with employee details joined in. Accepts `?from` and `?to` query params (defaults to current month start → today if not provided). JOINs `attendance` with `employees` to include `employee_name`, `department`, and `designation` in each record.

Also returns a summary block with aggregate counts across the date range: `total`, `present`, `half_day`, `absent`, `leaves`.

### GET /admin/attendance/summary
Handler: `summary()`

Monthly summary with one row per active employee. Accepts `?month=YYYY-MM` (defaults to current month). Uses a LEFT JOIN from `employees` to `attendance` so employees with zero recorded days still appear in the result.

Per-employee output includes: `daysRecorded`, `present`, `halfDay`, `absent`, `leaves`, `totalHours`.

### PUT /admin/attendance/{id}
Handler: `update()`

Manual correction endpoint. Accepts the numeric `attendance_id` as the path param. Allows updating: `checkIn`, `checkOut`, `hoursWorked`, `status`, `date`. ISO datetime strings for `checkIn` and `checkOut` are converted to MySQL datetime format before storing. Status is validated against the four allowed values.

---

## Private Helper

### `resolveEmployee(Request): array`

Used by `checkIn()` and `checkOut()`. Tries to find the employee by QR `token` first. If no token is provided, falls back to `employeeId`. Returns the raw employee row or sends an error response.

---

## Route Registration Order Note

In `api/index.php`, the static paths `/admin/attendance/report`, `/admin/attendance/summary`, and `/admin/attendance/employee/{id}` are registered BEFORE the dynamic `/admin/attendance/{id}` route. This is critical — without this ordering, requests to `/admin/attendance/report` would be caught by the `{id}` param and routed to the wrong handler.
