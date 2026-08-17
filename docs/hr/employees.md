# Employees Module

**UI file:** [`eco-sudar-control/src/pages/Employees.tsx`](../../eco-sudar-control/src/pages/Employees.tsx)
**API module:** [`eco-sudar-control/src/lib/api/hr.ts`](../../eco-sudar-control/src/lib/api/hr.ts) — `employeesApi`
**Backend:** [`api/controllers/admin/AdminEmployeeController.php`](../../api/controllers/admin/AdminEmployeeController.php)
**Model:** [`api/models/Employee.php`](../../api/models/Employee.php)
**DB table:** `employees`

---

## Scope

Manages the company's staff directory. Admins can create employees (auto-assigned `EMP-XXX` key and unique QR token), update details, toggle active/inactive status, and soft-delete (deactivate without losing attendance/payroll history). Each employee's QR token is used by the attendance scanner.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>` (AdminMiddleware).

### `GET /admin/employees`
List all employees. Supports optional filters.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `department` | string | Filter by department (see valid values below) |
| `active` | `1` / `0` | Filter active or inactive employees |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "EMP-001",
      "name": "Arun Prakash",
      "email": "arun@ecosudar.in",
      "phone": "+91 98400 11122",
      "department": "Production",
      "designation": "Shift Supervisor",
      "baseSalary": 32000.00,
      "joinedAt": "2023-04-12",
      "qrToken": "ESD-AP-001-7Q9X",
      "active": true
    }
  ],
  "message": null
}
```

---

### `GET /admin/employees/{id}`
Fetch a single employee by `employee_key` (e.g. `EMP-001`).

**Response `200`:** Single employee object (same shape as list row).

**Errors:** `404` — employee not found.

---

### `GET /admin/employees/{id}/qr`
Return the QR token payload for printing/displaying a QR code.

**Response `200`:**
```json
{ "success": true, "data": { "employeeId": "EMP-001", "qrToken": "ESD-AP-001-7Q9X" } }
```

---

### `GET /admin/employees/{id}/profile`
Full profile: employee details + last 30 days attendance summary + last 3 payslips.

---

### `POST /admin/employees`
Create a new employee. `employee_key` (`EMP-XXX`) and `qrToken` are auto-generated.

**Body:**
```json
{
  "name":        "Karthik S",
  "email":       "karthik@ecosudar.in",
  "phone":       "+91 99520 11445",
  "department":  "Dispatch",
  "designation": "Logistics Lead",
  "baseSalary":  28000,
  "joinedAt":    "2024-01-18",
  "active":      true
}
```

**Response `201`:** Created employee object including auto-generated `id` and `qrToken`.

**Errors:** `422` — missing required fields or invalid department.

---

### `PUT /admin/employees/{id}` / `PATCH /admin/employees/{id}`
Partial or full update. Send only the fields to change.

**Updatable fields:** `name`, `email`, `phone`, `department`, `designation`, `baseSalary`, `joinedAt`, `active`.

**Response `200`:** Updated employee object.

---

### `PUT /admin/employees/{id}/status`
Toggle active/inactive explicitly.

**Body:** `{ "active": false }`

**Response `200`:** Updated employee object.

---

### `DELETE /admin/employees/{id}`
Soft-deactivate (sets `is_active = 0`). Attendance and payroll history is preserved.

**Response `200`:** `{ "success": true, "data": null, "message": "Employee deactivated" }`

---

## Data Model

### `employees` table

| Column | Type | Notes |
|---|---|---|
| `employee_id` | int | PK, auto-increment |
| `employee_key` | varchar | Unique — `EMP-001`, `EMP-002`, … |
| `name` | varchar | Full name |
| `email` | varchar | Unique, lowercased on save |
| `phone` | varchar | |
| `department` | enum | `Production / Quality / Sales / Admin / Dispatch / Maintenance` |
| `designation` | varchar | Job title |
| `base_salary` | decimal | Monthly gross (₹) |
| `joined_at` | date | `YYYY-MM-DD` |
| `qr_token` | varchar | Unique — `ESD-{INITIALS}-{NUM}-{RAND4}` |
| `is_active` | tinyint | `1` = active, `0` = inactive |
| `created_at` | datetime | Auto-set on INSERT |

---

## QR Token Format

```
ESD-{INITIALS}-{PADDED_NUM}-{4-CHAR-RAND}
Example: ESD-AP-001-7Q9X
```

- `INITIALS` — first letter of each word in `name`, max 2 chars, uppercase.
- `PADDED_NUM` — employee sequence number, zero-padded to 3 digits.
- `4-CHAR-RAND` — 4 uppercase alphanumeric chars from `bin2hex(random_bytes(3))`.

---

## Frontend API (`hr.ts` — `employeesApi`)

| Method | Real backend call | Mock behaviour |
|---|---|---|
| `list()` | `GET /admin/employees` → `.data` | Returns in-memory `MOCK_EMPLOYEES` |
| `create(data)` | `POST /admin/employees` → `.data` | Appends to `MOCK_EMPLOYEES`, auto-generates id + token |
| `update(id, patch)` | `PATCH /admin/employees/{id}` → `.data` | Merges patch in-memory |
| `remove(id)` | `DELETE /admin/employees/{id}` | Filters from `MOCK_EMPLOYEES` |

All real-backend calls unwrap the `{ success, data, message }` envelope via `.data`.

---

## Valid Departments

`Production` · `Quality` · `Sales` · `Admin` · `Dispatch` · `Maintenance`

---

## Error Codes

| Code | Meaning |
|---|---|
| `401` | Missing or invalid admin token |
| `403` | Authenticated but not admin |
| `404` | Employee not found |
| `422` | Validation failure (missing field, invalid department) |
