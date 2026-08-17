# Reports Page — `/reports`

**UI file:** [`eco-sudar-control/src/pages/Reports.tsx`](../../eco-sudar-control/src/pages/Reports.tsx)
**API module:** [`eco-sudar-control/src/lib/api/reports.ts`](../../eco-sudar-control/src/lib/api/reports.ts)
**Backend:** [`api/controllers/admin/AdminReportsController.php`](../../api/controllers/admin/AdminReportsController.php)

---

## Scope

A single endpoint returns a uniform row shape for six different "module" views. The UI picks a module tile, sets a date range, and the page refetches.

---

## Endpoint

### `GET /admin/reports?module=<key>&from=YYYY-MM-DD&to=YYYY-MM-DD`

**Modules** (`<key>`):

| Key | Source | Row mapping |
|---|---|---|
| `sales` | `invoices` | date=`created_at`, reference=`invoice_number`, category="Invoice", party=`customer_name`, amount=`total`, status=`status` |
| `orders` | `orders` + `users` | date=`created_at`, reference=`order_number`, category="Wholesale" if dealer else "Retail", party=`users.name`, amount=`total_amount`, status=`order_status` |
| `payments` | `invoices` (inflow) ∪ `expenses` (outflow) | inflow: category="Inflow", status="Cleared". outflow: category="Outflow", status="Paid" |
| `expenses` | `expenses` | date=`expense_date`, reference=`expense_code`, category=`category`, party=`vendor`, amount=`amount`, status="Paid" |
| `forecast` | `orders` (last 3 mo avg) | synthetic monthly rows within window, amount = 3-month average of paid-order revenue |
| `production` | — (no production table yet) | returns empty array |

Response:
```json
{
  "success": true,
  "data": {
    "module": "sales",
    "from": "2026-04-01",
    "to": "2026-04-30",
    "rows": [
      { "date": "2026-04-02", "reference": "GST-2026-0001", "category": "Invoice",
        "party": "GreenLeaf Distributors", "amount": 39060, "status": "Paid" }
    ],
    "total": 39060,
    "count": 1
  }
}
```

---

## Validation

| Code | When |
|---|---|
| 422 | Unknown module (must be sales/orders/payments/expenses/production/forecast) |
| 422 | Invalid `from` or `to` (not YYYY-MM-DD) |
| 422 | `from > to` |

---

## UI flow

1. Module tile clicked → `module` state updates.
2. Preset button (Today/Week/Month/Year) → `from`/`to` states update.
3. `useEffect([module, from, to])` fires → `reportsApi.fetch(module, from, to)` → updates `allRows`.
4. Category dropdown + search filter `allRows` client-side into the displayed `rows`.
5. Export PDF/Excel uses the filtered `rows`.

---

## Notes

- The `production` module currently returns an empty array — add a `production` table and extend `AdminReportsController::production()` when production tracking is added.
- The `forecast` module uses a naive moving average. Replace with a proper forecast algorithm (e.g., Holt-Winters) when revenue history grows.
- **Robustness**: The queries aggressively use `COALESCE(field, 'Unknown')` for names and fall back to `created_at` for dates if `updated_at` is `NULL`. This prevents PHP `strcmp` TypeError crashes during sorting and prevents the frontend React search (`.toLowerCase()`) from crashing on a null party name.
