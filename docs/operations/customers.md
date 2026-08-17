# Customers Module

**Base URL**: `https://api.ecosudar.com/api`  
**Admin prefix**: `/admin/users` — Requires `Authorization: Bearer <admin_token>` with role `admin`

---

## Endpoints

### `GET /admin/users`
List all users (customers + dealers) with order stats.

**Query Params**

| Param | Type | Example | Notes |
|---|---|---|---|
| `user_type` | string | `customer` / `dealer` / `admin` | Filter by type |
| `is_active` | boolean | `true` / `false` | Filter by active status |
| `search` | string | `Rajesh` | Searches name, email, phone |
| `sort` | string | `created_at` / `name` / `total_orders` | Default: `created_at` |
| `order` | string | `asc` / `desc` | Default: `desc` |
| `page` | int | `1` | Pagination |
| `limit` | int | `50` | Max 100 |

**Response** `200`
```json
{
  "data": [
    {
      "user_id": 1,
      "name": "Rajesh Kumar",
      "email": "rajesh@example.com",
      "phone": "9876543210",
      "user_type": "customer",
      "city": "Chennai",
      "is_active": true,
      "created_at": "2026-04-15 10:00:00",
      "total_orders": 3,
      "total_spent": 4250.00
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "total_pages": 3 }
}
```

---

### `PUT /admin/users/{id}/status`
Activate or deactivate a user account. Cannot deactivate another admin.

**Body**
```json
{ "is_active": false }
```

**Response** `200`
```json
{ "success": true, "data": { "user_id": 1, "is_active": false } }
```

---

### `GET /users/{id}`
Get a single user's profile (owner or admin).

### `GET /users/{userId}/orders`
Get paginated order history for a specific user.

### `PUT /users/{id}`
Update user profile fields (name, phone, address, city, state, pincode).

### `DELETE /users/{id}`
Deactivate (soft-delete) a user account.

---

## Data Model

### `users` table (relevant columns)

| Column | Type | Notes |
|---|---|---|
| `user_id` | int | PK |
| `name` | varchar | Full name |
| `email` | varchar | Unique |
| `phone` | varchar | Unique |
| `user_type` | enum | `customer` / `dealer` / `admin` |
| `company_name` | varchar | Dealers only |
| `city` | varchar | |
| `is_active` | tinyint | `1` = active, `0` = deactivated |
| `created_at` | datetime | Registration date |

---

## UI Mapping (`Customers` page)

| API field | UI column |
|---|---|
| `name` | Customer Name |
| `email` | Email |
| `phone` | Phone |
| `user_type` | Type badge (Customer / Dealer) |
| `city` | City |
| `total_orders` | Orders count |
| `total_spent` | Total Spent |
| `is_active` | Active status toggle |
| `created_at` | Joined date |

---

## Known Constraints

- `user_type = 'admin'` accounts **cannot** be deactivated via the admin panel
- The listing endpoint joins `orders` to compute `total_orders` and `total_spent` — these are aggregate counts, not stored fields
- Search is `LIKE`-based across name + email + phone simultaneously

---

## Technical TODOs

The frontend `Customers.tsx` interface expects some granular data that isn't currently returned by the `GET /admin/users` API. We currently use `0` or `—` for these fields. 

To achieve full 1:1 parity with the UI design, the backend should be updated to return:
- **Granular Order Stats**: `activeOrders`, `deliveredOrders`, `cancelledOrders`. This requires tweaking the SQL grouping in `AdminUserController.php` to count based on `o.order_status`.
- **Address Details**: Right now only `city` is returned. Expand the query to return full `deliveryAddress` and `pincode` (from the `users` table, or from the most recent order's `delivery_address`).
- **Reset Password API**: The frontend "Reset Password" button is just a UI placeholder. A `POST /admin/users/{id}/send-reset-email` endpoint needs to be implemented.
