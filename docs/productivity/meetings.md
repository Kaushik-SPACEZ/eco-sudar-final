# Meetings Module

**UI file:** [`eco-sudar-control/src/pages/Meetings.tsx`](../../eco-sudar-control/src/pages/Meetings.tsx)
**API module:** [`eco-sudar-control/src/lib/api/meetings.ts`](../../eco-sudar-control/src/lib/api/meetings.ts)
**Backend:** [`api/controllers/admin/AdminMeetingController.php`](../../api/controllers/admin/AdminMeetingController.php)
**DB table:** `meetings`, `meeting_attendees`

---

## Scope

Schedule, track, and manage internal team meetings. Supports attendee management and pagination.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `GET /admin/meetings`
List all meetings with pagination and optional date/attendee filters.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `from` | `YYYY-MM-DD` | Start date filter |
| `to` | `YYYY-MM-DD` | End date filter |
| `attendee` | string | Filter by attendee name/ID |
| `page` | int | Default: 1 |
| `limit` | int | Default: 50 |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "data": [ { "id": 1, "title": "Weekly Sync", "date": "2026-04-25", ... } ],
    "pagination": { "page": 1, "limit": 50, "total": 5, "total_pages": 1 }
  }
}
```

> **Note:** The response wraps the array in a second `data` key — `response.data.data` is the meetings array. See Frontend API notes below.

---

### `GET /admin/meetings/upcoming`
Get the next N upcoming meetings (ordered by date ASC).

**Query param:** `?limit=10` (default: 10)

**Response `200`:** `{ "success": true, "data": [ ...meetings ] }`

---

### `GET /admin/meetings/{id}`
Single meeting by ID including attendees.

---

### `POST /admin/meetings`
Create a new meeting.

**Body:**
```json
{
  "title": "Q2 Planning",
  "description": "Review targets for Q2",
  "date": "2026-05-01",
  "time": "10:00",
  "duration": 60,
  "location": "Conference Room A",
  "attendees": ["EMP-001", "EMP-002"]
}
```

**Response `201`:** Created meeting object.

---

### `PUT /admin/meetings/{id}`
Update meeting details.

---

### `PUT /admin/meetings/{id}/attendees`
Replace the full attendee list for a meeting.

**Body:** `{ "attendees": ["EMP-001", "EMP-003"] }`

---

### `DELETE /admin/meetings/{id}`
Delete a meeting and its attendees.

---

## Frontend API (`meetings.ts`)

| Method | Real backend call |
|---|---|
| `getAll(filters?)` | `GET /admin/meetings` → `response.data.data` (double-unwrap due to nested shape) |
| `getUpcoming(limit?)` | `GET /admin/meetings/upcoming` → `response.data` |
| `getById(id)` | `GET /admin/meetings/{id}` → `response.data` |
| `create(data)` | `POST /admin/meetings` → `response.data` |
| `update(id, data)` | `PUT /admin/meetings/{id}` → `response.data` |
| `updateAttendees(id, attendees)` | `PUT /admin/meetings/{id}/attendees` → `response.data` |
