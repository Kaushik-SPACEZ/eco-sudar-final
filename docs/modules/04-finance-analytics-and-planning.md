# Module 04 — Finance Analytics & Planning

**Covers features:** #13 Expense analysis with graphics · #12 Reports analytics · #15 Budget vs
Actual · #14 Benchmark values
**Value chain:** Financial planning & analysis (FP&A)
**Depends on:** Module 00 (settings/taxonomy, snapshots), Module 01 (cost/COGS), Module 02
(revenue/payments)
**Status:** Deep-dive spec v1.0 (planner + builder view)

> **Business-optimizer thesis.** Phase 1 gives Eco Sudar a P&L; Phase 2 makes finance a steering
> wheel, not a rear-view mirror. With true cost (procurement/inventory) and true cash
> (payments) now flowing in, this module adds **visual expense analysis**, **richer report
> analytics**, **budgets to plan against**, and **benchmarks to measure against** — so the owner
> can see where money goes, set targets, and get alerted the moment actuals drift. The goal is
> management by variance: plan once, then only react to the gaps.

---

## 0. Contents

1. Module overview & optimization thesis
2. Personas & roles
3. Functional map
4. Finance data model: what "revenue", "cost", "profit" mean here
5. Sub-module A — Expense Analysis with Graphics (#13)
6. Sub-module B — Reports Analytics (#12)
7. Sub-module C — Budget vs Actual (#15)
8. Sub-module D — Benchmark Values (#14)
9. Data architecture
10. API surface
11. UX / screen specifications
12. Business rules & definitions
13. KPIs & dashboards
14. Automation & optimization opportunities
15. Configuration & settings
16. Integrations
17. Acceptance criteria & test scenarios
18. Rollout plan

---

## 1. Module overview & optimization thesis

Four capabilities that together form an FP&A layer:

- **Expense analytics (#13):** see spend by category, vendor, month, and trend — find the
  controllable cost drivers.
- **Reports analytics (#12):** elevate the existing reports (sales/orders/payments/expenses/
  forecast) from row dumps to charts + aggregates + exports.
- **Budget vs Actual (#15):** set a plan per category/period and watch actuals against it with
  variance and RAG status.
- **Benchmarks (#14):** define target ratios/values (margin, expense ratio, revenue) and measure
  live performance against them.

**Optimization outcomes:** cost discipline (visible drivers + budget guardrails), early warning
(variance/benchmark alerts), and target-driven management instead of gut feel.

---

## 2. Personas & roles

| Persona | Role | Does here |
|---|---|---|
| Owner | `owner` | Sets budgets/benchmarks, reads dashboards, makes calls. |
| Accountant | `accountant` | Maintains budgets, reconciles actuals, runs reports/exports. |

---

## 3. Functional map

```
Finance Analytics & Planning
├── Expense analytics (graphics)
│   ├── By category (pie/treemap) · by vendor · by month (stacked bar)
│   ├── Trend line & MoM delta · top spends
│   └── Drill-through to expense list
├── Reports analytics
│   ├── Module reports w/ charts (sales/orders/payments/expenses/forecast)
│   ├── Revenue-vs-expense overlay · cashflow view
│   └── Export (CSV/XLSX/PDF)
├── Budget vs Actual
│   ├── Budget definition (category × period)
│   ├── Actuals mapping (expenses, COGS, revenue)
│   ├── Variance ₹/% + RAG
│   └── Breach alerts
└── Benchmarks
    ├── Target metrics (margin, expense ratio, revenue, AOV...)
    ├── Live actual vs target + RAG
    └── Benchmark alerts
```

---

## 4. Finance data model: what "revenue", "cost", "profit" mean here

To avoid the Phase-1 confusion, definitions are **centralized in one Finance service** and reused
by Dashboard, Reports, Finance, and module tiles (single source of truth, P7):

- **Revenue** = paid orders + paid manual invoices (already wired in Phase 1.5). Cash-based by
  default; an accrual view (invoiced regardless of payment) is offered as a toggle.
- **COGS** = stock-out value at moving-average cost (from Module 01) once inventory is live;
  until then, material expenses approximate it.
- **Gross profit** = revenue − COGS; **gross margin %** = gross profit ÷ revenue.
- **Operating expenses** = `expenses` excluding COGS categories.
- **Net profit** = gross profit − opex − taxes (existing P&L logic, refined with real COGS).
- **Category taxonomy** is shared (Module 00 §10): expense categories == budget categories ==
  COGS categories, so actuals map to budgets with no reconciliation.

---

## 5. Sub-module A — Expense Analysis with Graphics (#13)

**Purpose.** Make expense behavior visible and drillable so cost drivers are obvious.

**Functionalities & elements**
- **Breakdowns:** by category (pie/treemap), by vendor (top-N bar), by month (stacked bar by
  category), trend line with **month-over-month delta** and moving average.
- **Top spends:** largest individual expenses and largest categories in the window.
- **Comparisons:** period-over-period (this month vs last, this year vs last).
- **Drill-through:** click a slice/bar → filtered expense list for that category/vendor/month.
- **Source:** existing `expenses` + PO bills (Module 01) for a complete spend picture.

**Business optimization.** Turns a flat expense list into "where is my money actually going and
is it rising?" — the first step to controlling it. Vendor spend concentration also informs
negotiation (ties to Module 01 vendor performance).

---

## 6. Sub-module B — Reports Analytics (#12)

**Purpose.** Upgrade the existing `AdminReportsController` modules (sales, orders, payments,
expenses, forecast) with chart views, combined overlays, and robust exports.

**Functionalities & elements**
- **Per-module charts:** sales/revenue trend, orders volume, payments inflow, expense trend,
  naive forecast — rendered as time series.
- **Overlays:** revenue-vs-expense (profitability over time), cash-in-vs-out (liquidity).
- **Aggregates:** totals, averages, growth %, best/worst periods.
- **Filtering:** shared date-range + module selector; consistent window across charts.
- **Exports:** every report to CSV/XLSX/PDF (reuse `exporters`), server-chunked for large ranges.

**Business optimization.** One place to answer "how are we trending and where's the money?",
with exports for the CA/bank/investors — reducing ad-hoc report requests to self-service.

---

## 7. Sub-module C — Budget vs Actual (#15)

**Purpose.** Plan spend/revenue by category and period, then track reality against the plan.

**Functionalities & elements**
- **Budget definition:** `budgets` (name, fiscal year, period type monthly/quarterly/yearly,
  active) with `budget_lines` (category, period `YYYY-MM`/`YYYY-Qn`, amount). Editable grid
  (category × period).
- **Actuals mapping:** for each category/period, actual = Σ expenses in that category (+ COGS for
  material; revenue line uses revenue). Driven by the shared taxonomy so it "just lines up".
- **Variance & RAG:** variance ₹ = actual − budget; variance % ; RAG (green ≤ budget, amber
  within X% over, red beyond) — thresholds configurable.
- **Views:** category roll-up for a period; one category across periods (trend vs budget);
  whole-year summary.
- **Rolling forecast (fast-follow):** project year-end from run-rate vs budget.
- **Alerts:** category breach (actual > budget by threshold) → notification.

**Business optimization.** Gives the owner a plan to hold the business to and an early-warning
when a category overruns — converting finance from "what happened last month" to "are we on
track, and where aren't we?"

---

## 8. Sub-module D — Benchmark Values (#14)

**Purpose.** Define target performance values and measure the live business against them.

**Functionalities & elements**
- **Benchmarks:** `benchmarks` (metric, target_value, unit %/INR/x, comparison gte/lte, notes).
  Examples: gross margin ≥ 35%, expense ratio ≤ 25%, monthly revenue ≥ ₹X, AOV ≥ ₹Y, avg
  payment days ≤ 30, inventory turns ≥ Z.
- **Live actual:** computed from the Finance service / module metrics (reuses
  `AdminFinanceController::ratios` and module KPIs).
- **Status:** RAG vs target (respecting gte/lte direction); trend arrow vs last period.
- **Benchmark board:** gauge/scorecard per metric; alerts when a metric crosses its target.
- Extends the existing `finance_config` targets into a managed, multi-metric set.

**Business optimization.** Encodes the owner's definition of "healthy" into the system so the
dashboard self-assesses — red/amber/green at a glance, with alerts when performance slips below
target. Targets become shared, explicit, and tracked rather than implicit.

---

## 9. Data architecture

**Tables** (DDL in master plan §10): `budgets`, `budget_lines`, `benchmarks`. Plus optional
daily/monthly finance rollup snapshot for fast dashboards. Analytics otherwise read existing
`expenses`, `invoices`, `payments`, `orders`, `purchase_orders`, `stock_movements`.

**Invariants**
- Budget actuals and analytics use the **same** revenue/cost definitions as the rest of the ERP
  (one Finance service).
- Category taxonomy identical across expenses, budgets, COGS.

---

## 10. API surface

```
GET  /admin/expenses/analytics?from&to        category/vendor/month/trend/top
GET  /admin/reports/analytics?module&from&to   chart series + aggregates
GET  /admin/finance/overlay?from&to            revenue-vs-expense, cash-in-vs-out
GET  /admin/budgets                            list
POST /admin/budgets                            create + lines
PUT  /admin/budgets/{id}                        edit lines
GET  /admin/budgets/{id}/vs-actual?period       variance + RAG
GET  /admin/benchmarks                          list
POST /admin/benchmarks                          create/update
GET  /admin/benchmarks/status                   target vs actual + RAG
POST /admin/finance/rollup/recompute            (optional) refresh snapshot
```
All owner/accountant-guarded; read endpoints cached via React Query.

---

## 11. UX / screen specifications

- **Expenses (`Expenses.tsx`) — Analytics tab:** category pie, monthly stacked bar, trend line +
  MoM delta, top-spend list, vendor bar; click-through to filtered list; date range.
- **Reports (`Reports.tsx`) — chart views:** per-module charts + revenue/expense overlay +
  cashflow; export buttons.
- **Budgeting (`Budgeting.tsx`):** budget editor grid (category × period, inline edit);
  Budget-vs-Actual view (grouped bars budget vs actual + variance table with RAG); category trend
  vs budget; year summary.
- **Benchmarks (panel in `Finance.tsx` or `Budgeting.tsx`):** scorecard/gauges target vs actual
  with RAG + trend arrows; edit targets.
- **Dashboard tiles:** budget breaches, red benchmarks, expense MoM spike.
- **States:** charts handle empty/large data; all figures reconcile to underlying lists.

---

## 12. Business rules & definitions

- One Finance service owns revenue/COGS/profit definitions; all screens consume it.
- Actuals map to budgets/benchmarks via the shared category taxonomy and the canonical metric
  definitions; no per-screen redefinition.
- RAG thresholds configurable; benchmark direction (gte/lte) respected.
- Date windows consistent across a screen; server is the source of truth for aggregates.
- Cancelled/void documents excluded from actuals.

---

## 13. KPIs & dashboards

| KPI | Definition | Decision |
|---|---|---|
| Gross margin % | (revenue − COGS) ÷ revenue | Pricing & cost control |
| Expense ratio | opex ÷ revenue | Overhead discipline |
| Net profit / margin | per P&L | Overall health |
| Budget variance | actual − budget (₹,%) by category | Where to cut/investigate |
| Benchmark RAG | actual vs target | At-a-glance health |
| Cash in vs out | payments in vs out + expenses | Liquidity |
| Top cost drivers | largest categories/vendors | Negotiation/cutting targets |

---

## 14. Automation & optimization opportunities

1. **Variance alerts:** auto-notify when a category exceeds budget by the threshold — no manual
   month-end discovery.
2. **Benchmark self-assessment:** dashboard turns red/amber/green automatically; owner sees
   health without analysis.
3. **Forecast vs budget (fast-follow):** project year-end from run-rate and flag categories
   trending to overspend.
4. **Cost-driver spotlight:** monthly "biggest spend movers" summary.
5. **Margin watch:** alert when gross margin drops below benchmark (ties to price-vs-cost from
   Modules 01/03).
6. **Cash-runway view:** combine receivables, payables, and expense run-rate into a simple
   runway indicator.

---

## 15. Configuration & settings

- Shared category taxonomy (with COGS flag per category); RAG thresholds; benchmark targets &
  directions; revenue basis (cash vs accrual) default; fiscal-year start; snapshot schedule.

---

## 16. Integrations

- **Procurement/Inventory (Module 01):** COGS, inventory value, vendor spend.
- **Sales/Billing (Module 02):** revenue, receivables, payments (cash in/out).
- **Dealer/Customer (Module 03):** customer revenue, payment behavior.
- **Existing Finance/Dashboard/Reports:** reuse and refine the current P&L/ratios endpoints; one
  definition set everywhere.
- **Notifications (Module 00):** budget breach, benchmark red, expense spikes.

---

## 17. Acceptance criteria & test scenarios

**Acceptance**
- Expense analytics totals reconcile with the expense list for the same window; drill-through
  filters correctly.
- Define a monthly budget for a category; actual spend shows correct variance ₹/% and RAG;
  breach triggers an alert.
- Benchmark gross-margin target shows green when actual ≥ target, red when below; respects
  gte/lte.
- Reports charts render for empty and large datasets; exports match on-screen figures.

**Test scenarios**
- Category taxonomy mismatch impossible (single source); renaming a category updates both budget
  and actuals mapping.
- Revenue cash vs accrual toggle changes figures consistently across screens.
- Large date-range export streams without memory exhaustion.
- Cancelled invoice/expense excluded from actuals and analytics.

---

## 18. Rollout plan

| Step | Ship (Batch) | Why |
|---|---|---|
| 1 | Expense + report analytics (4.1) | Read-only; immediate visibility; low risk |
| 2 | Budget vs Actual + Benchmarks (4.2) | Planning layer; needs taxonomy + real COGS/cash |

Build after Modules 01–02 produce complete cost and cash data, so the analytics are truthful.
Centralize the Finance definitions service first; everything else reads from it.

---

*Finance Analytics & Planning turns the books into a control system: see the drivers, set the
plan and the targets, and let variance/benchmark alerts surface the few decisions that matter.*
