# Change: eco-sudar-control/src/lib/api/statistics.ts

**Type:** New file created
**Date:** 2026-04-23
**Module:** Frontend — Dashboard API Layer

---

## What This File Is

`statistics.ts` is the frontend API module for the statistics and dashboard endpoints. It was created to give `Dashboard.tsx` a clean way to load real data from the backend, replacing the hardcoded mock values that were previously baked directly into the component.

Like all API files in this project, it uses a `MOCK_MODE` flag imported from `client.ts`. When `MOCK_MODE = true` (local development), all methods return static in-memory data after a simulated delay. When `MOCK_MODE = false` (production), they call the real backend via `apiFetch()`.

---

## TypeScript Interfaces Defined

### `OverviewStats`
Shape of the response from `GET /statistics/overview`. Contains five nested objects:
- `orders` — `{ total, revenue, pending, cancelled }`
- `users` — `{ total, active }`
- `products` — number
- `employees` — number
- `tasks` — `{ total, pending, inProgress, completed, overdue }`

### `OrderSummary`
Shape of the `summary` block from `GET /statistics/orders`. Includes all order status counts, today/week/month breakdowns, and payment status counts.

### `ActiveOrder`
Shape of each item in `GET /statistics/active-orders`. Includes order details plus the customer's name, email, phone, and item count.

---

## Methods

### `statisticsApi.overview(): Promise<OverviewStats>`

When in MOCK_MODE, returns a hardcoded mock object matching the `OverviewStats` shape with realistic values for a bio-energy company (matching the stat card values that were previously hardcoded in `Dashboard.tsx`).

When MOCK_MODE is false, calls `GET /statistics/overview`.

### `statisticsApi.orders(): Promise<{ summary: OrderSummary; daily: any[]; topProducts: any[] }>`

When in MOCK_MODE, returns an object with mock summary, an empty daily array, and an empty topProducts array (the dashboard chart doesn't need deep history in mock mode).

When MOCK_MODE is false, calls `GET /statistics/orders`.

### `statisticsApi.activeOrders(): Promise<ActiveOrder[]>`

When in MOCK_MODE, returns 3 hardcoded active order objects with realistic Tamil Nadu company names, statuses, and amounts.

When MOCK_MODE is false, calls `GET /statistics/active-orders`.

---

## Why It Was Created Separately

The statistics module was kept separate from the existing `hr.ts` and `tasks.ts` files to maintain single-responsibility. Each module covers one domain area. `statistics.ts` is the data layer for the dashboard and analytics pages. `hr.ts` handles employees, attendance, and payroll. `tasks.ts` handles tasks and performance. None of them overlap.
