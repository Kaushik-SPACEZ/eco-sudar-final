# Finance Module — Endpoint Test Report

**Test script:** [`api/tests/finance_test.sh`](../../api/tests/finance_test.sh)

Runs against the live API at `api.ecosudar.com/api` after deployment. Logs into `/auth/login` as admin, captures the JWT, and fires 45+ cases covering every endpoint added in this module.

## How to run

```bash
BASE=https://api.ecosudar.com/api \
ADMIN_EMAIL=admin@ecosudar.com \
ADMIN_PASS=EcoSudar@2024 \
bash api/tests/finance_test.sh
```

Pre-requisite: `curl` and `jq`. Exit code `0` means all tests passed; non-zero means at least one assertion failed (details are printed and saved to `/tmp/finance_test_results.txt`).

---

## Coverage matrix

### Expenses (`/admin/expenses`)

| # | Case | Expected |
|---|---|---|
| 1 | List expenses | 200 |
| 2 | List with category filter | 200 |
| 3 | List with date range | 200 |
| 4 | List with search keyword | 200 |
| 5 | Distinct categories | 200 |
| 6 | Create expense (valid) | 201 (id returned) |
| 7 | Fetch created by id | 200 |
| 8 | Update amount | 200 |
| 9 | Delete | 200 |
| 10 | Create missing vendor | **422** |
| 11 | Create negative amount | **422** |
| 12 | Create invalid payment_mode | **422** |
| 13 | Create invalid date format | **422** |
| 14 | Fetch unknown id | **404** |
| 15 | Update unknown id | **404** |
| 16 | Delete unknown id | **404** |
| 17 | Fetch negative id | **400** |

### Finance (P&L / Ratios / Config)

| # | Case | Expected |
|---|---|---|
| 18 | P&L default range | 200 |
| 19 | P&L custom range | 200 |
| 20 | Ratios default range | 200 |
| 21 | Finance config | 200 |
| 22 | Update config (investment) | 200 |
| 23 | P&L invalid from-date | **422** |
| 24 | P&L from > to | **422** |
| 25 | Ratios invalid date (2026-13-99) | **422** |
| 26 | Config negative value | **422** |
| 27 | Config empty body | **400** |

### Invoices / GST Invoicing

| # | Case | Expected |
|---|---|---|
| 28 | List invoices | 200 |
| 29 | Filter by status=paid | 200 |
| 30 | Create GST invoice with items | 201 |
| 31 | Fetch invoice by id | 200 |
| 32 | Update status Draft→Sent | 200 |
| 33 | Delete invoice | 200 |
| 34 | Create with empty items[] | **422** |
| 35 | Create with invalid gst_rate=7 | **422** |
| 36 | Create with no fields | **422** |
| 37 | Fetch unknown id | **404** |
| 38 | Update unknown id | **404** |
| 39 | Delete unknown id | **404** |
| 40 | Update with invalid status | **422** |

### Reports

| # | Case | Expected |
|---|---|---|
| 41 | Sales report | 200 |
| 42 | Orders report | 200 |
| 43 | Payments report | 200 |
| 44 | Expenses report | 200 |
| 45 | Forecast report | 200 |
| 46 | Production report (empty array) | 200 |
| 47 | Invalid module | **422** |
| 48 | Invalid from-date | **422** |
| 49 | from > to | **422** |

### Auth boundary

| # | Case | Expected |
|---|---|---|
| 50 | List expenses with bad token | **401** |
| 51 | List invoices with bad token | **401** |

---

## What the tests prove

**Positive cases** confirm the happy path works end-to-end: request body parsing, SQL query correctness, GST tax split math (IGST vs CGST+SGST), pagination envelope, and response shape matching the TypeScript interfaces in `src/lib/api/*.ts`.

**Negative cases** cover four failure modes:

1. **Validation** — missing required fields, wrong types, out-of-range values.
2. **Not found** — stale id from the UI still referenced after someone else deleted it.
3. **Authorization** — expired/malformed JWT.
4. **Semantic** — `from > to` date ranges, invalid status transitions.

## Local run without deployment

The script can also run against a local PHP server (`php -S 0.0.0.0:8000 -t api`) by setting `BASE=http://localhost:8000`. You would need a local MySQL matching the Hostinger schema.

## Interpreting a failure

Each failure prints the full HTTP status and first 200 chars of the response body. Common failures and their root cause:

| Symptom | Likely cause |
|---|---|
| 404 on every admin/expenses call | Migration not yet imported — `expenses` table missing |
| 500 on /admin/finance/pnl | `finance_config` table missing or unseeded |
| 403 on admin calls | User is not `user_type = 'admin'` |
| 401 on Login step | Admin password changed — update `ADMIN_PASS` env var |
