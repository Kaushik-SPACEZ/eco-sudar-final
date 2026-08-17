# Finance Module

This folder documents the five pages of the Finance section of the EcoSudar admin dashboard.

| Page | Route | Doc |
|---|---|---|
| Invoices (order-based) | `/invoices` | [invoices.md](./invoices.md) |
| Expenses              | `/expenses` | [expenses.md](./expenses.md) |
| GST Invoicing (standalone) | `/gst-invoicing` | [gst-invoicing.md](./gst-invoicing.md) |
| Profit & Loss         | `/finance`  | [profit-loss.md](./profit-loss.md) |
| Reports               | `/reports`  | [reports.md](./reports.md) |

## Deployment checklist

1. **Database migration** — import `database/migrations/2026_04_23_finance_module.sql` via Hostinger → phpMyAdmin → u952547820_ecosudar → Import. This creates `expenses`, `invoice_items`, `finance_config` tables, extends `invoices`, and seeds mock data.
2. **Upload backend** — SFTP `api/controllers/admin/Admin{Expense,Finance,Reports}Controller.php`, the updated `api/controllers/admin/AdminInvoiceController.php`, and `api/index.php`.
3. **Rebuild frontend** — `cd eco-sudar-control && npm run build` and upload the `/dist` contents to `public_html/`.
4. **Smoke test** — run `api/tests/finance_test.sh` (see [test-report.md](./test-report.md)).

## Endpoint matrix

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/expenses` | List expenses (filter/search/paginate) |
| GET | `/admin/expenses/categories` | Distinct category list |
| GET | `/admin/expenses/{id}` | Single expense |
| POST | `/admin/expenses` | Create |
| PUT | `/admin/expenses/{id}` | Update |
| DELETE | `/admin/expenses/{id}` | Delete |
| GET | `/admin/finance/pnl` | P&L summary |
| GET | `/admin/finance/ratios` | Financial ratios |
| GET | `/admin/finance/config` | Balance-sheet config |
| PUT | `/admin/finance/config` | Update config |
| GET | `/admin/invoices` | List invoices |
| GET | `/admin/invoices/{id}` | Single invoice + items |
| POST | `/admin/invoices` | Auto-generate from order_id |
| POST | `/admin/invoices/gst` | Standalone GST invoice with line items |
| PUT | `/admin/invoices/{id}` | Update header fields |
| DELETE | `/admin/invoices/{id}` | Delete |
| GET | `/admin/invoices/{id}/download` | Plain-text invoice stream |
| GET | `/admin/reports` | Cross-module reports |

All endpoints require `Authorization: Bearer <admin_token>`.
