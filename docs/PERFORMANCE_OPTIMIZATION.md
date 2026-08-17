# Eco Sudar Admin — Performance & Loading Optimization

**Scope:** Why the admin app felt slow ("shell loads fast, data lags / slow again and again")
and the layered fixes applied — frontend caching, API preflight caching, and database indexing.
**Status:** Implemented & deployed (reference doc).
**Audience:** developers maintaining/extending the admin (`eco-sudar-control`) and API (`api/`).

---

## 1. The problem

Symptoms reported:

1. The page shell (sidebar, layout) loads fast, but the **data inside each page lags**.
2. After the first optimization pass, **only the Profit & Loss page was fast** — other pages were
   "slow again and again" on every revisit.

This is the classic signature of a **data round-trip problem**, not a rendering problem: the UI
is fine; the time goes into fetching data from a slow backend on every navigation.

---

## 2. Diagnosis — where the time actually goes

The stack is a React SPA → PHP API → MySQL on **Hostinger shared hosting**. On shared hosting,
each API request pays: TLS + cold PHP start + a fresh DB connection + query + network latency.
Three independent multipliers made this worse:

| Cause | Effect | Evidence in code |
|---|---|---|
| **CORS preflight not cached** | Every cross-origin request sent an extra `OPTIONS` round-trip *first* → ~2× requests | `api/index.php` set CORS headers but no `Access-Control-Max-Age` |
| **No client-side caching** | Every page re-fetched all its data on every visit | Pages used raw `apiFetch` in `useEffect`; React Query was installed but unused |
| **Missing DB indexes** | Revenue/list queries did full-table scans / filesorts | No index on `payment_status`+`created_at`; list sorts on un-indexed `created_at` |

A useful one-time confirmation in the browser: **DevTools → Network → reload a data page** and
look for (a) `OPTIONS` rows before each request (preflight) and (b) high "Waiting (TTFB)" on the
`/admin/...` calls.

---

## 3. The solution at a glance (four layers)

| # | Fix | Layer | Effect |
|---|---|---|---|
| 1 | Cache CORS preflight (`Access-Control-Max-Age`) | API | ~halves round-trips after first request |
| 2 | React Query on read-heavy pages | Frontend | instant revisits + background refresh (Dashboard, Reports, Finance) |
| 3 | **`apiFetch` GET cache** (stale-while-navigating) | Frontend | instant revisits for **every** page, no per-page rewrite |
| 4 | Database indexes on hot columns | DB | fast queries instead of full scans/filesorts |

Layers 1, 3, 4 are **app-wide**; layer 2 is page-specific. Together they remove the repeated
slowness; the only remaining wait is the *first* fetch of a page in a session (pure host latency).

---

## 4. Fix #1 — Cache the CORS preflight

**File:** `api/index.php` (CORS header block).

```php
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Client-Type');
header('Access-Control-Max-Age: 86400'); // cache preflight 24h
```

**Why it matters:** the app sends `Authorization` + `X-Client-Type` headers, which makes every
request a "non-simple" CORS request → the browser sends an `OPTIONS` preflight *before* each real
request. Without `Access-Control-Max-Age`, that preflight repeats every time. Caching it for 24h
means the browser stops re-asking, removing roughly half the network round-trips.

---

## 5. Fix #2 — React Query on read-heavy pages

**Files:** `src/App.tsx` (client defaults) + `Dashboard.tsx`, `Reports.tsx`, `Finance.tsx`.

React Query (`@tanstack/react-query`) was already installed and wrapped around the app, but **no
page used it**. We gave it caching-friendly defaults and converted the three heaviest read pages
to `useQuery`.

```ts
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // treat data fresh for 1 min → no refetch storm
      gcTime: 10 * 60_000,         // keep cache 10 min after unmount
      refetchOnWindowFocus: false, // don't refetch on every tab focus
      retry: 1,
    },
  },
});
```

```ts
// pattern used in Dashboard/Reports/Finance
const { data } = useQuery({ queryKey: ["stats", "overview"], queryFn: () => statisticsApi.overview() });
```

**Behavior:** cached data shows **instantly** on revisit while a fresh copy loads in the
background; identical requests are de-duped. This is why Profit & Loss (Finance) became fast
first.

> The remaining ~17 pages were **not** individually converted — Fix #3 covers them all at once.

---

## 6. Fix #3 — `apiFetch` GET cache (the app-wide one)

**File:** `src/lib/api/client.ts`. This is the key fix for "every other page is slow again and
again," because nearly every page loads data through the shared `apiFetch` helper.

### What it does

- **Caches GET responses for 60 seconds** keyed by request path. Revisiting any page within that
  window returns the cached response **instantly** — no network call.
- **De-dupes in-flight requests:** two simultaneous identical GETs share one network request.
- **Invalidates on writes:** any non-GET (POST/PUT/PATCH/DELETE) **clears the whole cache**, so a
  create/update/delete is always followed by fresh reads.
- **Clears on auth change:** the `eco:auth-expired` event clears the cache (no stale/cross-user
  data).
- **Never caches failures:** a rejected request is removed from the cache so the next call retries.

### How it works (shape)

```ts
const GET_TTL_MS = 60_000;
const getCache = new Map<string, { ts: number; promise: Promise<unknown> }>();

export function clearApiCache() { getCache.clear(); }
window.addEventListener("eco:auth-expired", clearApiCache);

export async function apiFetch<T>(path, init = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const cacheable = method === "GET" && init.skipCache !== true && !MOCK_MODE;

  if (cacheable) {
    const hit = getCache.get(path);
    if (hit && Date.now() - hit.ts < GET_TTL_MS) return hit.promise;  // instant
  }

  const run = async () => { /* real fetch + error handling + json */ };

  if (cacheable) {
    const promise = run();
    getCache.set(path, { ts: Date.now(), promise });
    promise.catch(() => getCache.delete(path));   // don't cache errors
    return promise;
  }

  const result = await run();
  if (method !== "GET") clearApiCache();           // a write → reads are now stale
  return result;
}
```

### Why it's correct (not stale)

For a single-owner/admin tool, the only thing that changes data is the user's own
create/update/delete actions — and **every write clears the cache**, so the next read is fresh.
The cache only ever returns "the page you looked at a few seconds ago," which is exactly the
repeated-navigation case we wanted to speed up. External changes (another admin in another
browser) appear after at most 60s.

### Interaction with React Query

The 60s GET-TTL matches React Query's 60s `staleTime`, so the two layers agree: within 60s neither
re-hits the network; after 60s both refresh. No conflict.

---

## 7. Fix #4 — Database indexes

**Files:** `database/add_performance_indexes.sql` (+ `add_invoice_payment_status.sql` prerequisite).

A full-schema audit (~38 tables) found the DB was already well-indexed on foreign keys, statuses,
and most dates. The genuine gaps were the revenue/list queries that filter on `payment_status` +
`created_at` and list endpoints that sort by `created_at` on growing tables.

```sql
ALTER TABLE `orders`         ADD INDEX `idx_orders_payment_created`        (`payment_status`, `created_at`);
ALTER TABLE `invoices`       ADD INDEX `idx_invoices_payment_order_created`(`payment_status`, `order_id`, `created_at`);
ALTER TABLE `invoices`       ADD INDEX `idx_invoices_created`              (`created_at`);
ALTER TABLE `users`          ADD INDEX `idx_users_created`                 (`created_at`);
ALTER TABLE `queries`        ADD INDEX `idx_queries_created`               (`created_at`);
ALTER TABLE `quotes`         ADD INDEX `idx_quotes_created`                (`created_at`);
ALTER TABLE `chat_messages`  ADD INDEX `idx_chat_session_created`          (`session_id`, `created_at`);
```

Run once in phpMyAdmin (after a backup). "Duplicate key name" on a line = that index already
exists; skip it. These turn full-table scans/filesorts into index lookups — the *first* (uncached)
load of each page gets faster, not just revisits.

---

## 8. What each fix speeds up

| Scenario | Helped by |
|---|---|
| First visit to a page in a session | #1 (fewer round-trips), #4 (faster queries) |
| Navigating away and back to a page | #2 (3 pages), **#3 (all pages)** |
| Repeated identical requests on one page | #3 (in-flight dedupe) |
| Heavy revenue/finance/list queries | #4 (indexes) |
| Seeing fresh data after you save something | #3 (write clears cache) |

---

## 9. Extending & maintaining

- **A page must always be live (e.g. a "Refresh" button or real-time view):** pass `skipCache`:
  ```ts
  apiFetch("/admin/something", { skipCache: true });
  ```
- **Force-clear the cache from code** (e.g. after a bulk import done outside normal mutations):
  ```ts
  import { clearApiCache } from "@/lib/api/client";
  clearApiCache();
  ```
- **Tune the window:** change `GET_TTL_MS` in `client.ts` (and ideally keep it equal to React
  Query's `staleTime` in `App.tsx`).
- **New read-heavy pages:** prefer `useQuery` (gives background refresh + fine-grained
  invalidation); they still benefit from the `apiFetch` cache underneath.
- **New filter/sort columns on a list endpoint:** add a matching DB index in the same migration
  (keep the indexing discipline).

### Gotchas

- The cache is **path-keyed**. If two different result sets ever share the exact same path
  (they shouldn't — query params are part of the path), they'd collide. Always include filter
  params in the query string.
- A mutation clears the **entire** GET cache (coarse but safe). In a very mutation-heavy burst the
  cache benefit is reduced — acceptable, and it guarantees correctness.
- The cache is in-memory per browser tab; a full page reload starts empty (and login is a POST,
  which clears it anyway).

---

## 10. Host-level actions (no code — only the host can do these)

- **Enable PHP OPcache** in Hostinger's PHP settings (a `clear-cache.php` reset script already
  exists, so OPcache is available). This removes PHP recompilation on every request.
- Keep the security headers / preflight cache uploaded (`api/index.php`, `.htaccess`).
- Consider moving large media (videos) off shared hosting later (see the Phase 2 plan, OQ-1) —
  unrelated to page speed but relevant to overall responsiveness.

---

## 11. How to verify

1. Upload the latest `admin/` build and `api/index.php`; run the index migration.
2. Open the live admin → **DevTools → Network**.
3. Reload a page once (first load — still waits on the API).
4. Navigate to another page and back: the return visit should paint **instantly** with **few/no**
   new `/admin/...` requests (served from the `apiFetch` cache) and **no** `OPTIONS` preflight
   rows after the first.
5. Create/edit something, then revisit a related page: data is **fresh** (the write cleared the
   cache).

---

## 12. File reference

| File | Change |
|---|---|
| `api/index.php` | `Access-Control-Max-Age: 86400` (preflight cache) |
| `eco-sudar-control/src/App.tsx` | React Query client defaults (staleTime/gcTime/no refetch-on-focus) |
| `eco-sudar-control/src/pages/Dashboard.tsx` · `Reports.tsx` · `Finance.tsx` | converted to `useQuery` |
| `eco-sudar-control/src/lib/api/client.ts` | **GET cache + in-flight dedupe + write-invalidation** |
| `database/add_performance_indexes.sql` | 7 indexes on hot columns |
| `database/add_invoice_payment_status.sql` | prerequisite column for the index above |

---

*Summary: the slowness was repeated network round-trips to a slow shared host. We cut the
round-trips (preflight cache), stopped re-fetching on every navigation (app-wide `apiFetch` GET
cache + React Query on heavy pages), and sped up the queries themselves (indexes). Revisits are
now instant; only the first load of each page still reflects raw host latency.*
