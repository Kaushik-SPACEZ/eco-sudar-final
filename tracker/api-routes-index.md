# Change: api/index.php

**Type:** Existing file extended
**Date:** 2026-04-22 (task routes), 2026-04-23 (HR + statistics routes)
**Module:** Router — all modules

---

## What Changed

`api/index.php` is the application entry point. It bootstraps the framework, sets CORS headers, loads all models and controllers, and registers all routes. The following additions were made across both days.

---

## New require_once Statements Added

Models section now includes:
- `require_once ROOT_PATH . '/models/Task.php'`
- `require_once ROOT_PATH . '/models/Employee.php'`
- `require_once ROOT_PATH . '/models/Attendance.php'`
- `require_once ROOT_PATH . '/models/Payroll.php'`

Admin controllers section now includes:
- `require_once ROOT_PATH . '/controllers/admin/AdminTaskController.php'`
- `require_once ROOT_PATH . '/controllers/admin/AdminEmployeeController.php'`
- `require_once ROOT_PATH . '/controllers/admin/AdminAttendanceController.php'`
- `require_once ROOT_PATH . '/controllers/admin/AdminPayrollController.php'`

---

## New Routes Registered

### Statistics (auth = true — any logged-in user)

Eight statistics routes are now registered. The three new ones added on Day 2 are:
- `GET /statistics/overview` → `StatisticsController::overview`
- `GET /statistics/employees` → `StatisticsController::employees`
- `GET /statistics/tasks` → `StatisticsController::tasks`
- `GET /statistics/sales` → `StatisticsController::sales`
- `GET /statistics/revenue` → `StatisticsController::revenue`
- `GET /statistics/customers` → `StatisticsController::customers`

(The existing `orders` and `active-orders` routes were already present.)

### Admin Tasks (auth = 'admin')

13 routes total, registered in this exact order (important — see note below):

1. `GET /admin/tasks` → `index`
2. `GET /admin/tasks/performance` → `performance` ← static, must be before `/{id}`
3. `GET /admin/tasks/statistics` → `statistics` ← static, must be before `/{id}`
4. `GET /admin/tasks/employee/{id}` → `byEmployee` ← static prefix, must be before `/{id}`
5. `GET /admin/tasks/{id}` → `show` ← dynamic, must come after all static variants
6. `POST /admin/tasks` → `store`
7. `POST /admin/tasks/{id}/comment` → `addComment`
8. `PUT /admin/tasks/{id}/status` → `updateStatus`
9. `PUT /admin/tasks/{id}/assign` → `assign`
10. `PUT /admin/tasks/{id}/priority` → `updatePriority`
11. `PUT /admin/tasks/{id}` → `update`
12. `PATCH /admin/tasks/{id}` → `update` (alias)
13. `DELETE /admin/tasks/{id}` → `destroy`

### Admin Employees (auth = 'admin')

9 routes total, registered in this order:

1. `GET /admin/employees` → `index`
2. `GET /admin/employees/{id}/qr` → `qr` ← static suffix, before `/{id}`
3. `GET /admin/employees/{id}/profile` → `profile` ← static suffix, before `/{id}`
4. `GET /admin/employees/{id}` → `show`
5. `POST /admin/employees` → `store`
6. `PUT /admin/employees/{id}/status` → `updateStatus`
7. `PUT /admin/employees/{id}` → `update`
8. `PATCH /admin/employees/{id}` → `update` (alias)
9. `DELETE /admin/employees/{id}` → `destroy`

### Admin Attendance (auth = 'admin')

8 routes total, registered in this order:

1. `GET /admin/attendance` → `index`
2. `GET /admin/attendance/report` → `report` ← static, before `/{id}`
3. `GET /admin/attendance/summary` → `summary` ← static, before `/{id}`
4. `GET /admin/attendance/employee/{id}` → `byEmployee` ← static prefix, before `/{id}`
5. `POST /admin/attendance/scan` → `scan`
6. `POST /admin/attendance/check-in` → `checkIn`
7. `POST /admin/attendance/check-out` → `checkOut`
8. `PUT /admin/attendance/{id}` → `update`

### Admin Payroll (auth = 'admin')

7 routes total, registered in this order:

1. `GET /admin/payroll` → `index`
2. `GET /admin/payroll/report` → `report` ← static, before `/{id}`
3. `GET /admin/payroll/{id}/history` → `history` ← before generic `/{id}`
4. `GET /admin/payroll/{id}` → `show`
5. `POST /admin/payroll/run` → `run`
6. `POST /admin/payroll/calculate` → `calculate`
7. `POST /admin/payroll/process` → `process`

---

## Critical: Static-Before-Dynamic Route Ordering

The router in this application matches routes in the order they are registered — first match wins. This means any static segment (like `/performance`, `/report`, `/statistics`) that could be confused with a dynamic `{id}` param must be registered first.

A comment block is included in `index.php` above the tasks routes explaining this requirement:

```
// NOTE: static paths (/performance, /statistics, /employee/{id}) MUST be registered
// BEFORE the dynamic /admin/tasks/{id} — router matches in registration order.
```

The same principle applies to all other resource groups.

---

## Total Route Count

The file now registers 93 total routes across all modules, of which 70 are admin-only routes.
