# GST Invoicing Page — `/gst-invoicing`

**UI file:** [`eco-sudar-control/src/pages/GstInvoicing.tsx`](../../eco-sudar-control/src/pages/GstInvoicing.tsx)
**API module:** [`eco-sudar-control/src/lib/api/invoices.ts`](../../eco-sudar-control/src/lib/api/invoices.ts)
**Backend:** [`api/controllers/admin/AdminInvoiceController.php`](../../api/controllers/admin/AdminInvoiceController.php)
**DB tables:** `invoices` (extended), `invoice_items`

---

## Data model changes

The `invoices` table has been extended to support standalone GST invoices (invoices not tied to an order):

| New column | Type | Purpose |
|---|---|---|
| `customer_name` | VARCHAR(150) | Manually-typed customer for standalone invoice |
| `customer_gstin` | VARCHAR(20) | Customer GSTIN |
| `customer_state` | VARCHAR(60) | Customer's state (drives IGST vs CGST+SGST) |
| `customer_address` | TEXT | Billing address |
| `seller_state` | VARCHAR(60) | Seller's state — default "Tamil Nadu" |
| `due_date` | DATE | Payment due date |
| `cgst_amount` | DECIMAL(12,2) | intra-state tax split |
| `sgst_amount` | DECIMAL(12,2) | intra-state tax split |
| `igst_amount` | DECIMAL(12,2) | inter-state tax (single-rate) |

`order_id` is now **nullable**. Status enum extended to cover `Draft`, `Sent`, `Paid`, `Overdue`, `Cancelled` (plus legacy `unpaid/paid/cancelled` for order invoices).

`invoice_items` is a new table with one row per line item:
```
invoice_items (
  item_id, invoice_id, description, hsn_code, quantity,
  unit_price, gst_rate, line_total, sort_order
)
```

`FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE` — deleting the invoice cleans up line items automatically.

---

## Endpoints

### `POST /admin/invoices/gst`
Create a standalone GST invoice with line items. Auto-computes CGST/SGST/IGST based on whether `customer_state === seller_state`.

Request body:
```json
{
  "customer_name": "GreenLeaf Distributors",
  "customer_gstin": "33ABCDE1234F1Z5",
  "customer_state": "Tamil Nadu",
  "customer_address": "12 Anna Salai, Chennai",
  "seller_state": "Tamil Nadu",
  "due_date": "2026-05-30",
  "status": "Draft",
  "notes": "Paid in full",
  "delivery_fee": 0,
  "payment_method": "UPI",
  "items": [
    { "description": "Cotton-stalk briquettes 25kg", "hsn_code": "44013100",
      "quantity": 40, "unit_price": 480, "gst_rate": 5 },
    { "description": "Wood-bark pellets 30kg",       "hsn_code": "44013900",
      "quantity": 25, "unit_price": 720, "gst_rate": 5 }
  ]
}
```

Response (`201`):
```json
{
  "success": true,
  "data": {
    "invoice_id": 42,
    "invoice_number": "GST-2026-0003",
    "subtotal": 37200.00,
    "cgst_amount": 930.00,
    "sgst_amount": 930.00,
    "igst_amount": 0.00,
    "total": 39060.00,
    "status": "Draft"
  },
  "message": "GST invoice created successfully"
}
```

### `GET /admin/invoices/{id}`
Returns the full invoice with its `items` array (from `invoice_items`, or fallback to `order_items` for order-based invoices).

### `PUT /admin/invoices/{id}`
Update header fields and optionally replace all line items.
If `items` is passed in the payload:
1. Recomputes all line totals and GST amounts.
2. Re-evaluates IGST vs CGST/SGST based on newly passed states (or fallbacks to existing/default).
3. Hard-deletes existing `invoice_items` for the `invoice_id` and inserts the new ones.
4. Updates all calculated header fields (`subtotal`, `total`, `cgst_amount` etc.).

Allowed header fields: `customer_name`, `customer_gstin`, `customer_state`, `customer_address`, `seller_state`, `due_date`, `status`, `payment_method`, `notes`.

### Invoice Number Generation
Uses `SELECT MAX(invoice_id)` to sequence numbers instead of `COUNT(*)` to prevent collisions when invoices are deleted.
Standalone GST invoices use the `gst_invoice_prefix` parameter from the settings table (defaulting to "GST"). App orders use `invoice_prefix` (defaulting to "INV").

### `DELETE /admin/invoices/{id}`
Hard delete. Cascades into `invoice_items`.

### `GET /admin/invoices?limit=200`
Unified list (order-based + standalone) with filters: `status`, `order_id`, `user_id`, `from_date`, `to_date`.

---

## Validation rules

| Field | Rule |
|---|---|
| `customer_name`, `customer_state`, `seller_state` | required |
| `items` | non-empty array |
| `items[i].description` | non-empty |
| `items[i].quantity` | > 0 |
| `items[i].unit_price` | ≥ 0 |
| `items[i].gst_rate` | one of 0, 5, 12, 18, 28 |
| `status` | one of Draft/Sent/Paid/Overdue/Cancelled (legacy lower-case also accepted) |

---

## IGST vs CGST+SGST split

```php
$interState = strtolower($customerState) !== strtolower($sellerState);
if ($interState) {
  $igst = $gstTotal;
} else {
  $cgst = $sgst = $gstTotal / 2;
}
```

All three amounts are stored on the invoice row for reporting; the line items carry just `gst_rate`.

---

## UI flow

| Action | API call |
|---|---|
| Page load | `invoicesApi.list()` → `GET /admin/invoices?limit=200` |
| View invoice | `invoicesApi.get(id)` → `GET /admin/invoices/{id}` |
| Create | `invoicesApi.create(...)` → `POST /admin/invoices/gst` |
| Edit | `invoicesApi.update(id, patch)` → `PUT /admin/invoices/{id}` |
| Delete | `invoicesApi.remove(id)` → `DELETE /admin/invoices/{id}` |
