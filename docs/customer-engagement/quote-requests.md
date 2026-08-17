# Quote Requests Module

**UI file:** [`eco-sudar-control/src/pages/QuoteRequests.tsx`](../../eco-sudar-control/src/pages/QuoteRequests.tsx)
**API module:** [`eco-sudar-control/src/lib/api/quoteRequests.ts`](../../eco-sudar-control/src/lib/api/quoteRequests.ts) — `quoteRequestsApi`
**Backend (admin):** [`api/controllers/admin/AdminQuoteController.php`](../../api/controllers/admin/AdminQuoteController.php)
**Backend (mobile submit):** [`api/controllers/QuoteController.php`](../../api/controllers/QuoteController.php)
**DB table:** `quotes`

---

## Scope

Customers submit quote requests from the mobile app's Savings Calculator. The calculator pre-fills fuel type, current cost, and projected biomass savings. Admin reviews the request, optionally adds notes and a quoted price, and sends a custom quote email.

---

## Endpoints

### `GET /admin/quote-requests`
List all quote requests. Paginated, filterable by status and search.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `page` | int | Default: 1 |
| `limit` | int | Default: 50, max: 100 |
| `status` | string | `New`, `Contacted`, `Quoted`, `Closed` |
| `search` | string | Searches `name`, `phone`, `email`, `quote_number` |

**Response `200`:** Paginated list of quote objects.

---

### `GET /admin/quote-requests/{id}`
Single quote by `quote_id`.

---

### `PUT /admin/quote-requests/{id}`
Update status, admin notes, and quoted price. Sends a quote email when status is `Quoted` and a price is provided.

**Body:**
```json
{
  "status": "Quoted",
  "admin_notes": "Bulk discount applied for 500kg/month order.",
  "quoted_price": "₹12/kg (500 kg minimum)"
}
```

**Allowed statuses:** `New` · `Contacted` · `Quoted` · `Closed`

**Email trigger:** When `status === "Quoted"` and `quoted_price` is non-empty and the customer has an email, an HTML email is sent via `@mail()` containing the quoted price, savings breakdown, and admin notes.

**Response `200`:**
```json
{
  "success": true,
  "data": { "quote_id": 5, "status": "Quoted", "email_sent": true },
  "message": "Quote sent to customer via email"
}
```

---

## Quote Object Shape

```json
{
  "quote_id": 5,
  "quote_number": "QT-20260424-005",
  "name": "Suresh Factories",
  "email": "suresh@factory.com",
  "phone": "9876543210",
  "message": "Customer uses 100 kg of LPG at ₹85/kg (₹8500/month)...",
  "product": "Biomass Pellets",
  "quantity_per_month": 283,
  "current_fuel": "LPG",
  "current_cost": 8500,
  "biomass_cost": 3967,
  "monthly_savings": 4533,
  "annual_savings": 54396,
  "admin_notes": "",
  "quoted_price": "",
  "status": "New",
  "created_at": "2026-04-24T10:00:00"
}
```

**Fallback parsing:** If the new savings columns (`quantity_per_month`, `current_fuel`, etc.) are `NULL` (legacy rows), `AdminQuoteController::parseMessage()` extracts values from the free-text `message` column using regex. The message format is:
```
Customer uses 100 kg of LPG at ₹85/kg (₹8500/month).
They need 283 kg/month of Biomass Pellets (≈ ₹3967/month), saving ₹4533/month.
```

---

## Status Mapping

| DB value | UI value |
|---|---|
| `pending` | `New` |
| `contacted` | `Contacted` |
| `quoted` | `Quoted` |
| `closed` | `Closed` |
| `sent` (legacy) | `Contacted` |

> **Important:** `quotes.status` must be `VARCHAR(20)`, not `ENUM`. Values `contacted` and `quoted` are not in the legacy ENUM and would be silently dropped. Run `database/migrations/2026_04_24_fix_status_enums.sql`.

---

## Mobile App Submit (`QuoteController`)

When a customer submits from the savings calculator, `POST /quote-requests` saves all 9 calculator fields:

| Field | DB column |
|---|---|
| Fuel type | `current_fuel` |
| Qty/month | `quantity_per_month` |
| Current monthly cost | `current_cost` |
| Biomass monthly cost | `biomass_cost` |
| Monthly savings | `monthly_savings` |
| Annual savings | `annual_savings` |
| Product name | `product` |

---

## Frontend API (`quoteRequests.ts` — `quoteRequestsApi`)

| Method | Call |
|---|---|
| `list()` | `GET /admin/quote-requests?limit=100` → `.data` |
| `update(quoteId, { status, adminNotes, quotedPrice })` | `PUT /admin/quote-requests/{id}` → `{ email_sent }` |

**Money formatting:** `fmtMoney(n, suffix)` formats raw DB numbers (e.g. `8500`) to `₹8,500/month` for display.

---

## Email Behaviour

- Email is only sent when `status === "Quoted"` AND `quoted_price` is non-empty AND customer has an email
- Uses `@mail()` (suppressed return value) — see MAJOR.md §4
- Template includes: quoted price (highlighted), savings table (current fuel, current cost, biomass cost, monthly/annual savings), admin notes block
- From: `Eco Sudar <noreply@ecosudar.com>`
