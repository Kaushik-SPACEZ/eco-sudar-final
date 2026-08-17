# Tasks & Performance Module

**UI file:** [`eco-sudar-control/src/pages/Tasks.tsx`](../../eco-sudar-control/src/pages/Tasks.tsx)
**API module:** [`eco-sudar-control/src/lib/api/tasks.ts`](../../eco-sudar-control/src/lib/api/tasks.ts) — `tasksApi`, `computePerformance`
**Backend:** [`api/controllers/admin/AdminTaskController.php`](../../api/controllers/admin/AdminTaskController.php)
**Model:** [`api/models/Task.php`](../../api/models/Task.php)
**DB tables:** `tasks`, `task_comments`

---

## Scope

Assigns and tracks work items for employees. Admins create tasks with priority, due date, and assignee. Tasks move through statuses (`Pending → In Progress → Completed / Blocked`). A Performance tab ranks employees by a productivity score computed from completion rate, on-time rate, and overdue ratio. Comments can be added to any task.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

> **Route ordering:** Static sub-paths (`/performance`, `/statistics`, `/employee/{id}`) are registered **before** the dynamic `/{id}` route — the router matches in registration order.

---

### `GET /admin/tasks`
List all tasks. Supports filters.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `status` | string | `Pending / In Progress / Completed / Blocked` |
| `assignee` | string | `EMP-001` |
| `priority` | string | `Low / Medium / High / Critical` |
| `month` | `YYYY-MM` | Filter by `created_at` month |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id":          "TSK-001",
      "title":       "Inspect Line A briquette press",
      "description": "Daily QC check on press #2 and log readings.",
      "assigneeId":  "EMP-001",
      "assignedBy":  "Admin",
      "priority":    "High",
      "status":      "Completed",
      "dueDate":     "2026-04-22",
      "tags":        ["QC", "Daily"],
      "completedAt": "2026-04-22T10:15:00+05:30",
      "createdAt":   "2026-04-20T08:00:00+05:30"
    }
  ]
}
```

---

### `POST /admin/tasks`
Create a new task. `task_key` (`TSK-XXX`) is auto-generated from the row count.

**Body:**
```json
{
  "title":       "Weekly QC report",
  "description": "Compile last week's QC findings.",
  "assigneeId":  "EMP-002",
  "assignedBy":  "Admin",
  "priority":    "Low",
  "status":      "Pending",
  "dueDate":     "2026-04-28",
  "tags":        ["Reporting"]
}
```

**Required:** `title`, `assigneeId`, `dueDate`.

**Response `201`:** Created task object.

**Errors:** `422` — missing required field, invalid priority/status.

---

### `PATCH /admin/tasks/{id}` / `PUT /admin/tasks/{id}`
Partial or full update by `task_key`.

**Updatable fields:** `title`, `description`, `assigneeId`, `assignedBy`, `priority`, `status`, `dueDate`, `tags`.

**Auto-managed:**
- Setting `status = "Completed"` → `completed_at = NOW()` (if not already set).
- Setting any other status → `completed_at = NULL`.

**Response `200`:** Updated task object.

---

### `DELETE /admin/tasks/{id}`
Hard delete by `task_key`. Cascades to `task_comments`.

**Response `200`:** `{ "success": true, "data": null, "message": "Task deleted" }`

---

### `GET /admin/tasks/{id}`
Single task with `comments[]` array included.

**Response `200`:**
```json
{
  "data": {
    "id": "TSK-001",
    …,
    "comments": [
      { "id": 1, "taskId": "TSK-001", "author": "Admin", "body": "Completed ahead of schedule.", "createdAt": "…" }
    ]
  }
}
```

---

### `PUT /admin/tasks/{id}/status`
Update status only.

**Body:** `{ "status": "In Progress" }`

**Valid values:** `Pending` · `In Progress` · `Completed` · `Blocked`

---

### `PUT /admin/tasks/{id}/assign`
Reassign to a different employee.

**Body:** `{ "assigneeId": "EMP-003" }`

---

### `PUT /admin/tasks/{id}/priority`
Update priority only.

**Body:** `{ "priority": "Critical" }`

**Valid values:** `Low` · `Medium` · `High` · `Critical`

---

### `POST /admin/tasks/{id}/comment`
Add a comment to a task.

**Body:** `{ "body": "Parts arrived, starting now.", "author": "Admin" }`

- `author` defaults to the authenticated user's email if omitted.

**Response `201`:** Comment object.

---

### `GET /admin/tasks/performance`
Server-side performance aggregates grouped by employee. Optionally scoped to a month.

**Query param:** `?month=YYYY-MM`

**Response `200`:**
```json
{
  "data": [
    {
      "employeeId":        "EMP-002",
      "total":             6,
      "completed":         4,
      "inProgress":        1,
      "pending":           1,
      "overdue":           0,
      "onTime":            3,
      "completionRate":    0.6667,
      "onTimeRate":        0.75,
      "productivityScore": 62
    }
  ]
}
```

---

### `GET /admin/tasks/statistics`
Global task counts.

**Response `200`:**
```json
{
  "data": { "total": 10, "pending": 3, "in_progress": 2, "completed": 4, "blocked": 1, "overdue": 2 }
}
```

---

### `GET /admin/tasks/employee/{id}`
All tasks assigned to one employee, newest first.

---

## Productivity Score Formula

```
completionRate = completed / total
onTimeRate     = onTime / completed
overdueRatio   = overdue / total

score = round( (completionRate × 70 + onTimeRate × 30) × (1 − overdueRatio × 0.4) )
        clamped to [0, 100]
```

A task is **on-time** if `completed_at::date ≤ due_date`. Overdue tasks that are still open reduce the score via the `overdueRatio` penalty.

The same formula runs in both the backend (`AdminTaskController::performance`) and the frontend (`computePerformance()` in `tasks.ts`) — client-side computation is used for the Performance tab in mock mode and when tasks are already loaded.

---

## Data Model

### `tasks` table

| Column | Type | Notes |
|---|---|---|
| `task_id` | int | PK, auto-increment |
| `task_key` | varchar | Unique — `TSK-001`, `TSK-002`, … |
| `title` | varchar | |
| `description` | text | |
| `assignee_id` | varchar | FK → `employees.employee_key` |
| `assigned_by` | varchar | Name/email of assigner |
| `priority` | enum | `Low / Medium / High / Critical` |
| `status` | enum | `Pending / In Progress / Completed / Blocked` |
| `due_date` | date | `YYYY-MM-DD` |
| `tags` | json | Array of strings stored as JSON |
| `completed_at` | datetime | Set automatically on status → `Completed`; cleared on any other status |
| `created_at` | datetime | Auto-set on INSERT |

### `task_comments` table

| Column | Type | Notes |
|---|---|---|
| `comment_id` | int | PK |
| `task_key` | varchar | FK → `tasks.task_key` |
| `author` | varchar | Admin email or display name |
| `body` | text | Comment content |
| `created_at` | datetime | |

---

## Frontend API (`tasks.ts` — `tasksApi`)

| Method | Real backend call | Mock behaviour |
|---|---|---|
| `list()` | `GET /admin/tasks` → `.data` | Returns sorted `MOCK_TASKS` array |
| `create(data)` | `POST /admin/tasks` → `.data` | Appends to `MOCK_TASKS` with auto `TSK-XXX` id |
| `update(id, patch)` | `PATCH /admin/tasks/{id}` → `.data` | Merges patch in-memory; auto-manages `completedAt` |
| `remove(id)` | `DELETE /admin/tasks/{id}` | Filters from `MOCK_TASKS` |

All real-backend calls unwrap the `{ success, data, message }` envelope via `.data`.

---

## UI Features

| Feature | Detail |
|---|---|
| **Board view** | Kanban columns per status — cards show priority badge, assignee, due date, inline status dropdown |
| **List view** | Table with ID, title, tags, assignee, priority, status, due date, edit/delete actions |
| **Performance view** | Top-3 podium cards + full ranking table with completion %, on-time %, productivity score bar |
| **New Task dialog** | Create with title, description, assignee, due date, priority, status, tags |
| **Edit Task dialog** | Same dialog pre-filled; status change auto-manages `completedAt` |
| **Quick status** | Status dropdown on each board card — calls `tasksApi.update()` inline without opening dialog |
| **Delete confirmation** | `AlertDialog` before permanent removal |
| **Filters** | Search (title / tag / ID), status, priority, assignee — client-side on loaded tasks |
| **Overdue highlight** | Due date shown in `text-destructive` if past due and not completed |

---

## Error Codes

| Code | Meaning |
|---|---|
| `400` | No fields to update |
| `401` | Missing or invalid admin token |
| `404` | Task not found |
| `422` | Missing required field (`title`, `assigneeId`, `dueDate`) or invalid `priority` / `status` |
