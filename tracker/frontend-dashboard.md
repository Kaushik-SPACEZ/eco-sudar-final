# Change: eco-sudar-control/src/pages/Dashboard.tsx

**Type:** Existing file rewritten — replaced hardcoded data with real API calls
**Date:** 2026-04-23
**Module:** Frontend — Dashboard

---

## What Changed

The Dashboard page previously had all its numbers hardcoded as static constants. Every stat card value, every chart data point, every recent-orders row was a fixed string or number in the source code. This was replaced with real data fetched from the backend via `statisticsApi`.

---

## State Variables Added

Three new state variables were added to hold live data:

- `overview: OverviewStats | null` — holds the response from `GET /statistics/overview`
- `dailyOrders: any[]` — holds the daily breakdown from `GET /statistics/orders`
- `activeOrders: ActiveOrder[]` — holds the active orders list from `GET /statistics/active-orders`

A `loading: boolean` state controls a loading skeleton shown while the three parallel requests are in flight.

---

## Data Loading

A `loadDashboard()` async function is called on mount via `useEffect`. It fires three API calls in parallel using `Promise.all`:

```
const [ov, ord, active] = await Promise.all([
  statisticsApi.overview(),
  statisticsApi.orders(),
  statisticsApi.activeOrders(),
]);
```

On success, sets all three state variables. On error, shows a toast notification.

---

## Stat Cards — What They Now Show

Six stat cards are populated from live data:

- Total Products — from `overview.products`
- Total Orders — from `overview.orders.total`, with a sub-label showing pending count
- Revenue — from `overview.orders.revenue`, formatted via `fmtRupees()` helper
- Active Users — from `overview.users.active`, sub-label shows total users
- Cancelled Orders — from `overview.orders.cancelled`
- Active Employees — from `overview.employees`, sub-label shows overdue task count from `overview.tasks.overdue`

---

## Chart Data

The chart displays order volume over time. The raw `dailyOrders` array (one row per calendar day for the last 30 days) is processed:

- Each row's `order_date` is parsed to extract the month name (Jan, Feb, Mar, etc.) using a `MONTH_LABELS` lookup map
- Rows are grouped by month label and their `order_count` values are summed
- The result is formatted as `{ name: 'Apr', orders: 42 }` for the Recharts BarChart

This means the chart always shows real data with months determined by what's actually in the database.

---

## Recent Orders Table

The table in the lower section now shows real in-progress orders from `GET /statistics/active-orders`. Each row displays: order number, customer name, status, payment status, order amount, and item count. Status and payment status are shown as colour-coded badges.

Previously this table showed 3 hardcoded placeholder rows.

---

## fmtRupees() Helper

A new helper function was added to format large monetary values into readable short form:
- Values ≥ 1,00,000 → formatted as `₹X.XL` (lakhs)
- Values ≥ 1,000 → formatted as `₹X.Xk` (thousands)
- Smaller values → `₹X`

This is used for the Revenue stat card.

---

## MOCK_MODE Behaviour

When `MOCK_MODE = true` in `client.ts`, the `statisticsApi` methods return mock data that matches the structure of the real API responses. The dashboard renders identically in mock mode and real mode — only the numbers differ. This allows full local development and testing without a backend connection.
