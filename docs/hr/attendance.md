# Attendance Module

**UI file:** [`eco-sudar-control/src/pages/Attendance.tsx`](../../eco-sudar-control/src/pages/Attendance.tsx)
**API module:** [`eco-sudar-control/src/lib/api/hr.ts`](../../eco-sudar-control/src/lib/api/hr.ts) — `attendanceApi`
**Backend:** [`api/controllers/admin/AdminAttendanceController.php`](../../api/controllers/admin/AdminAttendanceController.php)
**Model:** [`api/models/Attendance.php`](../../api/models/Attendance.php)
**DB table:** `attendance`

---

## Scope

Tracks daily check-in / check-out for all employees. Three entry paths: QR scan (employee scans badge), manual entry (admin adds/edits any record), and explicit check-in/check-out by employee ID. Hours worked and status (`Present` / `Half-day` / `Absent` / `Leave`) are auto-computed from the time difference. Admin can also delete any record.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `GET /admin/attendance`
List attendance records with optional date-range and employee filters.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `from` | `YYYY-MM-DD` | Start date (inclusive) |
| `to` | `YYYY-MM-DD` | End date (inclusive) |
| `employeeId` | string | Filter to one employee (`EMP-001`) |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id":          "ATT-EMP-001-2026-04-25",
      "employeeId":  "EMP-001",
      "date":        "2026-04-25",
      "checkIn":     "2026-04-25T09:00:00",
      "checkOut":    "2026-04-25T17:00:00",
      "hoursWorked": 8.0,
      "status":      "Present"
    }
  ]
}
```

> **Datetime format:** `YYYY-MM-DDTHH:MM:SS` — **no UTC offset** — so the browser renders the time exactly as stored (no timezone shift). Server timezone is set to `Asia/Kolkata` (`date_default_timezone_set` in `app.php`).

---

### `POST /admin/attendance/scan`
QR scan flow: resolve token → auto check-in or check-out for today.

**Body:** `{ "token": "ESD-AP-001-7Q9X" }`

**Logic:**
1. No record for today → **check-in** (creates row, `status = Present`).
2. Record exists, no `check_out` → **check-out** (updates row, calculates hours, sets status).
3. Already checked out → `400 Already checked out for today`.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "employee": { "id": "EMP-001", "name": "Arun Prakash", … },
    "entry":    { "id": "ATT-EMP-001-2026-04-25", "checkIn": "2026-04-25T09:05:00", … },
    "action":   "checked-in"
  }
}
```

**`action` values:** `"checked-in"` · `"checked-out"`

---

### `POST /admin/attendance/manual`
Upsert a record for any employee on any date (admin correction / retroactive entry).

**Body:**
```json
{
  "employeeId": "EMP-001",
  "date":       "2026-04-25",
  "checkIn":    "09:00",
  "checkOut":   "17:00",
  "status":     "Present"
}
```

- `checkIn` / `checkOut` are `HH:MM` (24-hour). Backend converts to `YYYY-MM-DD HH:MM:SS`.
- If both times present and hours < 5, status is auto-downgraded to `Half-day`.
- If a record already exists for `(employeeId, date)`, it is updated; otherwise inserted.

**Response `200` / `201`:** Single `AttendanceEntry` object.

---

### `POST /admin/attendance/check-in`
Explicit check-in by token or employee ID.

**Body:** `{ "token": "ESD-AP-001-7Q9X" }` OR `{ "employeeId": "EMP-001" }`

**Response `200`:** `{ employee, entry, action: "checked-in" }`

---

### `POST /admin/attendance/check-out`
Explicit check-out by token or employee ID.

**Body:** `{ "token": "ESD-AP-001-7Q9X" }` OR `{ "employeeId": "EMP-001" }`

**Response `200`:** `{ employee, entry, action: "checked-out" }`

---

### `GET /admin/attendance/employee/{id}`
All records for one employee. Supports `?from` and `?to` filters.

---

### `GET /admin/attendance/report`
Date-range report with per-record employee details (name, department, designation) and an aggregate summary.

**Query params:** `from` (default: first of current month), `to` (default: today).

**Response `200`:**
```json
{
  "data": {
    "from": "2026-04-01", "to": "2026-04-25",
    "summary": { "total": 62, "present": 48, "half_day": 7, "absent": 4, "leaves": 3 },
    "records": [ { …entry fields + "employeeName", "department", "designation" } ]
  }
}
```

---

### `GET /admin/attendance/summary`
Month-level per-employee aggregates (total days, present, half-day, absent, leaves, total hours).

**Query param:** `?month=YYYY-MM` (default: current month).

**Response `200`:**
```json
{
  "data": {
    "month": "2026-04",
    "records": [
      {
        "employeeId": "EMP-001", "name": "Arun Prakash",
        "department": "Production", "designation": "Shift Supervisor",
        "daysRecorded": 20, "present": 17, "halfDay": 2,
        "absent": 1, "leaves": 0, "totalHours": 144.5
      }
    ]
  }
}
```

---

### `PUT /admin/attendance/{id}`
Update specific fields of a record by numeric `attendance_id`.

**Updatable fields:** `checkIn`, `checkOut`, `hoursWorked`, `status`, `date` (camelCase in body → snake_case in DB).

**Response `200`:** Updated `AttendanceEntry`.

---

### `DELETE /admin/attendance/{id}`
Delete a record by composite ID (`ATT-{employee_key}-{YYYY-MM-DD}`).

**How it works:** The controller parses the composite ID with regex `^ATT-(.+)-(\d{4}-\d{2}-\d{2})$` to extract `employee_key` and `date`, then executes `DELETE FROM attendance WHERE employee_key = ? AND date = ?`.

**Response `200`:** `{ "success": true, "data": null, "message": "Attendance record deleted" }`

**Errors:** `400` — malformed ID · `404` — record not found.

---

## Status Auto-computation

| Condition | Status |
|---|---|
| `hoursWorked >= 5` | `Present` |
| `hoursWorked < 5` (and was `Present`) | `Half-day` |
| No check-in | `Absent` |
| Admin sets explicitly | Any of `Present / Half-day / Absent / Leave` |

---

## Data Model

### `attendance` table

| Column | Type | Notes |
|---|---|---|
| `attendance_id` | int | PK, auto-increment |
| `employee_key` | varchar | FK → `employees.employee_key` |
| `date` | date | `YYYY-MM-DD` |
| `check_in` | datetime | `YYYY-MM-DD HH:MM:SS` (IST, no TZ) |
| `check_out` | datetime | `YYYY-MM-DD HH:MM:SS` (IST, no TZ) |
| `hours_worked` | decimal | Rounded to 1 dp |
| `status` | enum | `Present / Half-day / Absent / Leave` |
| `created_at` | datetime | |
| `updated_at` | datetime | |

Composite unique key on `(employee_key, date)` — one record per employee per day.

---

## Frontend API (`hr.ts` — `attendanceApi`)

| Method | Real backend call | Mock behaviour |
|---|---|---|
| `list(params?)` | `GET /admin/attendance?from&to&employeeId` | Filters `MOCK_ATTENDANCE` array |
| `manual(data)` | `POST /admin/attendance/manual` → `.data` | Upserts in-memory array |
| `scan(token)` | `POST /admin/attendance/scan` → `.data` | Resolves token in-memory, toggles check-in/out |
| `remove(id)` | `DELETE /admin/attendance/{id}` | Filters from `MOCK_ATTENDANCE` by composite ID |

**URLSearchParams safety:** Undefined filter values are excluded before building the query string — `new URLSearchParams({})` is only called with defined keys — preventing literal `"undefined"` params reaching the backend.

---

## UI Features

| Feature | Location |
|---|---|
| QR Scanner | `QrScanner` component — fullscreen, calls `attendanceApi.scan()` |
| Manual Entry | Dialog opened by **+ Manual Entry** button — upserts via `attendanceApi.manual()` |
| Edit record | Pencil icon per row — pre-fills the same dialog via `isoToTime()` |
| Delete record | Trash icon per row — confirmation dialog → `attendanceApi.remove()` |
| Time display | `fmtTime()` reads `HH:MM` directly from the stored string (no `Date` object) — immune to UTC↔IST shift |
| Stat cards | Present Today, Half-day, Absent Today, Checked-in (awaiting check-out) |
| Export | Excel via `exportToExcel()` |

---

## Timezone Note

`api/config/app.php` sets `date_default_timezone_set('Asia/Kolkata')` globally. All `date()` / `strtotime()` calls in the backend use IST. `Attendance::format()` returns datetimes as `Y-m-d\TH:i:s` (no offset string), so the browser treats the value as local time — no 5:30-hour shift.

---

## Error Codes

| Code | Meaning |
|---|---|
| `400` | Invalid QR token / malformed composite ID / already checked out |
| `401` | Missing or invalid admin token |
| `404` | Employee or attendance record not found |
| `422` | Missing required fields, invalid date format, invalid status |
