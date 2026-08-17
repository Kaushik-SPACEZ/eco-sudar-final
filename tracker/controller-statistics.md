# Change: api/controllers/StatisticsController.php

**Type:** Existing file extended with 6 new methods
**Date:** 2026-04-23
**Module:** Dashboard & Analytics

---

## What Changed

`StatisticsController.php` previously had only the `orders()` method (plus a stub). Six new public methods were added to provide the dashboard and HR analytics endpoints. All methods are standalone — they query the database directly and return formatted response data. None of them require request body data; all filtering is done via query params if applicable.

---

## New Methods Added

### `overview()`
Route: GET /statistics/overview

Single-call dashboard summary that aggregates data from four tables in parallel queries:

- Orders: total count, total revenue, pending count, cancelled count
- Users: total non-admin users, active non-admin users
- Products: count of active products
- Employees: count of active employees
- Tasks: total, pending, in-progress, completed, overdue

The response is structured as `{ orders, users, products, employees, tasks }`. Used by `Dashboard.tsx` to populate the top stat cards without making five separate API calls.

### `employees()`
Route: GET /statistics/employees

Returns three pieces of employee data:

- `total` — count of active employees
- `presentToday` — count of attendance rows for today with status `Present` or `Half-day`
- `byDepartment` — array of `{ department, count }` for all active employees, ordered by count descending

### `tasks()`
Route: GET /statistics/tasks

Returns task counts grouped by status: `total`, `pending`, `in_progress`, `completed`, `overdue`. Overdue is defined as tasks where `due_date < CURDATE()` and `status != 'Completed'`. All values cast to int.

This endpoint is separate from `AdminTaskController::statistics()`. The difference is that `GET /statistics/tasks` does not require admin authentication (it uses the `true` auth flag meaning any logged-in user), whereas `GET /admin/tasks/statistics` requires admin role.

### `sales()`
Route: GET /statistics/sales

Returns sales data in three shapes:

- `summary` — `{ totalOrders, totalSales, avgOrderValue }` across all non-cancelled orders
- `daily` — last 30 days: one row per day with `{ sale_date, items_sold, units_sold, total_sales }`, JOINed with `order_items`
- `monthly` — last 12 months: one row per month with `{ month, orders, total_sales }`

### `revenue()`
Route: GET /statistics/revenue

Returns revenue aggregated at different time scales plus a payment mix breakdown:

- `summary` — `{ lifetime, today, thisWeek, thisMonth, thisYear }` from non-cancelled orders
- `monthly` — last 12 months: `{ month, revenue, orders }`
- `paymentMix` — per payment_status: `{ payment_status, orders, amount }` — shows split between paid, pending, and any other statuses

### `customers()`
Route: GET /statistics/customers

Returns customer analytics:

- `summary` — `{ total, active, customers, dealers, newToday, newThisMonth }` — customers and dealers are counted separately based on `user_type`
- `topCustomers` — top 10 users by lifetime order value (excluding cancelled orders), with `{ user_id, name, email, phone, user_type, total_orders, lifetime_value }`

---

## Pre-existing Methods (not changed)

- `orders()` — already existed, detailed daily breakdown and top products
- `activeOrders()` — already existed, returns in-progress orders

---

## Auth Requirement

All statistics routes are registered with `true` as the auth flag (requires any valid JWT), not `'admin'`. This means they are accessible to any authenticated user, not just admins. This is consistent with the pre-existing `orders()` and `activeOrders()` routes.
