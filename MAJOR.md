# EcoSudar — Critical Rules & Conventions

This file captures non-obvious decisions, gotchas, and rules that every developer must know before touching this codebase.

---

## 1. API Client — Response Envelope

Every PHP backend endpoint wraps its response in:
```json
{ "success": true, "data": <payload>, "message": "..." }
```

**`apiFetch` in `client.ts` does NOT auto-unwrap.** It returns the full envelope.  
Every API module must access `.data` explicitly:

```typescript
// CORRECT
const res = await apiFetch<{ data: User[] }>("/admin/employees");
return res.data ?? [];

// WRONG — returns undefined (common past bug)
const res = await apiFetch<User[]>("/admin/employees");
return res;  // ← this is { success, data, message }, not User[]
```

Paginated responses use `Response::paginated()` which has a different shape:
```json
{ "success": true, "data": [...], "pagination": { "page", "limit", "total", "total_pages" } }
```

---

## 2. Mobile App — Required Header

The mobile app **must** send `X-Client-Type: app` on all API requests.  
The backend reads this header on `/auth/login`, `/auth/register`, and `/auth/refresh` to decide token lifetimes.

```dart
// Dio (Flutter)
dio.options.headers['X-Client-Type'] = 'app';
```

| Header value | Access token | Refresh token |
|---|---|---|
| `app` | 30 days | 180 days |
| `web` (or absent) | 1 day | 7 days |

**The admin dashboard sends `X-Client-Type: web` automatically** via `client.ts` — do not change this.

---

## 3. Admin Dashboard — Session Expiry

The admin dashboard enforces a **1-day session** client-side:

- On login: `expires_at = Date.now() + 86400000` stored in `localStorage` key `eco_admin_auth`
- On page load: if `Date.now() > expires_at`, auth is cleared and login is shown
- On any `401` API response: `apiFetch` fires `eco:auth-expired` DOM event → `AuthContext` clears auth → login shown
- No silent token refresh — admin must re-login after 1 day

Mobile app sessions last indefinitely via refresh token rotation.

---

## 4. Email Sending (Hostinger)

Use `@mail()` (with `@` suppressor), not `mail()`. Plain `mail()` returns `false` on Hostinger even when the email queues successfully, causing false failure toasts.

```php
// CORRECT
@mail($to, $subject, $html, $headers);

// WRONG — returns false, breaks "email sent" logic
if (!mail($to, $subject, $html, $headers)) { ... }
```

Set `$emailSent = true` before calling `@mail()` — don't check the return value.

---

## 5. MySQL ENUM Columns — Silent Drop Bug

MySQL ENUM columns **silently discard** values not in the enum list instead of erroring.  
This caused quote/query status updates to be silently lost.

**Rule:** Use `VARCHAR(20)` for any status column, not `ENUM`.

Fixed columns (migration: `database/migrations/2026_04_24_fix_status_enums.sql`):
```sql
ALTER TABLE quotes  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE queries MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
```

---

## 6. Status Bidirectional Mapping

DB stores lowercase/snake_case statuses. UI shows title-case. Every controller has `toUiStatus()` and `toDbStatus()` helpers.

| Module | DB values | UI values |
|---|---|---|
| Queries | `pending`, `in_progress`, `resolved` | `New`, `In Progress`, `Resolved` |
| Quotes | `pending`, `contacted`, `quoted`, `closed` | `New`, `Contacted`, `Quoted`, `Closed` |
| Tasks | `Pending`, `In Progress`, `Completed` | same (no mapping needed) |
| Attendance | `Present`, `Half-day`, `Absent`, `Leave` | same |

---

## 7. Datetime — No Timezone Conversion

`api/config/app.php` sets `date_default_timezone_set('Asia/Kolkata')` globally.  
All DB datetimes are stored as `YYYY-MM-DD HH:MM:SS` **without** UTC offset.  
`Attendance::format()` returns `Y-m-d\TH:i:s` — no `+00:00` suffix.

**Rule:** Never construct a `new Date(isoString)` in the frontend for display-only time rendering. Read `HH:MM` directly with regex to avoid browser timezone shifts.

```typescript
// CORRECT — immune to UTC↔IST shift
const match = iso.match(/[T ](\d{2}:\d{2})/);

// WRONG — browser converts to local time, shifts by 5:30 if UTC is assumed
new Date(iso).toLocaleTimeString();
```

---

## 8. URLSearchParams — Filter Undefined Values

Never pass `undefined` values to `new URLSearchParams()`. It becomes the literal string `"undefined"`.

```typescript
// CORRECT
const clean = Object.fromEntries(
  Object.entries(params ?? {}).filter(([, v]) => v !== undefined)
) as Record<string, string>;
const qs = new URLSearchParams(clean).toString();

// WRONG — sends ?employeeId=undefined to the backend
const qs = new URLSearchParams(params as Record<string, string>).toString();
```

---

## 9. Router — Specific Routes Before Parameterised Routes

The PHP Router matches routes in registration order. Register specific paths **before** parameterised ones or the parameter will eat the literal segment.

```php
// CORRECT — /reorder is matched first
$router->put('/admin/faqs/reorder', ...);
$router->put('/admin/faqs/{id}',    ...);

// WRONG — "reorder" would be captured as {id}
$router->put('/admin/faqs/{id}',    ...);
$router->put('/admin/faqs/reorder', ...);
```

---

## 10. Response Class — Available Methods Only

`Response::json()` **does not exist**. Only these methods exist:

```php
Response::success($data, $message = 'Success', $code = 200);   // { success, data, message }
Response::error($message, $code = 400, $errors = null);         // { success, message }
Response::paginated($data, $pagination, $code = 200);           // { success, data, pagination }
Response::validationError($errors);                             // 422 shorthand
```

---

## 11. Settings Storage

Settings are key-value pairs in the `settings` table. Always use `upsert`:
```sql
INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
```

Fuel prices are stored as individual keys (`fuel_lpg_price`, `fuel_lpg_enabled`, etc.), not as JSON.

---

## 12. Project Stack

| Layer | Technology |
|---|---|
| Backend API | PHP 8.1, no framework, custom Router/Request/Response/JWT |
| Database | MySQL on Hostinger (`u952547820_ecosudar`) |
| Admin Dashboard | React 18 + Vite + TypeScript + shadcn/ui + Tailwind |
| Mobile App | Flutter (Dart) |
| Hosting | Hostinger — `api.ecosudar.com` (API), `admin.ecosudar.com` (dashboard) |
| Auth | Dual-JWT (access + refresh), stateless, HMAC-SHA256 |

---

## 13. Key File Locations

| What | Path |
|---|---|
| API config (JWT, expiry, DB) | `api/config/app.php` |
| All routes registered | `api/index.php` |
| Admin API client (fetch wrapper) | `eco-sudar-control/src/lib/api/client.ts` |
| Auth context (session management) | `eco-sudar-control/src/contexts/AuthContext.tsx` |
| Database migrations | `database/migrations/` |
| Enum → VARCHAR fix | `database/migrations/2026_04_24_fix_status_enums.sql` |
| Customer Engagement migration | `database/migrations/2026_04_23_customer_engagement.sql` |
