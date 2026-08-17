# Expenses Page — `/expenses`

**UI file:** [`eco-sudar-control/src/pages/Expenses.tsx`](../../eco-sudar-control/src/pages/Expenses.tsx)
**API module:** [`eco-sudar-control/src/lib/api/expenses.ts`](../../eco-sudar-control/src/lib/api/expenses.ts)
**Backend:** [`api/controllers/admin/AdminExpenseController.php`](../../api/controllers/admin/AdminExpenseController.php)
**DB table:** `expenses` (see migration file)

---

## Data model

```
expenses (
  expense_id     INT PRIMARY KEY AUTO_INCREMENT,
  expense_code   VARCHAR(20) UNIQUE,      -- EXP-0001
  expense_date   DATE,
  category       VARCHAR(80),
  vendor         VARCHAR(150),
  description    TEXT NULL,
  amount         DECIMAL(12,2),
  payment_mode   ENUM('Cash','Bank Transfer','UPI','Cheque','Card'),
  bill_url       VARCHAR(500) NULL,
  created_by     INT NULL  → users.user_id,
  created_at     TIMESTAMP,
  updated_at     TIMESTAMP ON UPDATE
)
```

`expense_code` is auto-generated on insert (`EXP-` + zero-padded row count).

---

## Endpoints

### `GET /admin/expenses`
Paginated list with filters.

Query params: `page`, `limit` (max 200, default 50), `category`, `vendor` (LIKE), `payment_mode`, `from` (YYYY-MM-DD), `to`, `search` (matches vendor/description/code).

Response (`200`):
```json
{
  "success": true,
  "data": [
    {
      "expense_id": 9,
      "expense_code": "EXP-0009",
      "expense_date": "2026-04-03",
      "category": "Raw Materials - Wood Powder",
      "vendor": "Sri Lakshmi Traders",
      "description": "Wood powder 3 tons",
      "amount": 38500,
      "payment_mode": "Bank Transfer",
      "bill_url": null,
      "created_by": null,
      "created_at": "2026-04-03 10:00:00",
      "updated_at": null
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 14, "total_pages": 1 }
}
```

### `GET /admin/expenses/categories`
Returns distinct `category` values (string array) for the category dropdown.

### `GET /admin/expenses/{id}`
Single expense lookup by numeric id.

### `POST /admin/expenses`
Create. **Required:** `expense_date`, `category`, `vendor`, `amount`, `payment_mode`. Optional: `description`, `bill_url`.

Example body:
```json
{
  "expense_date": "2026-04-22",
  "category": "Office Stationery",
  "vendor": "Krishna Stationers",
  "description": "Printer ink",
  "amount": 2400,
  "payment_mode": "UPI"
}
```

### `PUT /admin/expenses/{id}`
Partial update. Any of the create fields can be sent.

### `DELETE /admin/expenses/{id}`
Hard delete (no order linkage to worry about).

### `POST /admin/expenses/extract-bill`
AI-powered bill scanner. Accepts a base64 data-URI image and returns pre-filled expense fields.

**Body:**
```json
{ "image": "data:image/jpeg;base64,/9j/4AAQ..." }
```

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "date": "2026-04-18",
    "vendor": "Sri Lakshmi Traders",
    "amount": 28500,
    "category": "Raw Material",
    "description": "Purchased 2 tonnes of wood powder from a biomass raw-material supplier for use in pellet production. Payment made via bank transfer.",
    "fallback": false
  }
}
```

When Groq quota is exhausted the response is `200` with `"fallback": true` — the frontend then switches to Tesseract.js in-browser OCR.

---

## Bill Extraction — Hybrid AI Flow

**File:** [`eco-sudar-control/src/lib/api/billExtract.ts`](../../eco-sudar-control/src/lib/api/billExtract.ts)

```
Upload bill image
      │
      ▼
POST /admin/expenses/extract-bill
      │
      ├── success (fallback: false) ──▶ fill form from Groq Llama 4 Scout Vision
      │
      └── fallback: true (quota)  ──▶ Tesseract.js in-browser OCR
                                          │
                                          ├─ extractAmount()  (labeled totals → currency symbols → max number)
                                          ├─ extractDate()    (DD/MM/YYYY, YYYY-MM-DD, DD/MM/YY)
                                          ├─ extractVendor()  (first meaningful line in top 8 lines)
                                          └─ guessCategory()  (keyword frequency scoring across 16 categories)
```

**Backend (Groq):**
- Model: `meta-llama/llama-4-scout-17b-16e-instruct` via `api.groq.com/openai/v1/chat/completions`
- `response_format: { type: "json_object" }` forces clean JSON output
- Temperature 0.1 for consistent extraction
- API key: `GROQ_API_KEY` constant from `api/config/database.php`
- Timeout: 25 seconds
- On HTTP 429 → returns `fallback: true` (frontend switches to Tesseract)
- On any other non-200 → returns `502`

**Frontend fallback (Tesseract.js):**
- Loaded lazily via dynamic `import("tesseract.js")`
- PSM mode 11 (Sparse Text) — best for receipts without a fixed layout
- 16-category keyword scoring for category assignment
- Largest labeled total is picked as amount; falls back to max number > 10 if no label found
- A debug toast shows what Tesseract extracted so the admin can verify

**Categories supported by the AI prompt (and Tesseract keyword map):**

`Fuel & Transport` · `Utilities` · `Office Stationery` · `Raw Material` · `Maintenance & Repairs` · `Salary & Wages` · `Marketing` · `Food & Hospitality` · `Logistics & Freight` · `Professional Services` · `IT & Software` · `Equipment Purchase` · `Printing & Packaging` · `Bank Charges` · `Taxes & Compliance` · `Miscellaneous`

---

## Validation rules

| Field | Rule |
|---|---|
| `expense_date` | `YYYY-MM-DD`, must parse |
| `amount` | positive number, ≤ 10,000,000 |
| `payment_mode` | one of: Cash, Bank Transfer, UPI, Cheque, Card |
| `category` / `vendor` | ≥ 2 characters |

---

## Error codes

| Code | Meaning |
|---|---|
| 400 | Invalid id or no fields to update |
| 401 | Missing/invalid admin token |
| 404 | Expense not found |
| 422 | Validation failure (including missing `image` on extract-bill) |
| 502 | Groq API error or unparseable response |
| 503 | `GROQ_API_KEY` not configured on server |

---

## UI flow

1. Page loads → `expensesApi.list()` hits `GET /admin/expenses?limit=200`.
2. "Add Expense" → form opens. Admin can upload a bill image.
3. "Extract" button → `extractBillData(imageDataUrl)` in `billExtract.ts` calls `POST /admin/expenses/extract-bill`; on Groq quota exhaustion, falls back to Tesseract.js. Form fields are pre-filled; admin reviews and corrects before saving.
4. Submit → `expensesApi.create(...)` → `POST /admin/expenses`.
5. Edit inline → `expensesApi.update(code, patch)` — looks up numeric id by `expense_code` then `PUT /admin/expenses/{id}`.
6. Delete → `expensesApi.remove(code)` → `DELETE /admin/expenses/{id}`.
