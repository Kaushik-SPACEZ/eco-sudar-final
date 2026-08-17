# Module 01 — Procurement & Inventory

**Covers features:** #2 Purchase Request · #4 Purchase Order · #7 Inventory (Zoho-referenced)
**Value chain:** Procure-to-Pay (P2P)
**Depends on:** Module 00 (numbering, RBAC, audit, files, settings)
**Status:** Deep-dive spec v1.0 (planner + builder view)

> **Business-optimizer thesis.** For a manufacturer like Eco Sudar, *material cost is the
> business*. Today purchasing and stock live in memory, paper, and WhatsApp — which means no one
> truly knows what's on hand, what's on order, what each batch of pellets actually cost, or
> whether a supplier is reliable. This module turns procurement into a controlled,
> approval-gated, costed flow and gives the business a real-time, auditable inventory with a
> moving-average cost that finally makes gross-margin and Budget-vs-Actual numbers truthful.

---

## 0. Contents

1. Module overview & optimization thesis
2. Personas, roles & responsibilities
3. Functional map (functionalities → sub-functionalities → elements)
4. End-to-end process flows
5. Sub-module A — Vendor Master
6. Sub-module B — Purchase Requests (PR)
7. Sub-module C — Purchase Orders (PO)
8. Sub-module D — Goods Receipt (GRN)
9. Sub-module E — Inventory & Stock Ledger
10. Costing model (moving average) & valuation
11. Data architecture & state machines
12. API surface (complete)
13. UX / screen specifications
14. Business rules, validations & exceptions
15. KPIs, dashboards & reports
16. Automation & optimization opportunities
17. Configuration & settings
18. Integrations with other modules
19. Acceptance criteria & test scenarios
20. Rollout plan within the module

---

## 1. Module overview & optimization thesis

The Procure-to-Pay chain is: **need → request (PR) → approval → order (PO) → receive (GRN) →
stock in → cost & pay**. Each step adds control and data:

- **PR** captures demand with an approval gate → stops unplanned spend.
- **PO** commits to a vendor with agreed price + GST → a contract record, not a phone call.
- **GRN** records what physically arrived → reconciles ordered vs received, flags shortages.
- **Stock ledger** makes on-hand real-time and auditable → no stockouts, no overbuying.
- **Moving-average cost** gives every unit a true landed cost → real COGS, real margin.

**Why it's first in Phase 2:** greenfield (no legacy data to migrate), unlocks accurate cost
data that Finance Analytics (Module 04) depends on, and delivers immediate operational control.

**Optimization outcomes (measurable):** reduced emergency purchases, fewer stockouts, visibility
of slow/dead stock (cash tied up), supplier performance to negotiate better, and a defensible
cost basis for pricing decisions.

---

## 2. Personas, roles & responsibilities

| Persona | Role | Does in this module |
|---|---|---|
| Store-keeper / Production | `store_keeper` | Raises PRs, receives goods (GRN), makes stock adjustments, monitors low stock. |
| Purchaser / Owner | `owner` | Approves PRs, issues POs, manages vendors, negotiates price. |
| Accountant | `accountant` | Approves spend, converts received POs into bills/expenses, monitors payables. |
| Owner | `owner` | Sees valuation, supplier performance, dead-stock, approves high-value POs. |

**Separation of duties (control):** the person who *requests* (store_keeper) should not be the
person who *approves* (owner/accountant); the person who *receives* (store_keeper) records
physical reality, while the person who *pays* (accountant) acts on it. RBAC enforces this.

---

## 3. Functional map

```
Procurement & Inventory
├── Vendor Master
│   ├── Vendor CRUD (code, GSTIN, contact, terms, address/state)
│   ├── Vendor status (active/inactive)
│   ├── Vendor search & dedupe (by GSTIN/name)
│   ├── Vendor performance (derived: on-time %, price trend, return rate)
│   └── Vendor ledger view (POs, receipts, spend)
├── Purchase Requests
│   ├── Raise PR (lines: item, qty, unit, est. price, need-by)
│   ├── Draft / submit / approve / reject / convert lifecycle
│   ├── Priority & department tagging
│   ├── Approval routing (by amount threshold)
│   └── PR → PO conversion (one or many POs)
├── Purchase Orders
│   ├── Create PO (from PR or blank), vendor, lines, GST, charges
│   ├── Issue / cancel / amend lifecycle
│   ├── PO PDF (printable / emailable)
│   ├── Partial & full receipt tracking
│   ├── Bill/expense posting (cost into finance)
│   └── PO payment status (unpaid/partial/paid)
├── Goods Receipt (GRN)
│   ├── Receive against PO lines (≤ outstanding qty)
│   ├── Quality check / accept-reject (optional)
│   ├── Auto stock-in posting + cost capture
│   └── Shortage / over-receipt handling
└── Inventory
    ├── On-hand by product/location (real-time)
    ├── Immutable movement ledger (in/out/adjust/opening)
    ├── Moving-average costing & valuation
    ├── Reorder levels & low-stock alerts
    ├── Stock adjustments (with reason)
    ├── Multi-location (optional)
    ├── Stock reconciliation (cache vs ledger)
    └── Dead/slow-stock & ageing analytics
```

---

## 4. End-to-end process flows

### 4.1 Plan-to-stock (happy path)
1. Store-keeper raises **PR** (3 items, need-by date) → status `submitted`.
2. Owner reviews, **approves** → `approved` (audit logged).
3. Purchaser **converts** approved PR → **PO** to a chosen vendor; prices + GST filled (vendor
   state drives CGST/SGST vs IGST). PO `draft`.
4. Purchaser **issues** PO → `issued`; PO PDF emailed to vendor.
5. Goods arrive; store-keeper creates **GRN**, receiving 5 of 5 on line A and 3 of 5 on line B.
6. System posts **stock-in** movements, updates `on_hand` and **moving-average cost**; PO →
   `partially_received` (line B short).
7. Remaining 2 of line B arrive → second GRN → PO `received`.
8. Accountant **posts the bill** (expense/payable) → cost flows into Finance; PO `billed`.
9. Payments to vendor recorded (Module 02 payments, direction `out`) → PO `paid`.

### 4.2 Exception flows
- **PR rejected:** owner rejects with reason → `rejected`; requester notified; can clone & revise.
- **Over-receipt attempt:** GRN line qty > outstanding → blocked server-side (409) with the
  residual quantity in the message.
- **Short/again:** partial receipts accumulate `received_qty`; PO stays `partially_received`
  until all lines complete or it's manually closed (owner) as short-closed.
- **PO cancellation:** only before any receipt; after partial receipt, only the unreceived
  balance can be cancelled (short-close), preserving the received history.
- **Damaged goods:** GRN quality step rejects qty → not added to stock; recorded as returned.

---

## 5. Sub-module A — Vendor Master

**Purpose.** The supplier directory and the anchor for spend analytics and GST on purchases.

**Functionalities & elements**
- **CRUD:** code (auto via numbering or manual), legal name, GSTIN (validated format),
  contact person, phone, email, billing address, **state** (drives purchase GST direction),
  payment terms, active flag, notes.
- **Dedupe:** on create, warn if GSTIN or normalized name already exists.
- **Vendor 360:** tabs for Overview, POs, Receipts, Spend (Σ by month), Performance.
- **Performance (derived, no extra entry):**
  - On-time delivery % = receipts on/before `expected_date` ÷ receipts.
  - Price trend per product (from PO line history) → spot creeping prices.
  - Short-supply rate = lines short-received ÷ lines.
- **Status:** soft-deactivate (never hard-delete a vendor with history).

**Business optimization.** Vendor performance turns purchasing from relationship-by-memory into
data-backed negotiation; spend concentration shows dependency risk.

---

## 6. Sub-module B — Purchase Requests (PR)

**Purpose.** Demand capture with an approval gate — the control that prevents unbudgeted spend.

**Functionalities & elements**
- **PR header:** number (`PR-YYYY-####`), requester (auto = logged-in staff), department,
  need-by date, priority (low/normal/high/urgent), notes.
- **PR lines:** description, optional `product_id` (catalog link), quantity, unit, estimated
  unit price, sort order. Uses the shared `<DocumentLineEditor>`.
- **Lifecycle:** draft → submitted → approved/rejected → converted → closed.
- **Approval routing (configurable):** auto-approve below ₹X (config), require owner above; high
  value (≥ ₹Y) may require owner + accountant. Routing rules in settings.
- **Conversion:** approved PR → one PO (all lines) or split into multiple POs by vendor; lines
  carry to PO; PR marked `converted` and linked.
- **Cloning:** repeat recurring requests quickly.

**Validations:** ≥1 line with qty>0; only `draft` editable; submit requires complete lines;
approve requires `submitted`; reject requires reason.

**Business optimization.** Forces a moment of "do we need this, who approved it?" before money
is committed — and creates the demand signal that, over time, informs reorder levels and
budgets.

---

## 7. Sub-module C — Purchase Orders (PO)

**Purpose.** The formal, costed, GST-correct commitment to a vendor and the spine of receiving.

**Functionalities & elements**
- **Header:** number (`PO-YYYY-####`), vendor, source PR (optional), order date, expected date,
  seller state (Eco Sudar) + vendor state (GST direction), notes.
- **Lines:** description, `product_id`, HSN, quantity, unit, unit price, GST rate, line total,
  `received_qty` (tracked), sort order. Tax via shared **GstCalculator** (Module 00 §8).
- **Charges:** freight/other charges; document totals (subtotal, tax, charges, grand total,
  whole-rupee rounded).
- **Lifecycle:** draft → issued → partially_received → received → billed → (paid) ; or cancelled.
- **PO PDF:** branded, with vendor + ship-to, line table, tax summary, terms (reuse jsPDF
  template engine).
- **Amendment:** before issue, freely editable; after issue, controlled amendment (price/qty)
  with audit and version note; not editable after receipt of a line beyond unreceived balance.
- **Bill/expense posting:** "Create Bill" posts an `expenses` row (category = material/sub-cat)
  and/or a payable; links cost to Finance. (Payables vs expense-only is **OQ-2**.)
- **Payment status:** unpaid/partial/paid, updated by vendor payments (Module 02, direction out).

**Business optimization.** The PO is where price discipline lives: agreed price vs received vs
billed three-way match prevents overbilling; expected-date drives on-time analytics and the
"PO overdue" alert.

---

## 8. Sub-module D — Goods Receipt (GRN)

**Purpose.** Record physical reality and trigger costed stock-in — the bridge from paper to
inventory.

**Functionalities & elements**
- **GRN header:** number (`GRN-YYYY-####`), PO, received date, received-by, notes.
- **GRN lines:** per PO line, quantity received this time (≤ outstanding = `quantity −
  received_qty`); optional quality accept/reject split.
- **Auto-postings (transactional):** for each accepted qty → `stock_movements` (+in) with
  `unit_cost` from the PO line; update `stock_items.on_hand` and recompute `avg_cost`; update PO
  line `received_qty` and PO status.
- **Shortage/over handling:** over-receipt blocked; short receipt leaves PO open; repeated GRNs
  accumulate.
- **Reversal:** GRN void (owner) reverses the stock movements (compensating −out) and restores
  PO `received_qty` — never edit-in-place, always compensating entries (ledger integrity).

**Business optimization.** Eliminates "we paid for 10 tons but only 8 arrived" leakage; the
accept/reject step protects quality; receipt timing feeds vendor on-time metrics.

---

## 9. Sub-module E — Inventory & Stock Ledger

**Purpose.** A real-time, auditable picture of what's on hand, what it's worth, and what to
reorder.

**Functionalities & elements**
- **On-hand view:** per product (× location), on-hand qty, unit, reorder level, avg cost, stock
  value (on_hand × avg_cost), low-stock badge, last movement date.
- **Movement ledger (immutable):** every change is a `stock_movements` row — direction (in/out),
  qty, unit cost, ref (grn/order/adjustment/opening), note, actor, timestamp. The product
  drill-down shows the full ledger (running balance).
- **Adjustments:** `ADJ-YYYY-####` with mandatory reason (damage, count correction, sample,
  wastage); writes a movement; never silently edits on-hand.
- **Reorder & alerts:** per-product reorder level; "Low stock" list + dashboard tile +
  notification when on_hand < reorder_level.
- **Reconciliation:** owner-run endpoint verifies `on_hand == Σ movements` for every stock item
  and repairs drift, reporting discrepancies (defends the cache-vs-ledger invariant, P2).
- **Multi-location (optional, OQ-5):** locations (main store, production floor); transfers as
  paired out/in movements. Single-location default at launch.
- **Ageing & dead stock:** items with no `out` movement in N days, and ageing buckets (0–30,
  31–60, 61–90, 90+) → cash tied up in slow stock.

**Stock-out on sales (integration switch):** when an order ships (existing `orders`), post an
`out` movement. Behind a config flag (`post_stock_out_on_ship`) so it's enabled only once
opening stock is loaded — avoids negative stock before data is complete.

---

## 10. Costing model (moving average) & valuation

**Chosen method: Weighted Moving Average (WAC).** Simpler and more stable than FIFO for a
bulk-commodity manufacturer, and easy to audit.

- **On stock-in (GRN):**
  `new_avg = ((on_hand × avg_cost) + (recv_qty × recv_unit_cost)) ÷ (on_hand + recv_qty)`,
  then `on_hand += recv_qty`.
- **On stock-out:** value out at current `avg_cost` (COGS); `avg_cost` unchanged; `on_hand −= qty`.
- **On adjustment:** quantity change at current `avg_cost` (or specified cost for write-ons).
- **Valuation report:** Σ(on_hand × avg_cost) by product/category/location → the inventory asset
  value for the balance sheet and for Finance (Module 04).
- **Landed cost (optional later):** allocate freight/other PO charges across lines to enrich unit
  cost — flagged as a fast-follow, not v1.

**Business optimization.** WAC gives a defensible COGS so gross margin per product is real;
valuation surfaces cash locked in inventory; cost-trend per product flags margin erosion early.

---

## 11. Data architecture & state machines

**Tables** (DDL in the master plan §7): `vendors`, `purchase_requests` +
`purchase_request_items`, `purchase_orders` + `purchase_order_items`, `goods_receipts` +
`goods_receipt_items`, `inventory_locations`, `stock_items`, `stock_movements`.

**Key invariants**
- `stock_items.on_hand == Σ stock_movements(in) − Σ stock_movements(out)` per product/location.
- `purchase_order_items.received_qty == Σ goods_receipt_items.quantity` for that PO line.
- All cache updates occur inside the same transaction as the ledger insert.

**State machines**
```
PR:   draft → submitted → approved → converted → closed
                    └────→ rejected
PO:   draft → issued → partially_received → received → billed → paid
        └→ cancelled (pre-receipt)   └→ short_closed (owner)
GRN:  (atomic event) created → [void → reversed]
```

---

## 12. API surface (complete)

**Vendors**
```
GET    /admin/vendors                 list (search, status, paginate)
POST   /admin/vendors                 create
GET    /admin/vendors/{id}            detail + 360 summary
PUT    /admin/vendors/{id}            update
DELETE /admin/vendors/{id}            deactivate (soft)
GET    /admin/vendors/{id}/performance  on-time %, price trend, spend
```
**Purchase Requests**
```
GET    /admin/purchase-requests           list (status, dept, date)
POST   /admin/purchase-requests           create draft + lines
GET    /admin/purchase-requests/{id}      detail + lines
PUT    /admin/purchase-requests/{id}      edit (draft only)
POST   /admin/purchase-requests/{id}/submit
POST   /admin/purchase-requests/{id}/approve     (owner/accountant)
POST   /admin/purchase-requests/{id}/reject      (reason)
POST   /admin/purchase-requests/{id}/convert     (→ PO[s])
DELETE /admin/purchase-requests/{id}      delete draft
```
**Purchase Orders**
```
GET    /admin/purchase-orders             list (vendor, status, date)
POST   /admin/purchase-orders             create (from PR or blank)
GET    /admin/purchase-orders/{id}        detail + lines + receipts
PUT    /admin/purchase-orders/{id}        edit (draft) / amend (issued, controlled)
POST   /admin/purchase-orders/{id}/issue
POST   /admin/purchase-orders/{id}/cancel
POST   /admin/purchase-orders/{id}/short-close
POST   /admin/purchase-orders/{id}/bill            (post expense/payable)
GET    /admin/purchase-orders/{id}/pdf
POST   /admin/purchase-orders/{id}/receipts        (create GRN)
```
**Goods Receipts**
```
GET    /admin/goods-receipts              list
GET    /admin/goods-receipts/{id}         detail
POST   /admin/goods-receipts/{id}/void    (owner; reverses stock)
```
**Inventory**
```
GET    /admin/inventory                   on-hand + valuation + low-stock flags
GET    /admin/inventory/{productId}/movements   ledger (running balance)
POST   /admin/inventory/adjustments       create adjustment (reason)
POST   /admin/inventory/reconcile         (owner) verify & repair cache
GET    /admin/inventory/valuation         by product/category/location
GET    /admin/inventory/ageing            dead/slow stock buckets
GET    /admin/inventory/locations         CRUD (if multi-location)
```

All admin-guarded with role refinements (receive = store_keeper/owner; approve/issue =
owner/accountant; reconcile = owner).

---

## 13. UX / screen specifications

- **Vendors (`Vendors.tsx`):** searchable table (name, GSTIN, state, status, spend); create/edit
  dialog; Vendor-360 drawer with tabs (Overview/POs/Receipts/Performance) and recharts.
- **Purchase Requests (`PurchaseRequests.tsx`):** list with status filter chips; create dialog
  using `<DocumentLineEditor>`; detail with approve/reject (role-gated) and "Convert to PO"
  action; `<StatusTimeline>`.
- **Purchase Orders (`PurchaseOrders.tsx`):** list (vendor, status, expected date, overdue
  badge); create from PR (prefilled) or blank; PO detail with line table showing ordered vs
  received, "Receive" dialog (GRN), PDF button, bill action; status timeline + activity tab.
- **Inventory (`Inventory.tsx`):** stock table (on-hand, reorder, value, low-stock badge);
  product drill-down ledger with running balance; adjustment dialog; valuation summary cards;
  ageing/dead-stock view; reconcile (owner) with discrepancy report.
- **Dashboard tiles:** Low-stock count, POs awaiting approval, POs overdue, inventory value.
- **States:** all lists show loading/empty/error; destructive (cancel/void) confirm; mutations
  toast; over-receipt error shows the exact residual qty.

---

## 14. Business rules, validations & exceptions

- PR: ≥1 line qty>0; draft-only edit; approve needs submitted; reject needs reason.
- PO: lines qty>0, GST rate ∈ allowed set; totals via GstCalculator; cannot issue empty PO;
  cannot edit a line below its `received_qty`.
- GRN: per line `recv ≤ quantity − received_qty` (server-enforced, 409 on breach); transactional
  postings; void only via compensating movements.
- Inventory: adjustments need a reason; negative stock blocked unless `allow_negative_stock`
  (config); reconcile is idempotent.
- Concurrency: numbering atomic; two GRNs on the same PO line serialize on the PO row (lock).

---

## 15. KPIs, dashboards & reports

| KPI | Definition | Decision it drives |
|---|---|---|
| Inventory value | Σ on_hand × avg_cost | Cash tied in stock; balance sheet |
| Stock turns | COGS ÷ avg inventory value | Over/under-stocking |
| Low-stock items | on_hand < reorder_level | Reorder now |
| Dead stock | no out-movement in N days | Liquidate / stop buying |
| PO cycle time | issue → fully received (days) | Supplier responsiveness |
| On-time delivery % | receipts on/before expected | Vendor selection |
| Purchase price variance | received price vs PR estimate / last price | Cost control |
| Spend by vendor/category | Σ billed | Negotiation, concentration risk |

Reports: Stock valuation, Stock ledger (per product), Reorder list, PO register, GRN register,
Vendor spend & performance, Ageing — all exportable (CSV/XLSX/PDF).

---

## 16. Automation & optimization opportunities

1. **Auto-reorder suggestions:** when on_hand < reorder_level, propose a draft PR/PO with the
   typical vendor and last price — one click to reorder.
2. **Three-way match:** PO vs GRN vs Bill quantities/prices auto-reconciled; flag mismatches for
   the accountant instead of manual checking.
3. **Reorder-level learning:** suggest reorder levels from consumption velocity (avg out-movement
   per week × lead time) rather than guesswork.
4. **Vendor scorecards:** auto-rank vendors by price, on-time, and short-supply to guide sourcing.
5. **Dead-stock nudges:** monthly "cash locked in slow stock" alert with the specific SKUs.
6. **Landed-cost allocation (fast-follow):** spread freight across lines for truer unit cost.
7. **Demand signal:** PR history feeds budget planning (Module 04) and seasonality insight.

Each removes recurring manual effort (remembering to reorder, checking bills line-by-line,
ranking suppliers) and converts it into a surfaced exception or a one-click action — the essence
of the optimization mandate.

---

## 17. Configuration & settings

- Prefixes/padding for PR/PO/GRN/ADJ.
- Approval thresholds (auto-approve below ₹X; dual approval above ₹Y).
- Reorder defaults; expiry/ageing window N days; `allow_negative_stock`;
  `post_stock_out_on_ship`; multi-location on/off.
- Seller state + GSTIN (shared); expense category mapping for bill posting.

---

## 18. Integrations with other modules

- **Catalog (`products`):** PR/PO/stock reference products; new purchased items can create catalog
  entries.
- **Finance (Module 04):** PO bills → expenses/COGS; inventory valuation → balance sheet; spend →
  Budget-vs-Actual and expense analytics.
- **Payments (Module 02):** vendor payments (direction out) settle PO payment status.
- **Sales/Inventory link:** order shipment posts stock-out (flagged).
- **Import (Module 06):** opening stock, vendor master, product master bulk loads.
- **Notifications (Module 00):** low stock, PO approval/overdue, reconcile discrepancies.

---

## 19. Acceptance criteria & test scenarios

**Acceptance**
- Create vendor → appears in PO vendor picker.
- PR (3 lines) → submit → approve → convert to PO; lines copied; audit logged.
- PO issue → partial GRN (2 of 5) → status `partially_received`; on_hand +2; avg cost recomputed.
- Second GRN completes line → `received`; reconcile reports 0 discrepancies.
- Adjustment −3 (reason) reflected in ledger and on-hand; valuation updates.
- Over-receipt blocked with residual qty in the error.
- Low-stock item appears in alert and dashboard tile.
- Store-keeper cannot approve PO (403); owner can.

**Test scenarios**
- Concurrency: two GRNs on the same line do not over-receive; numbering unique under load.
- Void GRN reverses stock exactly (compensating movements).
- Moving-average correctness across mixed-cost receipts (worked example fixtures).
- Cache/ledger reconciliation after a simulated mid-transaction failure (must be consistent).

---

## 20. Rollout plan within the module

| Step | Ship | Why this order |
|---|---|---|
| 1 | Vendor master + PR (Batch 1.1) | Master data + demand capture; low risk |
| 2 | PO + GRN (Batch 1.2) | Commitment + receiving; needs vendors/PR |
| 3 | Inventory ledger + valuation (Batch 1.3) | Consumes GRN postings; enables costing |
| 4 | Opening-stock import + enable stock-out on ship | After data is loaded, switch on live stock |
| 5 | Analytics (ageing, vendor performance, auto-reorder) | Once enough data exists |

Ship each step to production with its own migration + UAT before the next. Do not enable
stock-out-on-ship until opening balances are imported (avoids spurious negative stock).

---

*Procurement & Inventory is the cost backbone of the ERP. Build it ledger-first (movements are
truth), keep every posting transactional, and expose the exceptions (low stock, overdue POs,
price variance) so the team manages by attention, not by memory.*
