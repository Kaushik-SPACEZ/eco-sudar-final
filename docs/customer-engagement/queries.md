# Customer Queries Module

**UI file:** [`eco-sudar-control/src/pages/Queries.tsx`](../../eco-sudar-control/src/pages/Queries.tsx)
**API module:** [`eco-sudar-control/src/lib/api/queries.ts`](../../eco-sudar-control/src/lib/api/queries.ts) — `queriesApi`
**Backend:** [`api/controllers/admin/AdminQueryController.php`](../../api/controllers/admin/AdminQueryController.php)
**DB table:** `queries`

---

## Scope

Manages customer support queries submitted through the mobile app. Admin can view all queries, reply to them (triggers an email to the customer), and update their status.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `GET /admin/queries`
List all queries with optional status filter and search. Paginated.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `page` | int | Default: 1 |
| `limit` | int | Default: 50, max: 100 |
| `status` | string | UI values: `New`, `In Progress`, `Resolved` |
| `search` | string | Searches `name`, `email`, `query_number` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
<<<<<<< HEAD
      "query_id": 1,
      "query_number": "QRY-20260424-001",
      "name": "Rajesh Kumar",
      "email": "rajesh@example.com",
      "message": "When will my order be delivered?",
      "admin_reply": "",
      "status": "New",
      "created_at": "2026-04-24T10:30:00"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 12, "total_pages": 1 }
}
```

---

### `GET /admin/queries/{id}`
Single query by numeric `query_id`.

**Response `200`:** Single query object (same shape as list item).

---

### `PUT /admin/queries/{id}/reply`
Update admin reply and status. Sends an HTML email to the customer if `admin_reply` is non-empty.

**Body:**
```json
{
  "admin_reply": "Your order will be delivered by Thursday.",
  "status": "Resolved"
}
```

**Allowed statuses:** `New` · `In Progress` · `Resolved`

**Email:** Sent via `mail()` with HTML template (green Eco Sudar branding) quoting the original message and the admin reply.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "query_id": 1,
    "status": "Resolved",
    "admin_reply": "Your order will be delivered by Thursday."
  },
  "message": "Query updated and response emailed to customer"
}
```

---

## Status Mapping

| DB value | UI value |
|---|---|
| `pending` | `New` |
| `in_progress` | `In Progress` |
| `resolved` | `Resolved` |

> **Important:** `queries.status` must be `VARCHAR(20)`, not `ENUM`. The value `in_progress` is not in the legacy ENUM list and would be silently dropped. Run `database/migrations/2026_04_24_fix_status_enums.sql` if the column is still ENUM.

---

## Frontend API (`queries.ts` — `queriesApi`)

| Method | Call |
|---|---|
| `list()` | `GET /admin/queries?limit=100` → `.data` |
| `reply(queryId, adminReply, status)` | `PUT /admin/queries/{id}/reply` |

---

## UI Features

- Table of all queries with status badge and date
- Side panel / dialog to view full message and write reply
- Status dropdown updates saved on reply submit
- Toast confirms reply sent
=======
      "id": "1",
      "query_id": 1,
      "user_id": null,
      "query_number": "QRY-2026-0001",
      "name": "Guest User",
      "email": "guest@example.com",
      "message": "This is a test guest query.",
      "admin_reply": null,
      "status": "pending",
      "created_at": "2026-04-20 18:42:45"
    }
  ]
}
```

### GET /api/admin/queries/{id}
Get single query by ID.

### POST /api/admin/queries
Create new query (usually from customer portal).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I need help with my order",
  "user_id": 1
}
```

### PUT /api/admin/queries/{id}
Update query (add admin reply or change status).

**Request Body:**
```json
{
  "admin_reply": "Thank you for contacting us. We will process your request.",
  "status": "resolved"
}
```

### DELETE /api/admin/queries/{id}
Delete query.

## Query Statuses

- **pending** - New query, awaiting response
- **resolved** - Query answered and closed

## Query Number Format

Format: `QRY-YYYY-NNNN`
- QRY - Prefix
- YYYY - Year
- NNNN - Sequential number (0001, 0002, etc.)

## Frontend Components

### Files
- `eco-sudar-control/src/pages/Queries.tsx` - Main queries page
- `eco-sudar-control/src/lib/api/queries.ts` - API client

### Features
- List all queries
- Filter by status
- Search by query number, name, or email
- View query details
- Add admin reply
- Mark as resolved
- Delete queries

## Backend Files

### Model
- `api/models/Query.php` - Query model with static methods

### Controller
- `api/controllers/admin/AdminQueryController.php` - Query endpoints

### Key Methods
- `Query::all($filters)` - Get all queries
- `Query::findById($id)` - Get single query
- `Query::create($data)` - Create query
- `Query::update($id, $data)` - Update query (add reply)
- `Query::delete($id)` - Delete query
- `Query::generateQueryNumber()` - Generate unique query number
- `Query::format($row)` - Format query data

## Sample SQL

```sql
INSERT INTO query (user_id, query_number, name, email, message, admin_reply, status, created_at) VALUES
(NULL, 'QRY-2026-0001', 'Guest User', 'guest@example.com', 'This is a test guest query.', NULL, 'pending', '2026-04-20 18:42:45'),
(NULL, 'QRY-2026-0002', 'Guest User', 'guest@example.com', 'This is a test guest query.', NULL, 'resolved', '2026-04-20 18:43:39'),
(5, 'QRY-2026-0003', 'Kaushik K', 'kaushikwork2001@gmail.com', 'nee yaaruda', NULL, 'pending', '2026-04-20 18:58:43'),
(5, 'QRY-2026-0004', 'Kaushik k', 'krishnakumar240372@gmail.com', 'Vaazhkaiyil aayiram thadaikallappa Thadaikkalum u...', NULL, 'pending', '2026-04-21 02:17:16'),
(6, 'QRY-2026-0005', 'Naresh', 'naresh3112002@gmail.com', 'Hi', 'koramagalaknafknln', 'resolved', '2026-04-22 07:40:07');
```

## Notes
- Query number is auto-generated and unique
- user_id is NULL for guest queries (non-registered users)
- admin_reply is NULL until admin responds
- Status defaults to 'pending'
- Email is required for response notifications
>>>>>>> origin/final
