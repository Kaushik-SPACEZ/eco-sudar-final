# Change: api/controllers/admin/AdminTaskController.php

**Type:** New file created, then refactored to use Task model
**Date:** 2026-04-22 (initial), 2026-04-23 (refactored)
**Module:** Tasks & Performance

---

## What This File Is

`AdminTaskController.php` handles all task-related HTTP requests under the `/admin/tasks` prefix. It was originally created with inline SQL for basic CRUD (list, create, update, delete), then extended with 8 more endpoints, and finally refactored so all data access goes through `Task.php` model methods instead of raw SQL.

---

## Endpoints Handled

### GET /admin/tasks
Handler: `index()`

Lists all tasks. Reads three optional query params: `status`, `assignee`, `month`. Passes them through `array_filter()` to remove nulls, then calls `Task::all($filters)`. Maps each row through `Task::format()`.

### GET /admin/tasks/{id}
Handler: `show()`

Returns a single task by `task_key` plus its comments. Calls `Task::findByKey()` and `Task::comments()`. The comments are embedded in the response as a `comments` array.

### GET /admin/tasks/statistics
Handler: `statistics()`

Returns counts: `total`, `pending`, `in_progress`, `completed`, `blocked`, and `overdue`. Overdue is defined as tasks where `due_date < CURDATE()` and `status != 'Completed'`. All values are cast to `int`.

This route must be registered BEFORE `/admin/tasks/{id}` in `index.php` or the router will try to match `statistics` as a task key.

### GET /admin/tasks/performance
Handler: `performance()`

Accepts an optional `?month=YYYY-MM` query param. When provided, filters tasks by `DATE_FORMAT(t.created_at, '%Y-%m')`. Groups by `assignee_id` and calculates per-employee metrics:

- `completionRate` = completed / total
- `onTimeRate` = on-time completions / total completions (on-time = `completed_at` date <= `due_date`)
- `overdueRatio` = overdue / total
- `productivityScore` = `max(0, round((completionRate * 70 + onTimeRate * 30) * (1 - overdueRatio * 0.4)))`

This formula exactly matches the `computePerformance()` function in `tasks.ts` on the frontend.

### GET /admin/tasks/employee/{id}
Handler: `byEmployee()`

Returns all tasks for a specific employee key. Calls `Task::byEmployee()`.

### POST /admin/tasks
Handler: `store()`

Validates required fields: `title`, `assigneeId`, `dueDate`. Validates `priority` and `status` against the model constants. Calls `Task::create()` which returns the sequential number, reconstructs the `task_key`, then calls `Task::findByKey()` to return the full created task. Responds with HTTP 201.

### PUT /admin/tasks/{id} and PATCH /admin/tasks/{id}
Handler: `update()` (both verbs route here)

Full or partial update. Maps camelCase field names from the request body to snake_case DB column names. Accepts: `title`, `description`, `assigneeId`, `assignedBy`, `priority`, `status`, `dueDate`, `tags`. Tags are JSON-encoded before storing.

Auto-manages `completed_at`: if status changes to `Completed` and `completed_at` is currently null, sets `completed_at = NOW()`. If status changes away from `Completed`, sets `completed_at = NULL`.

### DELETE /admin/tasks/{id}
Handler: `destroy()`

Deletes the task row. Due to the `ON DELETE CASCADE` on `task_comments`, all comments for the task are automatically removed.

### PUT /admin/tasks/{id}/status
Handler: `updateStatus()`

Delegates to `applySingleField()` with `status` and `VALID_STATUSES`. Handles the same `completed_at` auto-management as the full update.

### PUT /admin/tasks/{id}/assign
Handler: `assign()`

Updates only the `assignee_id` column. Validates that `assigneeId` is provided and non-empty.

### PUT /admin/tasks/{id}/priority
Handler: `updatePriority()`

Delegates to `applySingleField()` with `priority` and `VALID_PRIORITIES`.

### POST /admin/tasks/{id}/comment
Handler: `addComment()`

Inserts a row into `task_comments`. Requires a non-empty `body`. `author` defaults to the authenticated admin's email from `$request->user['email']` if not provided in the request body. Responds with HTTP 201 and the created comment object.

---

## Private Helper

### `applySingleField(Request, string $field, array $validValues): void`

Used by `updateStatus()` and `updatePriority()`. Looks up the task, validates the value against the allowed list, then runs the targeted UPDATE. For status updates it also handles the `completed_at` timestamp logic. Returns the updated task after the operation.

---

## Key Design Decisions

The controller constants (`VALID_STATUSES`, `VALID_PRIORITIES`) reference `Task::VALID_STATUSES` and `Task::VALID_PRIORITIES` rather than re-defining the arrays. This ensures validation and storage always agree.

The `formatTask()` instance method is kept as a thin wrapper around `Task::format()` so that `[$this, 'formatTask']` callables still work in `applySingleField()`. The actual format logic lives in the model.
