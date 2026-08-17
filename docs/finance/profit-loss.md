# Profit & Loss Page — `/finance`

**UI file:** [`eco-sudar-control/src/pages/Finance.tsx`](../../eco-sudar-control/src/pages/Finance.tsx)
**API module:** [`eco-sudar-control/src/lib/api/finance.ts`](../../eco-sudar-control/src/lib/api/finance.ts)
**Backend:** [`api/controllers/admin/AdminFinanceController.php`](../../api/controllers/admin/AdminFinanceController.php)
**DB tables:** aggregates `orders`, `expenses`; reads `finance_config`.

---

## How numbers are derived

| Metric | Source |
|---|---|
| **Revenue** | `SUM(orders.total_amount - delivery_fee)` where `payment_status='paid'` within the period |
| **Expenses** | `SUM(expenses.amount)` within the period |
| **Gross Profit** | Revenue − Expenses |
| **Taxes** | `grossProfit × tax_rate/100` (from `finance_config.tax_rate`, default 18%) |
| **Net Profit** | Gross Profit − Taxes |
| **Monthly series** | both sources grouped by `YYYY-MM` |
| **Expense breakdown** | grouped by `expenses.category` |
| **Revenue breakdown** | grouped by `users.user_type` (dealer → Dealer Network, customer → Direct Sales) |

### Ratios (from `finance_config` + computed P&L)

| Ratio | Formula |
|---|---|
| profitMargin | netProfit / revenue |
| expenseRatio | expenses / revenue |
| roi | netProfit / investment |
| currentRatio | currentAssets / currentLiabilities |
| grossMargin | grossProfit / revenue |
| operatingMargin | (grossProfit − taxes × opex_tax_portion/100) / revenue |

All ratios safe-divide: return `0` when the denominator is `0`.

---

## Endpoints

### `GET /admin/finance/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD`

Defaults: `to = today`, `from = to − 6 months`.

Response matches the `PnLSummary` TypeScript shape.

### `GET /admin/finance/ratios?from=...&to=...`
Same date window; returns the `FinancialRatios` shape.

### `GET /admin/finance/config`
Reads `finance_config` rows and returns an object keyed by `config_key`:
```json
{
  "investment":          { "value": 4500000, "notes": "Total capital invested" },
  "current_assets":      { "value": 2850000, "notes": "..." },
  "current_liabilities": { "value": 1320000, "notes": "..." },
  "tax_rate":            { "value": 18,      "notes": "..." },
  "opex_tax_portion":    { "value": 40,      "notes": "..." }
}
```

### `PUT /admin/finance/config`
Updates one or more of: `investment`, `current_assets`, `current_liabilities`, `tax_rate`, `opex_tax_portion`. All values must be non-negative numbers.

---

## Validation / errors

| Code | When |
|---|---|
| 422 | non-date `from`/`to`, `from > to`, negative config value |
| 400 | PUT config with no fields |

---

## UI flow

```
Finance.tsx mounts
  → Promise.all([financeApi.pnl(), financeApi.ratios()])
  → GET /admin/finance/pnl + GET /admin/finance/ratios
  → charts & ratio cards render immediately
```

No UI changes — only `src/lib/api/finance.ts` was swapped from mock data to live endpoints.
