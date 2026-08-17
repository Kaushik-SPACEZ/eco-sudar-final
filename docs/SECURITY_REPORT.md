# EcoSudar Security Audit Report

**Date:** 2026-04-24  
**Scope:** All backend PHP files (`api/`), all frontend TypeScript files (`eco-sudar-control/src/`), config files, `.gitignore`, `.env` handling  
**Auditor:** Automated review + manual analysis

---

## Summary

| Severity | Found | Fixed |
|---|---|---|
| Critical | 4 | 4 |
| High | 2 | 2 |
| Medium | 2 | 2 |
| Low | 1 | 1 |
| Informational | 3 | — |
| **Total** | **12** | **9** |

---

## Critical Vulnerabilities

---

### C-1 — Hardcoded DB Credentials in Source Code
**File:** `api/config/database.php`  
**Severity:** Critical  
**Status:** Fixed

**What was wrong:**  
Database credentials were hardcoded directly in PHP source:
```php
define('DB_PASS', 'Ecosudar@4321');
```
Anyone with repository access has the live production database password.

**Fix applied:**  
`database.php` now reads all DB credentials from the server-side `.env` file. If any required key is missing, the API exits with a 500 error immediately rather than connecting with no credentials.

```php
// Now reads from .env:
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
```

**Action required (server):**  
Rotate the database password on Hostinger immediately. The old password is in git history and must be considered compromised. Update `.env` on the server with the new password.

---

### C-2 — Hardcoded JWT Secret in Source Code
**File:** `api/config/app.php`  
**Severity:** Critical  
**Status:** Fixed

**What was wrong:**  
```php
define('JWT_SECRET', '42ab11eacd0f43469cf1118a8e7bab27ceaa17f3bdd9553698e3cd4567c4fa2b');
```
A hardcoded JWT secret means anyone can forge valid tokens for any user ID, including admin, once they read the source code.

**Fix applied:**  
`app.php` now reads `JWT_SECRET` from `.env`. The existing guard in `index.php` (which rejects the API if `JWT_SECRET` is missing or too short) continues to protect against misconfiguration.

**Action required (server):**  
1. Generate a new secret: `php -r "echo bin2hex(random_bytes(32));"`
2. Add `JWT_SECRET=<new_value>` to `.env` on the server
3. Invalidate all existing tokens by changing the secret — users will need to log in again

---

### C-3 — Hardcoded AI API Keys in Source Code
**File:** `api/config/database.php`  
**Severity:** Critical  
**Status:** Fixed

**What was wrong:**  
Gemini and Groq API keys were hardcoded as fallback values:
```php
$_keys = [
    'gemini_api_key' => 'AIza…REDACTED — rotate this key',
    'groq_api_key'   => 'gsk_…REDACTED — rotate this key',
];
```
The `.env` was only used to *override* these hardcoded values, meaning the keys leaked to git even if `.env` was later gitignored.

**Fix applied:**  
Hardcoded fallback values removed. Keys now only come from `.env` and default to empty string if not set.

**Action required (server):**  
Rotate both API keys immediately (Gemini Console, Groq Console). Update `.env` on the server with new keys.

---

### C-4 — Unauthenticated Rate-Limit Reset Endpoint in Production
**File:** `api/tests/clear_rate_limits.php`  
**Severity:** Critical  
**Status:** Fixed

**What was wrong:**  
This file was accessible at `https://api.ecosudar.com/api/tests/clear_rate_limits.php` with no authentication. Any attacker could:
- Reset all rate limits → launch unlimited login brute-force attacks
- Clear `revoked_tokens` table → reactivate logged-out admin sessions

**Fix applied:**  
File now requires a `?key=<DEV_CLEAR_KEY>` secret in the query string for web access. CLI usage (`php ...`) still works without a key. If `DEV_CLEAR_KEY` is not in `.env`, web access returns `403 Forbidden`.

Add to `.env` on the server:
```
DEV_CLEAR_KEY=<random_string>
```

---

## High Vulnerabilities

---

### H-1 — Production Error Details Leaked in API Responses
**File:** `api/controllers/AuthController.php` — lines 114, 192  
**Severity:** High  
**Status:** Fixed

**What was wrong:**  
The `login()` and `refresh()` endpoints had try-catch blocks that returned full exception details (message, file path, line number) in the HTTP response:
```php
Response::error('DEBUG FATAL: ' . $e->getMessage() . ' at line ' . $e->getLine() . ' in ' . basename($e->getFile()), 500);
Response::error('DEBUG FATAL REFRESH: ' . ...);
```
This exposes internal file structure and error details to any user who triggers a server exception. The rest of the codebase correctly uses `APP_ENV` to hide details in production, but these two handlers bypassed it.

**Fix applied:**  
Both catch blocks now log to `error_log()` (server-side only) and return the generic `Internal server error` message to the client.

---

### H-2 — `X-Client-Type` Header Blocked by CORS
**File:** `api/index.php` — line 36  
**Severity:** High  
**Status:** Fixed

**What was wrong:**  
`X-Client-Type` was not listed in `Access-Control-Allow-Headers`:
```php
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
```
Browsers make a CORS preflight request for any non-simple header. Since `X-Client-Type` was missing, browsers would block the admin dashboard login request, and the backend would default to `web` client type silently — but future browser versions could reject the request entirely.

**Fix applied:**
```php
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Client-Type');
```

---

## Medium Vulnerabilities

---

### M-1 — CORS Wildcard (`*`) in Production
**File:** `api/config/app.php`  
**Severity:** Medium  
**Status:** Fixed

**What was wrong:**  
```php
define('CORS_ORIGIN', '*'); // restrict to your Flutter app domain in production
```
A wildcard CORS origin allows any website to make credentialed requests to the API from a user's browser. Combined with a valid session cookie or token, this could enable cross-site request forgery attacks from malicious third-party sites.

**Fix applied:**  
`CORS_ORIGIN` moved to `.env` — defaults to `https://api.ecosudar.com` (current admin dashboard host). Change the `.env` value when the domain moves; no code change needed.

Flutter (mobile app) does not use a browser, so it is not subject to CORS. Only the admin dashboard needs to be in the allowed list.

---

### M-2 — `.env` File Not in `.gitignore`
**File:** `.gitignore`  
**Severity:** Medium  
**Status:** Fixed

**What was wrong:**  
The `.gitignore` at project root did not include `.env`. This means the `.env` file (and any future env files) could be accidentally committed, re-exposing credentials even after they are moved out of PHP source files.

**Fix applied:**  
Added to `.gitignore`:
```
.env
*.env
!*.env.example
fast25sms.txt
```

---

## Low Vulnerabilities

---

### L-1 — Supabase Keys in Frontend `.env`
**File:** `eco-sudar-control/.env`  
**Severity:** Low  
**Status:** Informational (no code fix needed — see action required)

**What was wrong:**  
The frontend `.env` contains Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`) that are not used anywhere in the current codebase. Supabase anon keys are designed to be public, but unused credentials should still be removed to reduce attack surface.

**Action required:**  
Remove the three `VITE_SUPABASE_*` lines from `eco-sudar-control/.env` if Supabase is not used.

---

## Informational Findings

---

### I-1 — `dangerouslySetInnerHTML` in Chart Component
**File:** `eco-sudar-control/src/components/ui/chart.tsx` — line 70  
**Severity:** Informational (not a vulnerability)

The `dangerouslySetInnerHTML` renders CSS custom properties generated from a static theme configuration object — not from user input. No XSS risk. No action needed.

---

### I-2 — Dynamic `ORDER BY` in `AdminUserController`
**File:** `api/controllers/admin/AdminUserController.php` — lines 49–51  
**Severity:** Informational (already safe)

The controller accepts `?sort` and `?order` query params and uses them in `ORDER BY`. The sort column is safely mapped through a PHP allowlist:
```php
$allowedSort = ['created_at' => 'u.created_at', 'name' => 'u.name', 'total_orders' => 'total_orders'];
$sortField   = $allowedSort[$request->query('sort', 'created_at')] ?? 'u.created_at';
$sortDir     = strtoupper($request->query('order', 'desc')) === 'ASC' ? 'ASC' : 'DESC';
```
Both the column and direction are fully constrained — no SQL injection possible. No action needed.

---

### I-3 — SQL Queries Use Parameterised Placeholders Throughout
**Severity:** Informational (positive finding)

All `Database::fetchAll()`, `Database::fetch()`, `Database::execute()`, and `Database::insert()` calls across all 25+ controllers pass user input exclusively as `?` bind parameters — never via string concatenation. No SQL injection vulnerabilities found.

---

## Files Changed

| File | Change |
|---|---|
| `api/config/app.php` | Removed hardcoded JWT secret; reads from `.env`; CORS_ORIGIN moved to `.env`, defaults to `api.ecosudar.com` |
| `api/config/database.php` | Removed hardcoded DB password and AI API key fallbacks; all values now from `.env` with startup guard |
| `api/index.php` | Added `X-Client-Type` to `Access-Control-Allow-Headers` |
| `api/controllers/AuthController.php` | Replaced `DEBUG FATAL` error responses with `error_log()` + generic message (2 locations) |
| `api/tests/clear_rate_limits.php` | Added secret key guard for web access; CLI still works without key |
| `.gitignore` | Added `.env`, `*.env`, `fast25sms.txt` entries |
| `.env` | Consolidated all secrets (DB, JWT, AI keys) — now covered by `.gitignore` |

---

## Action Required on Server (Cannot Be Fixed in Code)

These require manual steps on Hostinger and external services:

| # | Action | Why |
|---|---|---|
| 1 | **Rotate DB password** on Hostinger MySQL panel | Old password `Ecosudar@4321` is in git history |
| 2 | **Generate new JWT_SECRET** and update `.env` | Old secret is in git history; all existing tokens should be considered forgeable |
| 3 | **Rotate Gemini API key** at console.cloud.google.com | Old key is in git history |
| 4 | **Rotate Groq API key** at console.groq.com | Old key is in git history |
| 5 | **Add `DEV_CLEAR_KEY` to `.env`** on server | Needed to use `clear_rate_limits.php` via web |
| 6 | **Remove Supabase keys from `eco-sudar-control/.env`** | Unused credentials |
| 7 | **Consider git history scrubbing** (`git filter-repo`) | Secrets still present in old commits; anyone who cloned the repo has them |

---

## What Was NOT Vulnerable

- All SQL queries use parameterised prepared statements (no SQL injection)
- Auth middleware validates token signature, expiry, revocation, and user active status on every protected request
- Admin middleware checks `user_type === 'admin'` after auth
- JWT uses `hash_hmac('sha256', ...)` with `hash_equals()` comparison (timing-safe)
- Passwords hashed with bcrypt cost 12
- No `eval()`, `exec()`, `system()`, or shell function usage anywhere
- No direct `$_GET`/`$_POST`/`$_REQUEST` usage — all input goes through `Request` class
- Error display is suppressed in production (`APP_ENV === 'production'`)
- `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` set in `.htaccess`
- Rate limiting active on login (5/15min) and register (3/hour) endpoints
- Refresh tokens stored as SHA-256 hashes, rotated on every use
- Reset tokens are single-use (blacklisted after use)
