# Change: eco-sudar-control/.env and src/lib/api/client.ts

**Type:** Existing files modified — centralized API base URL
**Date:** 2026-04-23
**Module:** Frontend — Configuration

---

## The Problem

The API base URL could not be hardcoded differently in different files. Every frontend API module must call the same backend host, and that host changes between development (local proxy or localhost) and production (`https://api.ecosudar.com/api`). The URL needed to live in one place and be injected at build time.

---

## Change 1: eco-sudar-control/.env

One line was added to the `.env` file at `eco-sudar-control/.env`:

```
VITE_API_BASE_URL="https://api.ecosudar.com/api"
```

This is a Vite environment variable. The `VITE_` prefix is required — Vite only exposes variables with this prefix to the browser bundle. The value is read at dev-server start and baked into the production build at `npm run build` time.

The `.env` file was already tracked in the repository (it contains the Supabase anon key and project ID). The API URL variable was appended to it.

---

## Change 2: eco-sudar-control/src/lib/api/client.ts

The `BASE_URL` constant already existed in `client.ts`. Its value was updated from a hardcoded string to read from the environment variable:

```typescript
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
```

The `?? "/api"` fallback means: if for any reason the env variable is not set at build time (e.g. running `vite build` without the `.env` file), requests will fall back to `/api` on the same origin — a reasonable safe default for reverse-proxy setups.

The comment above the constant was updated to document this sourcing behaviour.

---

## How This Works at Runtime

In development (`npm run dev`): Vite reads `.env` and makes `import.meta.env.VITE_API_BASE_URL` available as the string `"https://api.ecosudar.com/api"`. All `apiFetch()` calls will construct URLs like `https://api.ecosudar.com/api/admin/tasks`.

In production (`npm run build`): Vite replaces `import.meta.env.VITE_API_BASE_URL` with the literal string value at build time — no runtime `.env` loading. The built `dist/` files are fully self-contained.

---

## What Was Not Changed

No API module files (`hr.ts`, `tasks.ts`, `statistics.ts`, etc.) were touched for this change. They all call `apiFetch()` with relative paths like `/admin/tasks`, and `apiFetch()` prefixes those paths with `BASE_URL` internally. This is the correct layering — API modules never know the host, they just know the path.
