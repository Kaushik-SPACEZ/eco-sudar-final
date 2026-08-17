# SOPs Module Documentation

## Overview
The SOPs (Standard Operating Procedures) module manages organizational procedures with version control and role-based access.

## Database Tables

### sops
- `sop_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `code` (VARCHAR(20), UNIQUE, NOT NULL) - e.g., "PROD-001"
- `title` (VARCHAR(200), NOT NULL)
- `department` (VARCHAR(100), NOT NULL)
- `description` (TEXT)
- `owner_id` (INT, FOREIGN KEY to users)
- `access_role` (VARCHAR(50)) - "All Staff", "Managers", "Department Only", "Admin Only"
- `tags` (JSON) - Array of tags
- `current_version_id` (INT, FOREIGN KEY to sop_versions)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### sop_versions
- `version_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `sop_id` (INT, FOREIGN KEY to sops)
- `version` (VARCHAR(20), NOT NULL) - e.g., "1.0", "1.1", "2.0"
- `uploaded_by` (INT, FOREIGN KEY to users)
- `file_name` (VARCHAR(255), NOT NULL)
- `file_size` (INT) - in bytes
- `change_log` (TEXT)
- `status` (ENUM: 'Draft', 'Pending Approval', 'Approved', 'Archived')
- `approved_by` (INT, FOREIGN KEY to users)
- `approved_at` (TIMESTAMP)
- `uploaded_at` (TIMESTAMP)

## API Endpoints

### GET /api/admin/sops
List all SOPs with optional filters.

**Query Parameters:**
- `department` - Filter by department
- `access_role` - Filter by access role
- `search` - Search by title, code, or tags

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "sop_id": 1,
      "code": "PROD-001",
      "title": "Production Line Setup Procedure",
      "department": "Production",
      "description": "Standard procedure for setting up production lines",
      "owner_id": 1,
      "owner_name": "John Doe",
      "access_role": "Department Only",
      "tags": ["production", "setup", "safety"],
      "current_version_id": "1",
      "current_version": "1.0",
      "version_status": "Approved",
      "file_name": "PROD-001_v1.0.pdf",
      "versions": [],
      "created_at": "2026-04-24 10:00:00"
    }
  ]
}
```

### GET /api/admin/sops/categories
Get available departments list.

### GET /api/admin/sops/{id}
Get single SOP with all versions.

### POST /api/admin/sops
Create new SOP.

**Request Body:**
```json
{
  "code": "PROD-001",
  "title": "Production Line Setup Procedure",
  "department": "Production",
  "description": "Standard procedure for setting up production lines",
  "owner_id": 1,
  "access_role": "Department Only",
  "tags": ["production", "setup", "safety"]
}
```

### PUT /api/admin/sops/{id}
Update SOP metadata.

### DELETE /api/admin/sops/{id}
Delete SOP and all its versions.

### POST /api/admin/sops/{id}/publish
Publish latest version (approve and set as current).

## Departments

- Procurement
- Production
- Quality Control
- Packing
- Sales
- Marketing
- Material Management
- HR
- Dispatch
- Service
- Customer Care

## Access Roles

- **All Staff** - Visible to all employees
- **Managers** - Visible to managers only
- **Department Only** - Visible to department members only
- **Admin Only** - Visible to admins only

## Version Statuses

- **Draft** - Work in progress
- **Pending Approval** - Awaiting approval
- **Approved** - Active and published
- **Archived** - Superseded by newer version

## Frontend Components

### Files
- `eco-sudar-control/src/pages/Sops.tsx` - Main SOPs page
- `eco-sudar-control/src/lib/api/sops.ts` - API client

### Features
- List SOPs by department
- Create new SOPs
- View SOP details with version history
- Upload new versions
- Approve/archive versions
- Search and filter

## Backend Files

### Model
- `api/models/Sop.php` - SOP model with static methods

### Controller
- `api/controllers/admin/AdminSopController.php` - SOP endpoints

### Key Methods
- `Sop::all($filters)` - Get all SOPs
- `Sop::findById($id)` - Get single SOP with versions
- `Sop::create($data)` - Create SOP
- `Sop::update($id, $data)` - Update SOP
- `Sop::delete($id)` - Delete SOP
- `Sop::addVersion($sopId, $data)` - Add new version
- `Sop::publish($sopId, $userId)` - Publish SOP
- `Sop::getDepartments()` - Get departments list
- `Sop::format($row)` - Format SOP data

## Sample SQL

```sql
-- Insert SOPs
INSERT INTO sops (code, title, department, description, owner_id, access_role, tags, created_at) VALUES
('PROD-001', 'Production Line Setup Procedure', 'Production', 'Standard procedure for setting up production lines', 1, 'Department Only', '["production", "setup"]', NOW()),
('QC-001', 'Quality Control Inspection Protocol', 'Quality Control', 'Detailed inspection checklist', 2, 'All Staff', '["quality", "inspection"]', NOW());

-- Insert SOP Versions
INSERT INTO sop_versions (sop_id, version, uploaded_by, file_name, file_size, change_log, status, uploaded_at) VALUES
(1, '1.0', 37, 'PROD-001_v1.0.pdf', 245760, 'Initial version', 'Approved', NOW()),
(2, '1.0', 37, 'QC-001_v1.0.pdf', 189440, 'Initial version', 'Approved', NOW());
```

## Notes
- Code must be unique and max 20 characters
- Title max 200 characters
- Tags are stored as JSON array
- Versions are tracked separately in sop_versions table
- Only one version can be current (published) at a time
- Publishing a version automatically approves it and sets it as current