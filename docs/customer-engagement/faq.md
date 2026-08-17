# FAQ Module

**UI file:** [`eco-sudar-control/src/pages/FAQ.tsx`](../../eco-sudar-control/src/pages/FAQ.tsx)
**API module:** [`eco-sudar-control/src/lib/api/faq.ts`](../../eco-sudar-control/src/lib/api/faq.ts) — `faqApi`
**Backend:** [`api/controllers/admin/AdminFaqController.php`](../../api/controllers/admin/AdminFaqController.php)
**DB table:** `faqs`

---

## Scope

Admin manages FAQ entries displayed in the mobile app. Supports create, update, toggle active/inactive, drag-and-drop reorder, and delete.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `GET /admin/faqs`
List all FAQs ordered by `sort_order ASC`, then `faq_id ASC`.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "faq_id": 1,
      "question": "What is the minimum order quantity?",
      "answer": "Minimum order is 50 kg.",
      "active": true,
      "sort_order": 10,
      "created_at": "2026-04-23T09:00:00"
    }
  ],
  "message": "FAQs retrieved"
}
```

---

### `POST /admin/faqs`
Create a new FAQ. `sort_order` is auto-set to `MAX(sort_order) + 10`.

**Body:**
```json
{
  "question": "Do you deliver pan-India?",
  "answer": "Yes, we deliver across Tamil Nadu and neighbouring states."
}
```

**Response `201`:** Newly created FAQ object.

> **Note:** Uses `Response::success($row, 'FAQ created', 201)` — not `Response::json()` which doesn't exist.

---

### `PUT /admin/faqs/reorder`
Bulk update sort order. Pass an ordered array of IDs; each gets `sort_order = (position + 1) * 10`.

> **Route ordering:** `/admin/faqs/reorder` is registered **before** `/admin/faqs/{id}` in `index.php` to prevent "reorder" being captured as an `{id}` param.

**Body:**
```json
{ "ids": [3, 1, 4, 2] }
```

**Response `200`:** `{ "success": true, "data": null, "message": "FAQ order saved" }`

---

### `PUT /admin/faqs/{id}`
Update one or more fields of a FAQ. All fields optional.

**Body (any subset):**
```json
{
  "question": "Updated question?",
  "answer": "Updated answer.",
  "active": false,
  "sort_order": 30
}
```

**Response `200`:** `{ "faq_id": 1 }`

---

### `DELETE /admin/faqs/{id}`
Delete a FAQ permanently.

**Response `200`:** `{ "success": true, "data": null, "message": "FAQ deleted" }`

---

## Data Model

### `faqs` table

| Column | Type | Notes |
|---|---|---|
| `faq_id` | int | PK, auto-increment |
| `question` | text | Required |
| `answer` | text | Required |
| `active` | tinyint(1) | 1 = visible in app |
| `sort_order` | int | Lower = first; auto-increments by 10 |
| `created_at` | datetime | |

---

## Frontend API (`faq.ts` — `faqApi`)

| Method | Call |
|---|---|
| `list()` | `GET /admin/faqs` → maps `faq_id → id`, `sort_order → sortOrder` |
| `create({ question, answer })` | `POST /admin/faqs` → returns `FAQ` |
| `update(id, patch)` | `PUT /admin/faqs/{id}` |
| `reorder(ids)` | `PUT /admin/faqs/reorder` with `{ ids }` |
| `remove(id)` | `DELETE /admin/faqs/{id}` |

---

## UI Features

- Full CRUD with inline edit dialog
- Active/inactive toggle per row (calls `faqApi.update()` with optimistic revert on error)
- Up/Down reorder buttons (local state swap + `faqApi.reorder()`)
- Sort order is always multiples of 10 to allow easy insertion
