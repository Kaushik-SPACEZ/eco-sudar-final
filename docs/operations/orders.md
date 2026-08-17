# Orders Module

**UI file:** [`eco-sudar-control/src/pages/Orders.tsx`](../../eco-sudar-control/src/pages/Orders.tsx)
**API module:** [`eco-sudar-control/src/lib/api/orders.ts`](../../eco-sudar-control/src/lib/api/orders.ts)
**Backend:** [`api/controllers/OrderController.php`](../../api/controllers/OrderController.php)
**DB table:** `orders`, `order_items`, `order_status_history`

---

## Scope

Orders are placed by customers (or dealers) via the mobile app. The admin dashboard lists all orders, lets the admin update order status and payment details, and shows full item breakdowns per order.

---

## Endpoints

### `GET /orders?limit=100&page=1&status=<status>`
List all orders (admin sees all; customer sees only their own).

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `status` | string | Filter by `order_status` (see statuses below) |
| `limit` | int | Max 100, default 10 |
| `page` | int | Default 1 |

**Response** `200`
```json
{
  "data": [
    {
      "order_id": 12,
      "order_number": "ORD-2026-0012",
      "user_id": 7,
      "total_amount": 4800.00,
      "delivery_fee": 200.00,
      "order_status": "confirmed",
      "payment_status": "paid",
      "payment_method": "upi",
      "delivery_address": "12 Anna Salai",
      "delivery_city": "Chennai",
      "delivery_state": "Tamil Nadu",
      "delivery_pincode": "600002",
      "created_at": "2026-04-10 09:45:00",
      "items": []
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 84, "total_pages": 9 }
}
```

---

### `GET /orders/{id}`
Fetch a single order with full line items.

**Response** `200` — same shape as list row but with `items[]` populated:
```json
{
  "data": {
    "order_id": 12,
    "items": [
      {
        "item_id": 31,
        "product_id": 2,
        "product_name": "Biomass Pellets",
        "config_id": 5,
        "size": "6mm",
        "purpose": "Commercial Kitchen",
        "sub_purpose": "Restaurant Kitchen",
        "quantity": 10,
        "unit_price": 480.00,
        "line_total": 4800.00
      }
    ]
  }
}
```

---

### `PUT /orders/{id}/status`
Update order status. Setting `delivered` **auto-generates an invoice** if one doesn't already exist.

**Body**
```json
{ "order_status": "shipped" }
```

**Valid `order_status` values:**
| Value | Meaning |
|---|---|
| `pending` | Just placed, not yet confirmed |
| `confirmed` | Admin/dealer has confirmed |
| `processing` | Being prepared/packed |
| `shipped` | Dispatched to courier |
| `delivered` | Received by customer — **triggers invoice auto-generation** |
| `cancelled` | Cancelled by customer or admin |

**Response** `200` — includes invoice info when auto-generated:
```json
{
  "success": true,
  "data": { "invoice_generated": true, "invoice_number": "INV-2026-0005" },
  "message": "Order status updated successfully"
}
```
If no invoice was generated (not `delivered`, or one already existed), `data` is `null`.

**Errors:**
- `404` — order not found
- `422` — invalid `order_status` value

---

### `PUT /orders/{id}/payment`
Record the payment method.

**Body**
```json
{ "payment_method": "upi" }
```

**Valid values:** `upi`, `cash`, `bank_transfer`, `card`, `cheque`

---

### `PUT /orders/{id}/payment-status`
Mark payment as received. Setting `paid` **auto-generates an invoice** if one doesn't already exist.

**Body**
```json
{ "payment_status": "paid" }
```

**Valid values:** `pending`, `paid`, `refunded`

**Response** `200` — same shape as status update; includes `invoice_generated` + `invoice_number` when triggered.

---

### `POST /orders`
Place a new order (customer-facing, requires auth).

**Body**
```json
{
  "delivery_address": "12 Anna Salai",
  "delivery_city": "Chennai",
  "delivery_state": "Tamil Nadu",
  "delivery_pincode": "600002",
  "payment_method": "upi",
  "items": [
    { "product_id": 2, "config_id": 5, "quantity": 10 }
  ]
}
```

**Response** `201`
```json
{
  "success": true,
  "data": { "order_id": 13, "order_number": "ORD-2026-0013", "total_amount": 4800.00 },
  "message": "Order placed successfully"
}
```

---

## Order Status Flow

```
pending → confirmed → processing → shipped → delivered
     ↘                                           ↗
       → cancelled ──────────────────────────────
```

Status transitions are not enforced server-side — the admin can set any value directly.

---

## Data Model

### `orders` table

| Column | Type | Notes |
|---|---|---|
| `order_id` | int | PK |
| `order_number` | varchar | Auto-generated `ORD-YYYY-NNNN` |
| `user_id` | int | FK → `users` |
| `total_amount` | decimal | Total incl. delivery |
| `delivery_fee` | decimal | Shipping cost |
| `order_status` | enum | `pending/confirmed/processing/shipped/delivered/cancelled` |
| `payment_status` | varchar | `pending/paid/failed/refunded` |
| `payment_method` | varchar | `upi/cash/bank_transfer/card/cheque` |
| `delivery_address` | varchar | |
| `delivery_city` | varchar | |
| `delivery_state` | varchar | |
| `delivery_pincode` | varchar | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### `order_items` table

| Column | Type | Notes |
|---|---|---|
| `item_id` | int | PK |
| `order_id` | int | FK → `orders` ON DELETE CASCADE |
| `product_id` | int | FK → `products` |
| `config_id` | int | FK → `product_configurations` (nullable) |
| `size` | varchar | Denormalised at order time |
| `purpose` | varchar | Denormalised at order time |
| `sub_purpose` | varchar | Denormalised at order time |
| `quantity` | int | |
| `unit_price` | decimal | Price locked at order time |
| `line_total` | decimal | `quantity × unit_price` |

### `order_status_history` table

Every `PUT /orders/{id}/status` appends a row here for audit trail:

| Column | Notes |
|---|---|
| `order_id` | FK → `orders` |
| `from_status` | Previous value |
| `to_status` | New value |
| `changed_by_ip` | Request IP |
| `created_at` | Timestamp |

---

## UI Mapping (`eco-sudar-control/src/lib/api/orders.ts`)

`mapApiOrderToUI(order, items)` converts the raw API row into the UI `Order` shape:

| API field | UI field |
|---|---|
| `order_number` | `id` |
| `order_id` | `_orderId` (internal, used for API calls) |
| `users.name` | `customer` |
| `order_status` | `status` (capitalised) |
| `payment_status` | `paymentStatus` |
| `payment_method` | `paymentMethod` (capitalised) |
| `total_amount` | `amount` (formatted ₹ string) |
| `created_at` | `date` (formatted `DD Mon YYYY`) |
| `items[]` | `items[]` (mapped to UI shape) |

---

## Invoice generation from Orders page

Admins can trigger invoice generation directly from the order detail dialog via the **"Generate Invoice"** button. This calls `POST /admin/invoices` with the order's id.

| Scenario | Result |
|---|---|
| Invoice doesn't exist yet | Invoice created; toast shows the new invoice number |
| Invoice already exists | `409` returned; toast shows "Invoice already exists for this order" (not an error) |
| Order set to Delivered | Invoice auto-created server-side; same toast appears in the status-update response |
| Payment status set to Paid | Invoice auto-created server-side |

Invoice generation is idempotent — running it multiple times never creates duplicates.

See [invoices.md](../finance/invoices.md) for the full invoice data model and endpoint reference.

---

## Notes

- Price is **locked at order time** by copying `unit_price` from `product_configurations` into `order_items`. Subsequent product price changes do not affect past orders.
- `delivery_fee` is stored separately so P&L can exclude it from revenue when needed.
- The admin dashboard fetches orders via `GET /orders` (not `/admin/orders`) — the same endpoint used by the mobile app; admin JWTs return all orders, customer JWTs return only their own.
