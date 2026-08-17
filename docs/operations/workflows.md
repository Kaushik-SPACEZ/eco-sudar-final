# Workflows Module Documentation

## Overview
The Workflows module manages approval workflows and traffic management for various request types (purchase requests, leave requests, expense claims, etc.).

## Database Tables

### workflows
- `workflow_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `title` (VARCHAR(200), NOT NULL)
- `type` (VARCHAR(100), NOT NULL)
- `description` (TEXT)
- `requester_id` (INT, FOREIGN KEY to users)
- `approver_id` (INT, FOREIGN KEY to users)
- `priority` (ENUM: 'Low', 'Medium', 'High', 'Urgent')
- `amount` (DECIMAL(15,2)) - Optional monetary amount
- `due_date` (DATE)
- `stage` (ENUM: 'Pending', 'In Progress', 'Approved', 'Completed', 'Rejected')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### workflow_history
- `history_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `workflow_id` (INT, FOREIGN KEY to workflows)
- `actor_id` (INT, FOREIGN KEY to users)
- `from_stage` (VARCHAR(50)) - Previous stage (NULL for initial creation)
- `to_stage` (VARCHAR(50), NOT NULL) - New stage
- `note` (TEXT) - Optional comment/reason
- `created_at` (TIMESTAMP)

## API Endpoints

### GET /api/admin/workflows
List all workflows with optional filters.

**Query Parameters:**
- `type` - Filter by workflow type
- `stage` - Filter by current stage
- `priority` - Filter by priority
- `requester_id` - Filter by requester
- `approver_id` - Filter by approver

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "workflow_id": 1,
      "title": "Purchase Request - Raw Materials",
      "type": "Purchase Request",
      "description": "Request for purchasing raw materials",
      "requester_id": 1,
      "requester_name": "John Doe",
      "approver_id": 37,
      "approver_name": "Admin User",
      "priority": "High",
      "amount": 150000.00,
      "due_date": "2026-05-10",
      "stage": "Pending",
      "history": [],
      "created_at": "2026-04-24 10:00:00"
    }
  ]
}
```

### GET /api/admin/workflows/{id}
Get single workflow with complete history.

### POST /api/admin/workflows
Create new workflow.

**Request Body:**
```json
{
  "title": "Purchase Request - Raw Materials",
  "type": "Purchase Request",
  "description": "Request for purchasing raw materials for Q2 production",
  "requester_id": 1,
  "approver_id": 37,
  "priority": "High",
  "amount": 150000.00,
  "due_date": "2026-05-10"
}
```

### POST /api/admin/workflows/{id}/transition
Transition workflow to new stage.

**Request Body:**
```json
{
  "stage": "Approved",
  "note": "Budget approved for Q2 production"
}
```

### DELETE /api/admin/workflows/{id}
Delete workflow and its history.

### GET /api/admin/workflows/types
Get available workflow types.

### GET /api/admin/workflows/stages
Get available stages.

### GET /api/admin/workflows/priorities
Get available priorities.

## Workflow Types

- Purchase Request
- Leave Request
- Expense Claim
- Production Order
- Quality Hold Release
- Dispatch Approval
- Marketing Campaign
- Other

## Workflow Stages

- **Pending** - Initial state, awaiting review
- **In Progress** - Being processed
- **Approved** - Approved by authority
- **Completed** - Finished and closed
- **Rejected** - Denied/rejected

## Stage Transitions

**Allowed transitions:**
- Pending → In Progress, Approved, Rejected
- In Progress → Approved, Rejected
- Approved → Completed, Rejected
- Completed → (no further transitions)
- Rejected → Pending (resubmit)

## Priorities

- **Low** - Non-urgent, can wait
- **Medium** - Normal priority
- **High** - Important, needs attention
- **Urgent** - Critical, immediate action required

## Frontend Components

### Files
- `eco-sudar-control/src/pages/Workflows.tsx` - Main workflows page
- `eco-sudar-control/src/lib/api/workflows.ts` - API client

### Features
- Pipeline board view (Kanban-style)
- List view with filters
- Create new workflow requests
- Transition workflows through stages
- View complete history
- Filter by type, stage, priority
- Search functionality

## Backend Files

### Model
- `api/models/Workflow.php` - Workflow model with static methods

### Controller
- `api/controllers/admin/AdminWorkflowController.php` - Workflow endpoints

### Key Methods
- `Workflow::all($filters)` - Get all workflows
- `Workflow::findById($id)` - Get single workflow with history
- `Workflow::create($data)` - Create workflow
- `Workflow::transition($id, $toStage, $actorId, $note)` - Move to new stage
- `Workflow::delete($id)` - Delete workflow
- `Workflow::getHistory($workflowId)` - Get workflow history
- `Workflow::getTypes()` - Get workflow types
- `Workflow::getStages()` - Get stages
- `Workflow::getPriorities()` - Get priorities
- `Workflow::format($row)` - Format workflow data

## Sample SQL

```sql
-- Insert Workflows
INSERT INTO workflows (title, type, description, requester_id, approver_id, priority, amount, due_date, stage, created_at) VALUES
('Purchase Request - Raw Materials', 'Purchase Request', 'Request for purchasing raw materials for Q2 production', 1, 37, 'High', 150000.00, '2026-05-10', 'Pending', NOW()),
('Employee Leave Request', 'Leave Request', 'Annual leave request for summer vacation', 2, 37, 'Medium', NULL, '2026-06-01', 'Approved', NOW()),
('Marketing Campaign - Product Launch', 'Marketing Campaign', 'Social media campaign for new product line', 3, 37, 'Urgent', 75000.00, '2026-05-15', 'In Progress', NOW()),
('Production Order - Batch #2026-04', 'Production Order', 'Production order for 5000 units', 1, 37, 'High', 250000.00, '2026-05-20', 'Completed', NOW());

-- Insert Workflow History
INSERT INTO workflow_history (workflow_id, actor_id, from_stage, to_stage, note, created_at) VALUES
(1, 1, NULL, 'Pending', 'Workflow created - Urgent raw materials needed', NOW()),
(2, 2, 'Pending', 'Approved', 'Leave approved by manager', NOW()),
(3, 3, 'Pending', 'In Progress', 'Campaign design phase started', NOW()),
(4, 1, 'Approved', 'Completed', 'Production batch completed successfully', NOW());
```

## Notes
- Title max 200 characters
- Amount is optional (NULL for non-financial workflows)
- Due date is optional
- Stage transitions are tracked in workflow_history
- Each transition creates a history entry with actor and optional note
- Initial creation has from_stage = NULL
- History is ordered by created_at DESC (newest first)