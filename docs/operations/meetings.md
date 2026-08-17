# Meetings Module Documentation

## Overview
The Meetings module manages meeting records with RACI matrix and action items tracking.

## Database Tables

### meetings
- `meeting_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `title` (VARCHAR(200), NOT NULL)
- `date` (DATE, NOT NULL)
- `time` (TIME, NOT NULL)
- `location` (VARCHAR(200))
- `agenda` (TEXT)
- `notes` (TEXT)
- `attendees` (JSON) - Array of employee IDs
- `raci` (JSON) - RACI matrix assignments
- `action_items` (JSON) - Action items with owners and due dates
- `created_by` (INT, FOREIGN KEY to users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Endpoints

### GET /api/admin/meetings
List all meetings with optional filters.

**Query Parameters:**
- `from` - Filter by date from (YYYY-MM-DD)
- `to` - Filter by date to (YYYY-MM-DD)
- `attendee` - Filter by attendee employee ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "meeting_id": 1,
      "title": "Weekly Production Review",
      "date": "2026-04-28",
      "time": "10:00:00",
      "location": "Conference Room A",
      "agenda": "Review production targets",
      "notes": "Discuss bottlenecks",
      "attendees": ["EMP-001", "EMP-002"],
      "raci": [...],
      "action_items": [...],
      "created_at": "2026-04-24 10:00:00"
    }
  ]
}
```

### GET /api/admin/meetings/upcoming
Get upcoming meetings.

**Query Parameters:**
- `limit` - Number of meetings to return (default: 10)

### GET /api/admin/meetings/{id}
Get single meeting by ID.

### POST /api/admin/meetings
Create new meeting.

**Request Body:**
```json
{
  "title": "Weekly Production Review",
  "date": "2026-04-28",
  "time": "10:00",
  "location": "Conference Room A",
  "agenda": "Review production targets",
  "notes": "Discuss bottlenecks",
  "attendees": ["EMP-001", "EMP-002"],
  "raci": [
    {
      "id": "uuid",
      "deliverable": "Weekly Report",
      "assignments": {
        "EMP-001": "R",
        "EMP-002": "A"
      }
    }
  ],
  "action_items": [
    {
      "id": "act-001",
      "description": "Update dashboard",
      "ownerId": "EMP-001",
      "dueDate": "2026-04-30",
      "status": "Open"
    }
  ]
}
```

### PUT /api/admin/meetings/{id}
Update meeting.

### PUT /api/admin/meetings/{id}/attendees
Update only attendees list.

### DELETE /api/admin/meetings/{id}
Delete meeting.

## RACI Matrix

**Roles:**
- **R** - Responsible (does the work)
- **A** - Accountable (final authority)
- **C** - Consulted (provides input)
- **I** - Informed (kept updated)
- **-** - Not involved

## Action Items

**Statuses:**
- Open
- In Progress
- Done

## Frontend Components

### Files
- `eco-sudar-control/src/pages/Meetings.tsx` - Main meetings page
- `eco-sudar-control/src/lib/api/meetings.ts` - API client

### Features
- List all meetings
- Create new meetings
- View meeting details with RACI matrix
- Track action items
- Filter by date and attendee

## Backend Files

### Model
- `api/models/Meeting.php` - Meeting model with static methods

### Controller
- `api/controllers/admin/AdminMeetingController.php` - Meeting endpoints

### Key Methods
- `Meeting::all($filters)` - Get all meetings
- `Meeting::findById($id)` - Get single meeting
- `Meeting::create($data)` - Create meeting
- `Meeting::update($id, $data)` - Update meeting
- `Meeting::delete($id)` - Delete meeting
- `Meeting::format($row)` - Format meeting data

## Sample SQL

```sql
INSERT INTO meetings (title, date, time, location, agenda, notes, attendees, raci, action_items, created_by, created_at) VALUES
('Weekly Production Review', '2026-04-28', '10:00:00', 'Conference Room A', 'Review production targets', 'Discuss bottlenecks', '["EMP-001", "EMP-002"]', '[{"id": "uuid", "deliverable": "Weekly Report", "assignments": {"EMP-001": "R", "EMP-002": "A"}}]', '[{"id": "act-001", "description": "Update dashboard", "ownerId": "EMP-001", "dueDate": "2026-04-30", "status": "Open"}]', 37, NOW());
```

## Notes
- All dates must be in YYYY-MM-DD format
- All times must be in HH:MM or HH:MM:SS format
- Attendees, RACI, and action_items are stored as JSON
- RACI assignments use employee IDs as keys