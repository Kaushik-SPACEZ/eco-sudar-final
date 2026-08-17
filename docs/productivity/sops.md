# SOPs Module

**UI file:** [`eco-sudar-control/src/pages/Sops.tsx`](../../eco-sudar-control/src/pages/Sops.tsx)
**API module:** [`eco-sudar-control/src/lib/api/sops.ts`](../../eco-sudar-control/src/lib/api/sops.ts)
**Backend:** [`api/controllers/admin/AdminSopController.php`](../../api/controllers/admin/AdminSopController.php)
**DB table:** `sops` (+ versioning table)

---

## Scope

Standard Operating Procedures for each department. Supports versioning — SOPs go through draft → published lifecycle. Each department can have multiple SOPs; published version is the "current" one shown.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `GET /admin/sops`
List all SOPs (summary, no full content).

**Response `200`:** `{ "success": true, "data": [ ...sops ] }`

---

### `GET /admin/sops/categories`
List available department categories.

**Response `200`:** `{ "success": true, "data": ["Production", "Quality", "Sales", ...] }`

> **Route ordering:** `/admin/sops/categories` is registered **before** `/admin/sops/{id}` to prevent "categories" being captured as an `{id}` param.

---

### `GET /admin/sops/{id}`
Single SOP with all versions.

---

### `POST /admin/sops`
Create a new SOP (starts in draft).

**Body:**
```json
{
  "title": "Pellet Machine Operation",
  "department": "Production",
  "content": "Step 1: ...",
  "version": "1.0"
}
```

**Response `201`:** Created SOP object.

---

### `PUT /admin/sops/{id}`
Update SOP details or content (creates a new version draft).

---

### `POST /admin/sops/{id}/publish`
Approve the latest draft and set it as the current published version.

**Response `200`:** Updated SOP with `status: "published"`.

---

### `DELETE /admin/sops/{id}`
Delete an SOP and all its versions.

---

## Frontend API (`sops.ts`)

| Method | Real backend call |
|---|---|
| `getAll()` | `GET /admin/sops` → `response.data` |
| `getCategories()` | `GET /admin/sops/categories` → `response.data` |
| `getById(id)` | `GET /admin/sops/{id}` → `response.data` |
| `create(data)` | `POST /admin/sops` → `response.data` |
| `update(id, data)` | `PUT /admin/sops/{id}` → `response.data` |
| `publish(id)` | `POST /admin/sops/{id}/publish` → `response.data` |
| `remove(id)` | `DELETE /admin/sops/{id}` |
