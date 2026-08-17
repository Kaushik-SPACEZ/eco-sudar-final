# Change: database/tasks_migration.sql

**Type:** Existing file extended with task_comments table
**Date:** 2026-04-22 (tasks table), 2026-04-23 (task_comments table added)
**Module:** Tasks & Performance

---

## What Changed

The `tasks_migration.sql` file was originally created on Day 1 with only the `tasks` table definition. On Day 2, the `task_comments` table was appended to the same file to support the `POST /admin/tasks/{id}/comment` endpoint.

---

## Table: tasks (original)

Stores the master record for each task.

Columns:
- `task_id` — auto-increment primary key (internal use only)
- `task_key` — human-readable identifier in the format `TSK-001`, unique
- `title` — VARCHAR(255), required
- `description` — TEXT, optional
- `assignee_id` — VARCHAR(20), stores the `employee_key` of the assigned employee (e.g. `EMP-002`). Not a foreign key — tasks may be assigned to employees by key without requiring a hard DB relationship.
- `assigned_by` — VARCHAR(100), defaults to `'Admin'`
- `priority` — ENUM: `Low`, `Medium`, `High`, `Critical`; default `Medium`
- `status` — ENUM: `Pending`, `In Progress`, `Completed`, `Blocked`; default `Pending`
- `due_date` — DATE, required
- `tags` — JSON column, stores an array of tag strings (e.g. `["QC", "Daily"]`)
- `completed_at` — DATETIME, NULL until task is marked Completed; auto-set by the controller
- `created_at`, `updated_at` — auto-managed timestamps

Indexes on `status`, `assignee_id`, `due_date` for fast filter queries.

---

## Table: task_comments (added Day 2)

Stores comments attached to tasks. One task can have many comments.

Columns:
- `comment_id` — auto-increment primary key
- `task_key` — VARCHAR(20), FK to `tasks.task_key` with `ON DELETE CASCADE ON UPDATE CASCADE`
- `author` — VARCHAR(150), the name or email of who wrote the comment
- `body` — TEXT, the comment content; required, non-empty
- `created_at` — DATETIME, set to `NOW()` on insert; no `updated_at` since comments are immutable

Constraints:
- Foreign key on `task_key` references `tasks.task_key`
- `ON DELETE CASCADE` means all comments for a task are automatically removed when the task itself is deleted

Index on `task_key` for fast lookup when fetching comments for a task.

---

## Why task_comments References task_key Not task_id

The `task_key` (e.g. `TSK-001`) is used as the FK rather than the numeric `task_id`. This is consistent with how the rest of the application identifies tasks — the API uses `task_key` in every URL and response, and the controller looks up tasks by key. Using `task_key` as the FK means the comment table can be queried directly by key without a join to find the internal ID first.
