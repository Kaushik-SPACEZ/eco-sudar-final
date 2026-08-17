# Change: eco-sudar-control/src/lib/api/tasks.ts

**Type:** Existing file modified — real API paths updated, PerformanceRow type exported
**Date:** 2026-04-22
**Module:** Frontend — Tasks API Layer

---

## What Changed

`tasks.ts` already existed. Two changes were made:

1. The four real API path strings were updated to use the `/admin/tasks` prefix
2. The `PerformanceRow` type was added as an export so `Tasks.tsx` could import it for typed state

---

## Paths Updated

All four real-API paths (inside `if (MOCK_MODE) { ... } else { ... }` blocks) were updated from placeholder paths to the actual backend routes:

### `tasksApi.list()`
Before: `/tasks`
After: `/admin/tasks`

### `tasksApi.create()`
Before: `/tasks`
After: `/admin/tasks`

### `tasksApi.update()`
Before: `/tasks/${id}`
After: `/admin/tasks/${id}` with method PATCH

### `tasksApi.remove()`
Before: `/tasks/${id}`
After: `/admin/tasks/${id}` with method DELETE

---

## Type Added: PerformanceRow

```typescript
export interface PerformanceRow {
  employeeId: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  onTime: number;
  completionRate: number;   // 0..1
  onTimeRate: number;       // 0..1
  productivityScore: number; // 0..100
}
```

This type is used by `Tasks.tsx` for the performance tab state variables. It also matches the shape returned by the backend `GET /admin/tasks/performance` endpoint when `MOCK_MODE` is switched off.

---

## computePerformance() Function

This utility function was already present in the file. It calculates performance scores on the frontend from a task list and a list of employee IDs. The formula is:

- `completionRate` = completed / total
- `onTimeRate` = on-time completions / total completions
- `overdueRatio` = overdue / total
- `productivityScore` = `max(0, round((completionRate * 70 + onTimeRate * 30) * (1 - overdueRatio * 0.4)))`

This formula is identical to the one in `AdminTaskController::performance()` on the backend. When `MOCK_MODE = false`, the frontend can switch to calling `GET /admin/tasks/performance` and get the same scores from the server, or keep computing client-side — either approach produces the same result.

---

## Mock Data

10 realistic mock tasks are defined covering common Bio Energy LLP operations: QC checks, dispatch, sales follow-ups, maintenance, training. Statuses span all four allowed values. Tags, due dates and assignee IDs are set up to produce meaningful performance scores when `computePerformance()` runs.
