# Frontend API Client

**File:** [`eco-sudar-control/src/lib/api/client.ts`](../../eco-sudar-control/src/lib/api/client.ts)
**Auth context:** [`eco-sudar-control/src/contexts/AuthContext.tsx`](../../eco-sudar-control/src/contexts/AuthContext.tsx)

---

## Overview

All admin dashboard API calls go through `apiFetch<T>()`. It handles auth token injection, client-type header, and session expiry.

---

## `apiFetch<T>(path, init?): Promise<T>`

```typescript
const res = await apiFetch<{ data: User[] }>("/admin/employees");
return res.data ?? [];
```

**What it does:**
1. Reads the Bearer token from `localStorage` key `eco_admin_auth`
2. Injects `Authorization: Bearer <token>` and `X-Client-Type: web` headers
3. On **401**: clears `eco_admin_auth` from localStorage, fires `eco:auth-expired` DOM event, throws error
4. On other non-2xx: throws `Error("API <status>: <body>")`
5. Returns `await res.json()` as-is — **does NOT auto-unwrap** the `{ success, data }` envelope

### Critical Rule — Manual `.data` Access

The PHP backend always wraps responses:
```json
{ "success": true, "data": <payload>, "message": "..." }
```

Every API module must unwrap `.data` explicitly:
```typescript
// CORRECT
return (await apiFetch<{ data: Employee[] }>("/admin/employees")).data ?? [];

// WRONG — returns the full envelope object, not the array
return await apiFetch<Employee[]>("/admin/employees");
```

Paginated endpoints use `Response::paginated()` and have `.pagination` alongside `.data`.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL e.g. `https://api.ecosudar.com/api` |
| `VITE_USE_MOCK_API` | Set `"true"` to use in-memory mock data (HR module) |

---

## Auth Context (`AuthContext.tsx`)

### Session Lifecycle

| Event | Behaviour |
|---|---|
| Login | Stores `{ email, token, refresh_token, expires_at }` in `eco_admin_auth`. `expires_at = Date.now() + 86400000` (1 day) |
| Page load | Checks `expires_at` — if past, clears auth and shows login |
| API 401 | `apiFetch` fires `eco:auth-expired` event → `AuthContext` clears auth → login shown |
| Logout | Calls `POST /auth/logout` (fire-and-forget), clears localStorage |

### `useAuth()` hook

```typescript
const { isAuthenticated, adminEmail, login, logout } = useAuth();
```

| Field | Type | Notes |
|---|---|---|
| `isAuthenticated` | `boolean` | `true` if valid, non-expired token in localStorage |
| `adminEmail` | `string` | Email of logged-in admin |
| `login(email, password)` | `Promise<boolean>` | `false` if credentials invalid or user is not admin |
| `logout()` | `void` | Clears session immediately |

### Token Expiry

Admin dashboard enforces 1-day sessions client-side. There is **no silent refresh** — admin must re-login after expiry. This is intentional (security preference for admin panel).

---

## API Module Pattern

Every module in `src/lib/api/` follows this pattern:

```typescript
import { apiFetch } from "./client";

export const myApi = {
  async list(): Promise<Item[]> {
    const res = await apiFetch<{ data: Item[] }>("/admin/my-endpoint");
    return res.data ?? [];
  },

  async create(data: CreatePayload): Promise<Item> {
    const res = await apiFetch<{ data: Item }>("/admin/my-endpoint", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
```

### Modules Reference

| File | Exports | Endpoints |
|---|---|---|
| `customers.ts` | `customersApi` | `/admin/users` |
| `dealers.ts` | `dealersApi` | `/admin/dealers` |
| `orders.ts` | `ordersApi` | `/orders`, `/admin/invoices` |
| `products.ts` | `productsApi` | `/products`, `/admin/products` |
| `hr.ts` | `employeesApi`, `attendanceApi`, `payrollApi` | `/admin/employees`, `/admin/attendance`, `/admin/payroll` |
| `finance.ts` | `financeApi` | `/admin/finance` |
| `invoices.ts` | `invoicesApi` | `/admin/invoices` |
| `expenses.ts` | `expensesApi` | `/admin/expenses` |
| `reports.ts` | `reportsApi` | `/admin/reports` |
| `statistics.ts` | `statisticsApi` | `/statistics/*` |
| `tasks.ts` | `tasksApi` | `/admin/tasks` |
| `meetings.ts` | `meetingsApi` | `/admin/meetings` |
| `sops.ts` | `sopsApi` | `/admin/sops` |
| `workflows.ts` | `workflowsApi` | `/admin/workflows` |
| `queries.ts` | `queriesApi` | `/admin/queries` |
| `quoteRequests.ts` | `quoteRequestsApi` | `/admin/quote-requests` |
| `faq.ts` | `faqApi` | `/admin/faqs` |
| `settings.ts` | `settingsApi` | `/admin/settings` |
| `billExtract.ts` | `billExtractApi` | `/admin/bill-extract` |
