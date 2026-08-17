# Invoices Page — `/invoices`

**UI file:** [`eco-sudar-control/src/pages/Invoices.tsx`](../../eco-sudar-control/src/pages/Invoices.tsx)
**API module:** [`eco-sudar-control/src/lib/api/orders.ts`](../../eco-sudar-control/src/lib/api/orders.ts) (for `generateInvoice`)
**Backend:** [`api/controllers/admin/AdminInvoiceController.php`](../../api/controllers/admin/AdminInvoiceController.php)
**DB tables:** `invoices`, `invoice_items` (fallback: `order_items` for order-based invoices)

---

## Scope

The Invoices page lists **all invoices** — both order-based invoices (auto or manually generated from orders) and standalone GST invoices (created via the GST Invoicing page). Admins can view the full invoice, download it, and generate invoices for orders that don't have one yet.

For creating a **new standalone GST invoice with line items**, see [gst-invoicing.md](./gst-invoicing.md).

---

## How invoices are created

There are three paths to an invoice appearing on this page:

| Path | Trigger | Endpoint |
|---|---|---|
| **Auto — on delivery** | Admin sets order status → `Delivered` | `PUT /orders/{id}/status` internally calls `generateForOrder()` |
| **Auto — on payment** | Admin sets payment status → `Paid` | `PUT /orders/{id}/payment-status` internally calls `generateForOrder()` |
| **Manual — Orders page** | Admin clicks "Generate Invoice" in the order detail dialog | `POST /admin/invoices` with `{ order_id }` |
| **Manual — GST Invoicing page** | Admin creates a standalone invoice | `POST /admin/invoices/gst` |

`generateForOrder()` is **idempotent** — if an invoice already exists for the order it does nothing and returns `null` silently. This prevents duplicate invoices even if both triggers fire for the same order.

---

## Endpoints

### `GET /admin/invoices?limit=200`
Returns all invoice headers (order-based and standalone). Supports up to 200 rows per page.

**Query params:**

| Param | Notes |
|---|---|
| `status` | `paid` / `Paid` / `unpaid` / `Draft` / `Sent` / `Overdue` / `Cancelled` |
| `order_id` | Filter to a single order's invoice |
| `user_id` | Filter to a customer's invoices |
| `from_date` / `to_date` | Date range (`YYYY-MM-DD`) |
| `limit` / `page` | Max 200, default 20 |

**Response (`200`):**
```json
{
  "success": true,
  "data": [
    {
      "invoice_id": 1,
      "invoice_number": "INV-2026-0001",
      "order_id": 12,
      "order_number": "ORD-2026-0012",
      "customer_name": "Rajesh Kumar",
      "payment_method": "UPI",
      "customer_gstin": null,
      "customer_state": null,
      "due_date": null,
      "subtotal": 4400.00,
      "gst_rate": 18.00,
      "gst_amount": 792.00,
      "cgst_amount": 396.00,
      "sgst_amount": 396.00,
      "igst_amount": 0.00,
      "delivery_fee": 200.00,
      "total": 5392.00,
      "status": "Paid",
      "notes": null,
      "created_at": "2026-04-10 15:30:00"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "total_pages": 1 }
}
```

For order-based invoices, `customer_name` comes from `users.name` via the order (COALESCE). For standalone GST invoices, it comes from `invoices.customer_name`. `order_number` is `null` for standalone invoices.

---

### `GET /admin/invoices/{id}`
Returns the full invoice with `items[]`.

**Smart items fallback:** For order-based invoices that have no rows in `invoice_items`, the backend derives items from `order_items JOIN products JOIN product_configurations`. This keeps the view dialog populated for all invoices.

---

### `POST /admin/invoices`
Manually generate an invoice for an order.

**Body:** `{ "order_id": 42 }`

**Response (`201`):** Full invoice row.

**Response (`409`):** `"Invoice already exists for this order: INV-2026-0004"` — safe to ignore if already generated.

The invoice status is set to `Paid` if `payment_status = 'paid'`, otherwise `unpaid`. GST is read from the `settings` table (`gst_rate` key, default 18%).

---

### `GET /admin/invoices/{id}/download`
Streams a plain-text invoice file (`Content-Type: text/plain`). Works for both order-based and standalone GST invoices (uses LEFT JOIN).

---

### `PUT /admin/invoices/{id}`
Update invoice header fields. See [gst-invoicing.md](./gst-invoicing.md) for the full list of editable fields.

### `DELETE /admin/invoices/{id}`
Hard delete. Cascades into `invoice_items`.

---

## Auto-generation response payload

When `PUT /orders/{id}/status` or `PUT /orders/{id}/payment-status` triggers an invoice, the response includes:

```json
{
  "success": true,
  "data": {
    "invoice_generated": true,
    "invoice_number": "INV-2026-0005"
  },
  "message": "Order status updated successfully"
}
```

The `Orders.tsx` UI reads this and shows a toast: `"Invoice INV-2026-0005 auto-generated"`.

---

## UI flow

| Action | Trigger | API call |
|---|---|---|
| Page load | — | `GET /admin/invoices?limit=200` |
| View invoice | Click row | `GET /admin/invoices/{id}` |
| Download | Click download | `GET /admin/invoices/{id}/download` → Blob → browser download |
| Manual generate | "Generate Invoice" in Orders dialog | `POST /admin/invoices` |
| Auto-generate | Set order → Delivered or payment → Paid | Happens server-side; toast confirms |

---

## UI → API field mapping

| UI field | Source |
|---|---|
| `id` | `invoice_number` |
| `orderId` | `order_number` (null for GST invoices) |
| `customer` | `COALESCE(invoices.customer_name, users.name)` |
| `gst` | `customer_gstin` |
| `items[]` | from `GET /admin/invoices/{id}` |
| `subtotal` | formatted `₹x,xx,xxx` |
| `gstAmount` | formatted |
| `cgst` / `sgst` / `igst` | formatted (GST invoices only) |
| `deliveryFee` | formatted |
| `total` | formatted |
| `status` | normalised (`Paid` / `Pending` / `Draft` / etc.) |
| `paymentMethod` | `payment_method` |

---

## Error codes

| Code | Meaning |
|---|---|
| 400 | Invalid invoice id |
| 401 | Missing/invalid admin token |
| 404 | Invoice or order not found |
| 409 | Invoice already exists for this order |
