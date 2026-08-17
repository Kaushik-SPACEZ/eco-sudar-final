# Change: api/models/Task.php

**Type:** New file created
**Date:** 2026-04-23
**Module:** Tasks & Performance

---

## What This File Is

`api/models/Task.php` is the data-access layer for the `tasks` table. It was created to centralise all SQL for tasks in one place — previously the controller had inline SQL queries scattered across multiple methods. Creating the model made `AdminTaskController.php` consistent with how Employee, Attendance and Payroll controllers work.

---

## Constants Defined

Two public constants are defined here and referenced by the controller:

- `VALID_STATUSES` — array of allowed task status values: `Pending`, `In Progress`, `Completed`, `Blocked`
- `VALID_PRIORITIES` — array of allowed priority values: `Low`, `Medium`, `High`, `Critical`

These are declared on the model so that both the controller and any future validation code pull from a single source of truth.

---

## Methods

### `all(array $filters = []): array`

Fetches all tasks from the database with optional filtering. Supports three filter keys:

- `status` — validated against `VALID_STATUSES` before using in WHERE clause
- `assignee` — filters by `assignee_id` column
- `priority` — validated against `VALID_PRIORITIES`
- `month` — matches `DATE_FORMAT(created_at, '%Y-%m')`, validated with regex `/^\d{4}-\d{2}$/`

Results are ordered by `created_at DESC`. Filters are composed with `AND`, starting from `1=1` so the WHERE clause is always valid even when no filters are passed.

### `findByKey(string $key): ?array`

Looks up a single task row by its `task_key` (e.g. `TSK-001`). Returns `null` if not found. Used by almost every controller method after a mutation to return the updated state.

### `byEmployee(string $employeeKey): array`

Returns all tasks assigned to a specific employee, ordered by `created_at DESC`. Used by the `byEmployee()` route (`GET /admin/tasks/employee/{id}`).

### `create(array $data): int`

Inserts a new task row. Auto-generates the `task_key` by counting existing tasks and zero-padding: `TSK-` + the next sequential number. Returns the sequential number (not the auto-increment `task_id`) so the controller can reconstruct the task key immediately without a second query.

Tags are accepted as an array and stored as JSON in the `tags` column.

Required fields in `$data`: `title`, `assigneeId`, `dueDate`, `priority`, `status`. Optional: `description`, `assignedBy`, `tags`.

### `format(array $row): array`

Converts a raw database row (snake_case columns) into the camelCase shape the frontend expects:

- `task_key` → `id`
- `assignee_id` → `assigneeId`
- `assigned_by` → `assignedBy`
- `due_date` → `dueDate`
- `completed_at` → `completedAt` (ISO 8601 string or null)
- `created_at` → `createdAt` (ISO 8601 string)
- `tags` → JSON-decoded array (empty array if null)

### `comments(string $taskKey): array`

Fetches all comments for a task from `task_comments`, ordered by `created_at ASC` (chronological). Returns each comment shaped as `{ id, author, body, createdAt }`.

---

## How It Is Used

`AdminTaskController.php` imports this model via PHP's autoload-style require. Every method in the controller that needs task data calls these static methods instead of writing SQL directly. The controller constants reference `Task::VALID_STATUSES` and `Task::VALID_PRIORITIES` directly.
