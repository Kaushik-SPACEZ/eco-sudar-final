# Module 03 — Dealer Network & Customer Intelligence

**Covers features:** #5 Dealer page mapping + price mapping + customer dedupe · #6 Customer data
analytics
**Value chain:** Channel management + Customer intelligence
**Depends on:** Module 00 (RBAC, audit), Module 01/02 (orders, invoices, payments)
**Status:** Deep-dive spec v1.0 (planner + builder view)

> **Business-optimizer thesis.** Eco Sudar sells both directly and through dealers. Today the
> dealer channel is informal: dealers' customers, their special prices, and whether a "new"
> direct sign-up is actually an existing dealer customer are all invisible — causing pricing
> leakage, channel conflict, and double-counting. This module gives each dealer a controlled
> workspace with their own price list and customer book, **automatically detects and resolves
> customer overlaps**, and turns the resulting transaction history into **customer intelligence**
> (who buys, how much, how fast they pay) that drives retention and credit decisions.

---

## 0. Contents

1. Module overview & optimization thesis
2. Personas & roles
3. Functional map
4. Sub-module A — Dealer workspace & landing (#5)
5. Sub-module B — Dealer price mapping (#5)
6. Sub-module C — Customer dedupe & linking (#5)
7. Sub-module D — Customer data analytics (#6)
8. Data architecture & state machines
9. API surface
10. UX / screen specifications
11. Business rules, validations & exceptions
12. KPIs, dashboards & reports
13. Automation & optimization opportunities
14. Configuration & settings
15. Integrations
16. Acceptance criteria & test scenarios
17. Rollout plan

---

## 1. Module overview & optimization thesis

Two intertwined capabilities:

- **Channel control (#5):** dealers get a self-service landing to manage *their* customers and
  see *their* prices; the system maps dealer↔customer relationships and prevents the channel
  conflict of a dealer's customer registering "fresh" and getting direct pricing.
- **Customer intelligence (#6):** every order/invoice/payment becomes insight — purchase trend,
  spend, outstanding, and **payment speed** — so the business can prioritise high-value
  customers, tighten credit on slow payers, and spot churn.

**Optimization outcomes:** plugged pricing leakage, clean channel attribution (real dealer
performance), faster and safer credit decisions, targeted retention, and a single de-duplicated
customer master.

---

## 2. Personas & roles

| Persona | Role | Does here |
|---|---|---|
| Dealer | `dealer` | Adds/maintains own customers, sees own price list, raises orders at dealer price. |
| Sales/Owner | `sales`/`owner` | Manages dealers, sets price lists, resolves customer conflicts. |
| Accountant/Owner | `accountant`/`owner` | Uses customer analytics for credit & collections. |

**Data scoping (critical):** every dealer route is hard-scoped to `dealer_id = authenticated
user`. A dealer can never see another dealer's customers, prices, or analytics.

---

## 3. Functional map

```
Dealer Network & Customer Intelligence
├── Dealer workspace (landing)
│   ├── Dealer profile & status
│   ├── My customers (CRUD, scoped)
│   ├── My price list (read)
│   └── Raise order at dealer price (integration)
├── Dealer price mapping
│   ├── Price lists per dealer
│   ├── Per-product price overrides
│   ├── Effective-price resolution on order/invoice
│   └── Bulk price update / import
├── Customer dedupe & linking
│   ├── Match on registration (phone/email/GSTIN)
│   ├── Auto-link vs conflict queue
│   ├── Dealer attribution of a customer
│   └── Merge duplicates (admin)
└── Customer data analytics
    ├── Per-customer 360 (purchase, payment speed, outstanding, recency)
    ├── Monthly purchase & payment trend
    ├── Segmentation (RFM-lite, value tiers)
    ├── Slow-payer & churn-risk lists
    └── Customer metrics snapshot (fast dashboards)
```

---

## 4. Sub-module A — Dealer workspace & landing (#5)

**Purpose.** A focused, role-scoped area where a dealer manages their book of business.

**Functionalities & elements**
- **Dealer profile:** dealers are `users` with `user_type='dealer'`; profile shows code,
  contact, region, assigned price list(s), status.
- **My customers:** scoped CRUD over `dealer_customers` (name, phone, email, GSTIN, address,
  assigned price list, link status). Add a customer = the dealer's primary daily action.
- **My price list:** read-only view of the dealer's effective product prices.
- **Raise order/quote at dealer price:** create an order/quotation for one of their customers
  with prices defaulted from the dealer price list (integration with O2C).
- **Dealer dashboard:** their customer count, recent orders, outstanding, this-month volume.

**Business optimization.** Turns dealers into an extension of the sales system (self-service
data entry, consistent pricing) instead of an off-system relationship — improving data quality
and channel visibility at zero extra admin effort.

---

## 5. Sub-module B — Dealer price mapping (#5)

**Purpose.** Different dealers get different agreed prices per product; the system applies them
automatically so pricing is consistent and leak-proof.

**Functionalities & elements**
- **Price lists:** `dealer_price_lists` (a dealer can have one active list; support named lists
  for versioning); `dealer_price_items` (product → unit_price, unique per list+product).
- **Assignment:** a dealer (and/or a `dealer_customer`) is assigned a price list.
- **Effective-price resolution (precedence):** line price defaults from
  (1) customer's assigned price list → (2) dealer's default price list → (3) product base price.
  Override allowed by authorized roles, with audit.
- **Maintenance:** edit grid (product × price), bulk update (e.g. +5% across a list), import via
  the data spine; effective-date/versioning as a fast-follow.
- **Guardrails:** warn if a dealer price is below cost (margin protection) using inventory
  avg_cost (Module 01).

**Business optimization.** Eliminates ad-hoc pricing and the leakage of giving wrong (often too
low) prices; the below-cost guardrail protects margin; bulk update makes price revisions a
2-minute task instead of a spreadsheet exercise.

---

## 6. Sub-module C — Customer dedupe & linking (#5)

**Purpose.** Prevent the same real customer existing twice (once under a dealer, once direct) —
the root of channel conflict and double-counted analytics — by detecting overlaps on
registration and resolving them.

**Matching logic**
- On **direct app registration** (existing `AuthController` register) and on **dealer adding a
  customer**, normalize and match against existing `users` + `dealer_customers` by:
  - **Phone** (normalized, last 10 digits) — strong key.
  - **GSTIN** (exact) — strongest key for B2B.
  - **Email** (lowercased) — medium key.
- **Resolution:**
  - **Exact strong-key match (phone/GSTIN):** auto-link — set `dealer_customers.customer_id`,
    `link_status='linked'`; notify the dealer ("your customer X registered directly").
  - **Weak/ambiguous match:** `link_status='conflict'` → lands in an **admin conflict queue** for
    a human decision (link / keep separate / merge).
  - **No match:** create normally (`dealer_added` or direct).
- **Merge (admin):** combine duplicate customer records, re-pointing orders/invoices/payments to
  the surviving `user_id` (transactional, audited) — never silent.

**Why exact-key only (not fuzzy name):** fuzzy matching causes wrong auto-links; names repeat
("Sri Traders"). Strong keys auto-link safely; everything else is queued for human judgement (P6).

**Business optimization.** One clean customer per real entity → correct dealer attribution,
correct customer analytics, no double pricing, and a fair basis for dealer incentives.

---

## 7. Sub-module D — Customer data analytics (#6)

**Purpose.** Convert transaction history into decisions: who matters, who's slow, who's leaving.

**Metrics (defined precisely)**
- **Total spend / total orders / AOV** from invoices (or orders) per customer.
- **Outstanding** = Σ invoice totals − Σ payments (open balance).
- **Avg payment days** = mean(`payments.paid_on − invoices.invoice_date`) over paid invoices —
  the "how quick is payment made" metric explicitly requested.
- **Monthly purchase trend** = Σ invoice totals by `YYYY-MM`.
- **Recency** = days since last order; **churn-risk** = no order in N days (config).
- **RFM-lite segmentation:** Recency × Frequency × Monetary tiers → Champions / Loyal /
  At-risk / Dormant.
- **Payment behavior tier:** fast / on-time / slow based on avg payment days vs terms.

**Delivery & performance**
- **Live** for a single customer's 360 (bounded queries).
- **Snapshot** (`customer_metrics`) for portfolio dashboards (top customers, slow payers,
  churn-risk), refreshed on demand/scheduled — fast on shared hosting (Module 00 §13).

**Business optimization.** The owner can instantly answer "who are my top 10 customers, who owes
me the most, who pays slowest, who's about to churn?" — enabling targeted collection calls,
credit-limit tightening on slow payers, and retention outreach to at-risk high-value customers.
This is revenue protection and growth, not just reporting.

---

## 8. Data architecture & state machines

**Tables** (DDL in master plan §9): `dealer_price_lists`, `dealer_price_items`,
`dealer_customers`, `customer_metrics` (snapshot). Dealers/customers are `users`.

**Invariants**
- A `dealer_customer` with `customer_id` set is `linked`; analytics dedup by `user_id`.
- `customer_metrics` is derived; a recompute fully rebuilds it (idempotent).

**State machine (customer link)**
```
dealer_added → linked            (strong-key match or manual link)
dealer_added → conflict → linked | separate | merged   (admin decision)
```

---

## 9. API surface

**Dealer (role `dealer`, scoped)**
```
GET  /dealer/profile
GET  /dealer/customers              own customers
POST /dealer/customers              add (runs dedupe)
PUT  /dealer/customers/{id}
GET  /dealer/price-list             effective prices
POST /dealer/orders                 raise order at dealer price (O2C)
GET  /dealer/dashboard              own KPIs
```
**Admin**
```
GET  /admin/dealers                       list dealers + status
GET  /admin/dealers/{id}                   dealer 360 (customers, prices, performance)
GET  /admin/dealer-price-lists             CRUD
PUT  /admin/dealer-price-lists/{id}/items  bulk price update
POST /admin/dealer-price-lists/import      price import
GET  /admin/dealer-customers               all mappings + filters
GET  /admin/dealer-customers/conflicts     conflict queue
POST /admin/dealer-customers/{id}/resolve  link/separate
POST /admin/customers/merge                merge duplicates (re-point txns)
GET  /admin/customers/{id}/analytics       customer 360
GET  /admin/customers/analytics/summary    top/slow/churn-risk
POST /admin/customer-metrics/recompute     rebuild snapshot
```
Registration hook (existing `AuthController`) returns dealer-link result.

---

## 10. UX / screen specifications

- **Dealer landing (new route, role `dealer`):** dashboard cards (customers, orders, outstanding,
  month volume), "My Customers" table + add dialog (with inline "possible existing customer"
  hint when a match is detected), "My Prices" read-only grid, "New Order" flow.
- **Dealers admin (`Dealers.tsx` extended):** dealer list + 360 drawer (customers, price list
  editor grid, performance charts); price bulk-update tool; price import.
- **Conflict queue (`Dealers.tsx` tab or `CustomerConflicts.tsx`):** list of `conflict` rows with
  side-by-side comparison (existing vs incoming) and link/separate/merge actions.
- **Customers (`Customers.tsx` extended) — Analytics tab:** per-customer monthly spend bar,
  payment-speed gauge, outstanding, recency; portfolio view with top customers, slow payers
  (sorted by avg payment days), churn-risk list; export.
- **States:** dedupe hints are non-blocking; merges confirm and show what will be re-pointed.

---

## 11. Business rules, validations & exceptions

- Dealer routes strictly scoped to the authenticated dealer; cross-dealer access = 403.
- Dedupe auto-links only on exact phone/GSTIN; everything else → conflict queue.
- Merge re-points orders/invoices/payments transactionally; audited; irreversible (warn).
- Price below cost → warning (block configurable for owner-only override).
- Analytics exclude cancelled invoices; outstanding nets payments; snapshot recompute idempotent.

---

## 12. KPIs, dashboards & reports

| KPI | Definition | Decision |
|---|---|---|
| Dealer sales contribution | Σ sales attributed per dealer | Channel performance / incentives |
| Active dealers | dealers with an order in N days | Channel health |
| Customer concentration | top-N customers' % of revenue | Dependency risk |
| Avg payment days (customer) | mean(paid_on − invoice_date) | Credit policy |
| Slow payers | customers above terms | Collections priority |
| Churn-risk customers | no order in N days, prior value high | Retention outreach |
| Price-list coverage | products priced per list | Pricing completeness |

Reports: Dealer performance, Customer 360, AR by customer, Segmentation, Price-list register.

---

## 13. Automation & optimization opportunities

1. **Smart dedupe at the door:** stop duplicates before they exist, with dealer notification —
   protects channel attribution automatically.
2. **Credit-limit suggestions:** propose limits from payment behavior + value tier; alert when an
   order would breach it.
3. **Collections worklist:** auto-prioritised list (highest overdue × slowest payer first) for
   the accountant each morning.
4. **Retention triggers:** churn-risk high-value customers surface for proactive outreach.
5. **Dealer price governance:** below-cost and stale-price alerts keep margins safe.
6. **Win-back / upsell signals:** declining monthly trend flags accounts to re-engage.

---

## 14. Configuration & settings

- Dedupe keys & strength; churn-risk window N days; value-tier thresholds; payment-terms days.
- Price precedence order; below-cost block on/off; default dealer price list.
- Snapshot refresh schedule.

---

## 15. Integrations

- **O2C (Module 02):** dealer prices default onto orders/quotations/invoices; payments feed
  payment-speed.
- **Inventory (Module 01):** avg_cost powers the below-cost guardrail.
- **Auth (existing):** registration runs dedupe.
- **Finance (Module 04):** customer revenue/outstanding feed working-capital & revenue analytics.
- **Notifications (Module 00):** conflict queue, churn-risk, credit-breach, dealer alerts.

---

## 16. Acceptance criteria & test scenarios

**Acceptance**
- Dealer adds a customer with a price list; that price defaults on the customer's invoice.
- A direct registration matching an existing dealer customer's phone/GSTIN auto-links and
  notifies the dealer; an ambiguous case lands in the conflict queue.
- Customer with varied payment dates shows correct avg-payment-days and monthly trend; slow-payer
  list ranks correctly; outstanding = invoices − payments.
- Dealer A cannot access Dealer B's data (403).

**Test scenarios**
- Phone-normalization edge cases (+91, spaces, leading 0) match correctly.
- Merge re-points all transactions; analytics no longer double-count.
- Below-cost price triggers warning; owner override audited.
- Snapshot recompute matches live aggregation for a sample customer.

---

## 17. Rollout plan

| Step | Ship (Batch) | Why |
|---|---|---|
| 1 | Dealer workspace + price mapping + dedupe (3.1) | Channel control; protects pricing & attribution |
| 2 | Customer analytics + snapshot (3.2) | Needs clean (deduped) customers + payments (2.1) |

Build dedupe before analytics so the analytics run on a clean master. Enforce dealer scoping
from day one (security-critical).

---

*Dealer & Customer Intelligence protects the channel and mines the relationship. Keep dealer
data strictly scoped, auto-resolve only safe (exact-key) customer overlaps, and turn payment
history into the collections and retention actions that protect cash and revenue.*
