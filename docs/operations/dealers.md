# Dealers Module

**UI file:** [`eco-sudar-control/src/pages/Dealers.tsx`](../../eco-sudar-control/src/pages/Dealers.tsx)
**API module:** [`eco-sudar-control/src/lib/api/dealers.ts`](../../eco-sudar-control/src/lib/api/dealers.ts)
**Backend:** [`api/controllers/admin/AdminUserController.php`](../../api/controllers/admin/AdminUserController.php)
**DB table:** `users` (filtered by `user_type = 'dealer'`)

---

## Scope

Dealers are a sub-type of the `users` table. There is no separate `dealers` table — all dealer CRUD goes through `AdminUserController` with `user_type='dealer'` as a filter/default. This page lets admin staff create, view, edit, and deactivate dealer accounts, and reassign/reset their passwords.

---

## Endpoints

All routes require `Authorization: Bearer <admin_token>`.

### `GET /admin/users?user_type=dealer&limit=100`
List all dealers with order aggregate stats.

**Query params** (same as Customers — see [customers.md](customers.md)):

| Param | Example | Notes |
|---|---|---|
| `user_type` | `dealer` | Fixed to `dealer` for this page |
| `search` | `Raj` | Searches name, email, phone |
| `is_active` | `true` | Filter by account status |
| `sort` | `total_orders` | `created_at` / `name` / `total_orders` |
| `order` | `desc` | Sort direction |
| `page` | `1` | Pagination |
| `limit` | `100` | Max 100 |

**Response** `200`
```json
{
  "data": [
    {
      "user_id": 5,
      "name": "Rajesh Murugan",
      "email": "rajesh@greenleaf.com",
      "phone": "9876543210",
      "user_type": "dealer",
      "company_name": "GreenLeaf Distributors",
      "address": "12 Anna Salai",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "pincode": "600002",
      "udyam_number": "UDYAM-TN-01-0001234",
      "gst_number": "33ABCDE1234F1Z5",
      "is_active": true,
      "created_at": "2026-04-02 09:00:00",
      "total_orders": 7,
      "total_spent": 245000.00
    }
  ],
  "pagination": { "page": 1, "limit": 100, "total": 12, "total_pages": 1 }
}
```

---

### `POST /admin/users`
Create a new dealer (or customer) account as admin. Sends credential emails automatically.

**Body**
```json
{
  "user_type": "dealer",
  "name": "Suresh Pandian",
  "phone": "9988776655",
  "password": "Dealer@2024",
  "email": "suresh@biofuel.in",
  "company_name": "BioFuel Traders",
  "address": "Plot 7, SIDCO Estate",
  "city": "Coimbatore",
  "state": "Tamil Nadu",
  "pincode": "641021",
  "gst_number": "33ZZZZZ9999A1Z5",
  "udyam_number": "UDYAM-TN-09-0005678"
}
```

**Required fields:** `user_type`, `name`, `phone`, `password`

**Optional fields:** `email`, `company_name`, `address`, `city`, `state`, `pincode`, `gst_number`, `udyam_number`

If `email` is omitted, a placeholder `{phone}@noemail.ecosudar.local` is stored so the unique constraint is satisfied.

**Response** `201`
```json
{
  "success": true,
  "data": {
    "user_id": 23,
    "name": "Suresh Pandian",
    "email": "suresh@biofuel.in",
    "phone": "9988776655",
    "user_type": "dealer",
    "company_name": "BioFuel Traders",
    "is_active": true,
    "email_sent": true
  },
  "message": "User created successfully"
}
```

`email_sent: true` means the credential email was dispatched to the dealer. `email_sent: false` means no real email was provided, so only the admin copy was sent.

**Errors:**
- `422` — missing required fields, phone format invalid, password too short (< 6 chars)
- `409` — phone or email already registered

---

### `PUT /admin/users/{id}`
Update any user's profile. All fields are optional.

**Body**
```json
{
  "name": "Suresh P.",
  "company_name": "BioFuel Pvt Ltd",
  "city": "Tirupur",
  "gst_number": "33ZZZZZ9999A1Z5",
  "new_password": "NewPass@456"
}
```

**Updatable fields:** `name`, `email`, `phone`, `company_name`, `address`, `city`, `state`, `pincode`, `gst_number`, `udyam_number`, `new_password`

When `new_password` is provided (min 6 chars):
- Password is hashed with `password_hash()` (bcrypt)
- A "Password Changed" notification email is sent to the dealer (if real email) and a copy to the logged-in admin

**Response** `200`
```json
{ "success": true, "data": { "user_id": 23, ... }, "message": "User updated" }
```

**Errors:**
- `404` — user not found
- `422` — `new_password` shorter than 6 characters

---

### `PUT /admin/users/{id}/status`
Activate or deactivate a dealer account. Deactivated dealers cannot log in.

**Body**
```json
{ "is_active": false }
```

**Response** `200`
```json
{ "success": true, "data": { "user_id": 23, "is_active": false } }
```

**Errors:**
- `403` — cannot deactivate another admin account
- `404` — user not found

---

### `DELETE /admin/users/{id}`
Soft-deactivate (sets `is_active = 0`). Does **not** hard-delete the row — order history is preserved.

**Response** `200`
```json
{ "success": true, "message": "User deactivated successfully" }
```

---

## Email Flow

### On Create (`POST /admin/users`)

Two emails are dispatched via `@mail()` (PHP native, works on Hostinger):

| Recipient | Subject | Contains |
|---|---|---|
| Dealer (if real email given) | "Welcome to Eco Sudar – Your Login Credentials" | Name, company, phone (login), password |
| Logged-in admin (`request.user.email` from JWT) | "New Dealer Added – {name}" | Same info, labelled as admin copy |

### On Password Change (`PUT /admin/users/{id}` with `new_password`)

| Recipient | Subject | Contains |
|---|---|---|
| Dealer (if real email) | "Your Eco Sudar Password Has Been Changed" | Confirmation with new temporary password |
| Logged-in admin | "Password Changed – {name}" | Admin copy for record |

Emails are HTML-formatted with Eco Sudar green branding. Sending is fire-and-forget (`@mail()` suppresses errors) — the API response does not depend on mail success.

---

## Data Model

Dealers share the `users` table — distinguished only by `user_type = 'dealer'`.

### Dealer-relevant columns in `users`

| Column | Type | Notes |
|---|---|---|
| `user_id` | int | PK |
| `name` | varchar(100) | Contact person name |
| `email` | varchar(150) | Unique; placeholder if not provided |
| `phone` | varchar(15) | Unique; used as login identifier |
| `user_type` | enum | Fixed `dealer` for dealers |
| `company_name` | varchar(150) | Business/distribution company |
| `address` | text | Street address |
| `city` | varchar(60) | |
| `state` | varchar(60) | |
| `pincode` | varchar(10) | |
| `gst_number` | varchar(20) | GSTIN (optional at creation) |
| `udyam_number` | varchar(30) | Udyam registration (optional) |
| `is_active` | tinyint | `1` = active, `0` = deactivated |
| `password` | varchar | bcrypt hash |
| `created_at` | datetime | |

---

## Frontend Mapping (`eco-sudar-control/src/lib/api/dealers.ts`)

`mapApiDealerToUI(u: ApiDealer): DealerUIModel` maps the API row to the UI display shape:

| API field | UI field |
|---|---|
| `user_id` | `id` |
| `name` | `contactPerson` |
| `company_name` | `businessName` |
| `email` | `email` |
| `phone` | `phone` |
| `udyam_number` | `udyamNumber` |
| `address + city + state + pincode` | `address` (concatenated) |
| `city` | `city` |
| `pincode` | `pincode` |
| `total_orders` | `orders` |
| `is_active` | `status` (`"Active"` / `"Inactive"`) |
| — | `commission` (not yet in API — placeholder `0`) |

---

## UI Flow

| Action | API call |
|---|---|
| Page load | `fetchDealers()` → `GET /admin/users?user_type=dealer&limit=100` |
| Add dealer | `createDealer(form)` → `POST /admin/users` |
| Edit dealer | `updateDealer(id, form)` → `PUT /admin/users/{id}` |
| Deactivate | `deleteDealer(id)` → `DELETE /admin/users/{id}` then filter from local state |

The edit dialog renders a "New Password (optional)" field. If left blank, `new_password` is not sent and the existing password is unchanged.

---

## Known Constraints

- Dealers are not stored in a separate table — always filter with `user_type='dealer'` to avoid mixing with customers and admins
- `gst_number` is **not required** at admin creation (relaxed for dealers who are in onboarding). The public `/auth/register` endpoint enforces it
- A deactivated dealer's orders remain intact for reporting; `User::deactivate()` just flips `is_active = 0`
- The `commission` field shown in the UI has no backend storage yet — it defaults to `0` until a commission tracking table is added
