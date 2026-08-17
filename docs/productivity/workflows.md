# Workflows Module

**UI file:** [`eco-sudar-control/src/pages/Workflows.tsx`](../../eco-sudar-control/src/pages/Workflows.tsx)
**API module:** [`eco-sudar-control/src/lib/api/workflows.ts`](../../eco-sudar-control/src/lib/api/workflows.ts)
**Backend:** [`api/controllers/admin/AdminWorkflowController.php`](../../api/controllers/admin/AdminWorkflowController.php)
**DB table:** `workflows` (+ history table)

---

## Scope

Multi-stage business workflows (e.g. order processing, approval chains). Each workflow has a current stage; admin can transition it forward with notes. Full history of stage transitions is stored.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `GET /admin/workflows`
List all workflows with current stage and metadata.

**Response `200`:** `{ "success": true, "data": [ ...workflows ] }`

---

### `GET /admin/workflows/{id}`
Single workflow with full transition history.

---

### `POST /admin/workflows`
Create a new workflow.

**Body:**
```json
{
  "title": "Order #ORD-001 Processing",
  "type": "order",
  "reference_id": 1,
  "stages": ["Received", "Processing", "Quality Check", "Dispatched", "Delivered"]
}
```

**Response `201`:** Created workflow object.

---

### `POST /admin/workflows/{id}/transition`
Move the workflow to the next stage (or a specified stage).

**Body:**
```json
{
  "stage": "Quality Check",
  "notes": "Batch passed quality inspection."
}
```

**Response `200`:** Updated workflow with new current stage and recorded history entry.

---

### `DELETE /admin/workflows/{id}`
Delete a workflow and its history.

---

## Frontend API (`workflows.ts`)

| Method | Real backend call |
|---|---|
| `getAll()` | `GET /admin/workflows` → `response.data` |
| `getById(id)` | `GET /admin/workflows/{id}` → `response.data` |
| `create(data)` | `POST /admin/workflows` → `response.data` |
| `transition(id, { stage, notes })` | `POST /admin/workflows/{id}/transition` → `response.data` |
| `remove(id)` | `DELETE /admin/workflows/{id}` |
