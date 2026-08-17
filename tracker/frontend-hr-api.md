# Change: eco-sudar-control/src/lib/api/hr.ts

**Type:** Existing file modified — real API paths updated
**Date:** 2026-04-23
**Module:** Frontend — HR API Layer

---

## What Changed

`hr.ts` already existed with mock data and a `MOCK_MODE` guard. The change was updating the four real API path strings (used when `MOCK_MODE = false`) to match the actual backend routes. Previously the paths were placeholder paths with no `/admin` prefix — they would have returned 404 on the real backend.

---

## Paths Updated

### `employeesApi.list()`
Before: `/employees`
After: `/admin/employees`

### `employeesApi.create()`
Before: `/employees`
After: `/admin/employees`

### `employeesApi.update()`
Before: `/employees/${id}`
After: `/admin/employees/${id}`

### `employeesApi.remove()`
Before: `/employees/${id}`
After: `/admin/employees/${id}`

### `attendanceApi.list()`
Before: `/attendance`
After: `/admin/attendance`

### `attendanceApi.scan()`
Before: `/attendance/scan`
After: `/admin/attendance/scan`

### `payrollApi.run()`
Before: `/payroll/run`
After: `/admin/payroll/run`

---

## What Was Not Changed

All mock data, mock logic, TypeScript interfaces, and the `MOCK_MODE` checks were left exactly as-is. The mock implementation still works identically for local development. Only the string literals inside the `else` branches (the real-API paths) were updated.

The comment block at the top of the file was updated from "Future endpoints" to a description of the `MOCK_MODE` behaviour to better reflect that these endpoints are now fully implemented.

---

## Mock Data Quality

The file contains realistic mock data for Bio Energy LLP:
- 5 employees across different departments (Production, Quality, Dispatch, Sales, Maintenance)
- Attendance generated dynamically for the last 30 days with randomised statuses
- QR tokens in the `ESD-AP-001-7Q9X` format matching what the backend generates
- Payroll calculation using the same formula as the backend (HRA 10%, allowances 5%, PF 12%, prof-tax ₹200)

This means the mock UI and the real-backend UI will produce visually consistent results.
