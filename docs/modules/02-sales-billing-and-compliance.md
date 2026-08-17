# Module 02 — Sales, Billing & Compliance Documents

**Covers features:** #1 Payment entry · #11 Quotation · #10 Proforma invoice · #8 Test
certificates · #20 Auto GST compliance tracking
**Value chain:** Order-to-Cash (O2C) + Tax compliance
**Depends on:** Module 00 (numbering, GstCalculator, files, audit), existing invoice engine
**Status:** Deep-dive spec v1.0 (planner + builder view)

> **Business-optimizer thesis.** Eco Sudar already issues tax invoices, but the *cash* and the
> *commitment* around them are invisible: there's no record of who paid how much and when, no
> formal quotation/proforma to win and lock orders, no quality proof to share with B2B buyers,
> and GST obligations are tracked in someone's head. This module closes the loop from
> **offer → commitment → invoice → cash → compliance**, making revenue real (payments), shortening
> the sales cycle (quotation/proforma), building trust (test certificates), and de-risking tax
> (automated GST tracking).

---

## 0. Contents

1. Module overview & optimization thesis
2. Personas & roles
3. Functional map
4. The order-to-cash document chain
5. Sub-module A — Payment Entry & Receipts (#1)
6. Sub-module B — Quotations (#11)
7. Sub-module C — Proforma Invoices (#10)
8. Sub-module D — Test Certificates (#8)
9. Sub-module E — Auto GST Compliance Tracking (#20)
10. Data architecture & state machines
11. API surface (complete)
12. UX / screen specifications
13. Business rules, validations & exceptions
14. KPIs, dashboards & reports
15. Automation & optimization opportunities
16. Configuration & settings
17. Integrations
18. Acceptance criteria & test scenarios
19. Rollout plan within the module

---

## 1. Module overview & optimization thesis

The order-to-cash chain Phase 2 completes:

```
Quotation ──accept──▶ Proforma ──convert──▶ Tax Invoice ──▶ Payment(s) ──▶ Receipt
   (offer)            (commitment)          (existing)      (cash in)     (proof)
        every step shares the same lines + GstCalculator; nothing is re-keyed
                                   │
                Test Certificates (quality proof, attachable/shareable)
                                   │
                GST Compliance (auto-aggregated from invoices → filing tracker)
```

**Optimization outcomes:** accurate receivables and revenue (only real cash counts), faster
deal closure (professional quotation→proforma→invoice with one-click conversion), higher B2B
trust and price defensibility (test certificates), and zero missed/last-minute GST filings
(automated due-date tracking and alerts).

---

## 2. Personas & roles

| Persona | Role | Does here |
|---|---|---|
| Sales | `sales` | Creates quotations/proforma, converts to invoices. |
| Accountant | `accountant` | Records payments, monitors receivables, marks GST filed. |
| Owner | `owner` | Approves discounts, sees cash position, files GST, publishes certificates. |
| Quality | `owner`/`hr` (config) | Uploads test certificates, sets public visibility. |
| Customer / Public | `auth`/public | Views/downloads their certificates (portal/website). |

---

## 3. Functional map

```
Sales, Billing & Compliance
├── Payment Entry & Receipts
│   ├── Record receipt against invoice (full/partial/advance)
│   ├── Auto invoice payment_status (unpaid/partial/paid) + amount_paid cache
│   ├── Receipt PDF/number; payment ledger
│   ├── Refunds & voids (compensating)
│   └── Outstanding / ageing (AR)
├── Quotations
│   ├── Create/send/accept/decline/expire lifecycle
│   ├── Validity period & auto-expire
│   ├── PDF (non-tax wording) & email
│   └── Convert → proforma or invoice
├── Proforma Invoices
│   ├── Commitment document (no GST liability until invoiced)
│   ├── Convert → tax invoice (existing engine)
│   └── PDF ("PROFORMA — not a tax invoice")
├── Test Certificates
│   ├── Per product/batch with parameters
│   ├── PDF upload + public toggle
│   ├── Admin + customer portal + public website endpoints
│   └── Validity & expiry
└── Auto GST Compliance
    ├── Period aggregation (GSTR-1 / GSTR-3B) from invoices
    ├── Tax buckets (CGST/SGST/IGST) + due dates
    ├── Status (open/ready/filed/overdue) + alerts
    └── Filing record (ARN) + export to assist filing
```

---

## 4. The order-to-cash document chain

**Shared design (P5 — one engine).** Quotation, proforma, and invoice all use the **same line
shape** (description, HSN, qty, unit, rate, GST) and the **same GstCalculator**. Quotation and
proforma are stored together in `sales_documents` (typed) and convert forward without re-entry.
The existing invoice remains the legal tax document and the posting point (GST, revenue).

**Document semantics**
- **Quotation:** a price offer; no accounting/GST impact; has a validity window.
- **Proforma:** a commitment/advance-request document; still no tax liability; used to collect
  advances or for customer PO issuance.
- **Tax invoice:** the legal document; posts GST and (with payment) revenue.
- **Payment/Receipt:** the cash event; the only true revenue signal.

---

## 5. Sub-module A — Payment Entry & Receipts (#1)

**Purpose.** Capture real customer cash against invoices so receivables, revenue, and P&L are
truthful — directly at the invoice section as requested.

**Functionalities & elements**
- **Record payment** (from the invoice view): amount (defaults to balance due), method
  (cash/upi/bank_transfer/cheque/card), reference (UTR/cheque no), paid-on date, notes.
- **Allocation:** payment linked to an invoice; supports **partial** (multiple receipts per
  invoice) and **advance/on-account** (payment with no invoice yet, applied later).
- **Auto-status:** recompute `invoices.amount_paid` (cache) and derive `payment_status`
  (unpaid/partial/paid) with a ≤₹0.50 tolerance against the whole-rupee total.
- **Receipt document:** `PAY-YYYY-####`; printable receipt PDF.
- **Ledger & ageing:** payments ledger; AR ageing buckets (0–30/31–60/61–90/90+) per customer.
- **Refunds/voids:** void reverses status; refund = direction `out` (compensating), audited.
- **Vendor payments:** the same `payments` table with direction `out` settles PO payment status
  (Module 01) — one cash ledger for in and out.

**Process flow**
1. Open invoice → Payments panel shows balance due.
2. "Record Payment" → amount, method, reference, date → submit.
3. Service: insert `payments` (in) + recompute invoice cache + status, in one transaction; audit.
4. Invoice chip flips to Partial/Paid; revenue/P&L (Module 04 + Finance) reflect received cash.

**Business optimization.** This is the single highest-leverage feature: it makes every revenue
number real, exposes who owes what (the lifeblood of cash flow), and enables follow-ups on
overdue invoices automatically (alerts). It also retrofits invoice numbering onto the shared
numbering service (Module 00) for consistency.

---

## 6. Sub-module B — Quotations (#11)

**Purpose.** A professional, trackable price offer that starts the sales cycle and can convert
without re-keying.

**Functionalities & elements**
- **Header:** number (`QTN-YYYY-####`), customer (existing or new), customer GSTIN/state,
  seller state, doc date, **valid-until**, terms, notes.
- **Lines:** shared `<DocumentLineEditor>`; discount; GST shown indicatively (offer, not a tax
  document) via GstCalculator.
- **Lifecycle:** draft → sent → accepted → (converted) ; or declined / expired.
- **Validity & auto-expire:** past `valid_until` and not accepted → `expired` (scheduled scan).
- **Send & track:** PDF (clearly "Quotation", not "Tax Invoice"); email; record sent date;
  optional accept link.
- **Convert:** accepted quotation → proforma or directly → tax invoice; lines + customer carry
  over; source linked; quotation marked `converted`.
- **Win/loss:** decline reason captured → win-rate analytics.

**Business optimization.** Standardizes pricing presentation, shortens follow-up (validity +
status), and produces a **win-rate and quotation-to-invoice conversion** metric that reveals
pricing and sales effectiveness.

---

## 7. Sub-module C — Proforma Invoices (#10)

**Purpose.** A commitment document to collect advances or support the customer's procurement,
without creating a tax/GST liability until the real invoice is raised.

**Functionalities & elements**
- Same `sales_documents` table, `doc_type='proforma'`, `PFI-YYYY-####`.
- **From quotation or blank;** identical line/GST engine.
- **Convert → tax invoice:** one click creates an invoice via the existing invoice store
  (lines, customer, GST copied), links `converted_invoice_id`, marks proforma `converted`
  (read-only thereafter).
- **PDF:** prominent "PROFORMA INVOICE — not a valid tax invoice" wording (compliance clarity).
- **Advance linkage:** an advance payment can be recorded against a proforma and later applied to
  the resulting invoice (on-account flow in Sub-module A).

**Business optimization.** Lets the business **collect money before dispatch** (advance against
proforma) and gives B2B customers the document their procurement needs — speeding cash in and
reducing order risk — while staying GST-correct (no premature tax liability).

---

## 8. Sub-module D — Test Certificates (#8)

**Purpose.** Manage and **showcase** quality/test certificates (e.g. calorific value, moisture,
ash content for biomass pellets) across app, customer portal, and public website.

**Functionalities & elements**
- **Record:** number, product, batch no, title, **parameters** (name/value/unit/spec rows),
  lab name, issued-on, valid-until, PDF upload (FileStore), `is_public` toggle.
- **Surfaces:**
  - **Admin/dashboard:** manage + "latest certificates" tile.
  - **Customer portal:** authenticated customers see certificates for products they bought.
  - **Public website:** `is_public=1` certificates exposed via a read-only public endpoint
    (field-whitelisted, rate-limited) for the marketing site to embed.
- **Validity:** expiry tracked; expired certificates flagged and optionally hidden from public.
- **Parameters editor:** structured key/value/unit/spec rows → rendered as a comparison table.

**Business optimization.** Quality proof is a **sales asset** for industrial buyers and tenders;
making certificates self-serve (portal/website) reduces back-and-forth and differentiates Eco
Sudar on credibility. Batch linkage ties quality to specific production lots (traceability).

---

## 9. Sub-module E — Auto GST Compliance Tracking (#20)

**Purpose.** Eliminate missed or scrambled GST filings by auto-aggregating invoice tax into
period obligations (GSTR-1 outward supplies, GSTR-3B summary), tracking due dates and status,
and exporting filing-ready data. (A compliance *tracker/assistant*, not an e-filing gateway.)

**Functionalities & elements**
- **Period aggregation:** a recompute builds, per `YYYY-MM` and return type, the taxable value
  and CGST/SGST/IGST totals and invoice count from invoices (excluding cancelled), with
  computed **due dates** (GSTR-1 ~11th, GSTR-3B ~20th of next month — configurable).
- **Status engine:** open → ready (period closed, totals stable) → filed (owner marks with ARN)
  → overdue (past due, not filed) — auto-flagged.
- **Dashboard & alerts:** "GST due in N days" and "overdue" tiles + notifications to owner/
  accountant.
- **Filing assist export:** GSTR-1-style invoice-wise line list (CSV/XLSX) to paste/upload into
  the GST portal or hand to the CA; reconciles to invoice tax totals.
- **Reconciliation guardrails:** exclude cancelled/void; period by invoice date; warn on
  invoices missing GSTIN/place-of-supply that would fail filing.

**Business optimization.** Converts a stressful, error-prone monthly scramble into a calm,
data-backed routine: the numbers are pre-computed, the due dates are visible weeks ahead, and
the export removes manual tallying — reducing the risk of penalties and interest, and the CA's
billable hours.

---

## 10. Data architecture & state machines

**Tables** (DDL in master plan §8): `payments` (+ `invoices.amount_paid`), `sales_documents` +
`sales_document_items`, `test_certificates`, `gst_compliance_periods`. Files via `attachments`.

**Invariants**
- `invoices.amount_paid == Σ payments(in for that invoice) − Σ refunds(out)`; status derived.
- `sales_documents.converted_invoice_id` set exactly once on conversion; converted docs read-only.
- GST period totals == Σ invoice tax for that period/type (recompute is deterministic).

**State machines**
```
Invoice payment:  unpaid → partial → paid   (and back on void/refund)
Sales doc:        draft → sent → accepted → converted ; → declined ; → expired
GST period:       open → ready → filed ; → overdue
```

---

## 11. API surface (complete)

**Payments**
```
GET  /admin/payments                      list (invoice/customer/date/direction)
GET  /admin/invoices/{id}/payments        receipts for an invoice
POST /admin/invoices/{id}/payments        record receipt
POST /admin/payments                       on-account / advance / vendor payment
GET  /admin/payments/{id}                  detail + receipt PDF
POST /admin/payments/{id}/void             void (compensating)
GET  /admin/receivables/ageing            AR ageing buckets
```
**Sales documents (quotation + proforma)**
```
GET  /admin/sales-documents?type=quotation|proforma   list (status/date)
POST /admin/sales-documents                            create + lines
GET  /admin/sales-documents/{id}                       detail
PUT  /admin/sales-documents/{id}                        edit (draft)
POST /admin/sales-documents/{id}/send
POST /admin/sales-documents/{id}/accept
POST /admin/sales-documents/{id}/decline               (reason)
POST /admin/sales-documents/{id}/convert               (→ proforma/invoice)
GET  /admin/sales-documents/{id}/pdf
```
**Test certificates**
```
GET    /admin/test-certificates           list (product/public)
POST   /admin/test-certificates           create + upload
GET    /admin/test-certificates/{id}
PUT    /admin/test-certificates/{id}
DELETE /admin/test-certificates/{id}
GET    /test-certificates                 PUBLIC (is_public only, whitelisted, rate-limited)
GET    /portal/test-certificates          AUTH customer (their products)
```
**GST compliance**
```
GET  /admin/gst-compliance                periods + status
POST /admin/gst-compliance/recompute      rebuild from invoices
POST /admin/gst-compliance/{id}/mark-filed (ARN)
GET  /admin/gst-compliance/summary        due-soon/overdue + payable estimate
GET  /admin/gst-compliance/{period}/export filing-ready line list
```

Role refinement: payments/GST filing = owner/accountant; quotations/proforma = sales/owner;
certificate publish = owner/quality.

---

## 12. UX / screen specifications

- **Invoice view (`Invoices.tsx`) — Payments panel:** balance-due banner, receipts list,
  "Record Payment" dialog (amount prefilled to balance), Paid/Partial/Unpaid chip, receipt PDF.
- **Receivables (`Payments.tsx` or Finance tab):** payments ledger + AR ageing table (overdue
  highlighted) + "send reminder" (optional).
- **Quotations (`Quotations.tsx`) / Proforma (`Proforma.tsx`)** (or one page, type tab): list
  with status/validity; create/edit via shared line editor; PDF; convert button; win/loss tag.
- **Test Certificates (`TestCertificates.tsx`):** list (product, batch, validity, public chip);
  create dialog with parameters editor + PDF upload + public toggle; preview.
- **GST Compliance (`GstCompliance.tsx`):** period grid (period, type, taxable, CGST/SGST/IGST,
  due date countdown, status chip), recompute + mark-filed actions, export button; dashboard
  tile.
- **States:** loading/empty/error everywhere; conversions confirm and then deep-link to the new
  document; overdue items visually distinct.

---

## 13. Business rules, validations & exceptions

- Payment amount > 0; over-payment warned → becomes advance; void reverses status; refund
  requires reason.
- Sales docs: ≥1 line; draft-only edit; can't convert an expired/declined doc; convert is
  idempotent (one invoice per doc).
- Certificates: valid file type/size; public certificates expose only whitelisted fields;
  expired hidden from public if configured.
- GST: recompute excludes cancelled invoices; warns on invoices missing GSTIN/place-of-supply;
  mark-filed requires ARN; status auto-overdue past due.
- All money via GstCalculator; whole-rupee rounding; no blended GST% displayed.

---

## 14. KPIs, dashboards & reports

| KPI | Definition | Decision |
|---|---|---|
| Outstanding receivables | Σ (invoice total − amount_paid) unpaid/partial | Cash-flow / collections |
| AR ageing | outstanding by 0–30/31–60/61–90/90+ | Who to chase first |
| Avg days to pay | mean(paid_on − invoice_date) | Credit terms / customer quality |
| Quotation win rate | accepted ÷ sent | Pricing & sales effectiveness |
| Quote→invoice conversion | invoices from quotes ÷ quotes | Funnel health |
| GST payable (period) | CGST+SGST+IGST − ITC* | Cash set-aside for tax |
| Filing timeliness | filed-on vs due | Compliance risk |

\* ITC (input tax credit) from purchases is a fast-follow once vendor GST is captured on bills.

Reports: Payments register, AR ageing, Sales-document register & win/loss, Certificate register,
GST period summary + invoice-wise export.

---

## 15. Automation & optimization opportunities

1. **Auto payment reminders:** scheduled nudges on overdue invoices (in-app/email) with the
   outstanding amount and a payment reference — collections without manual chasing.
2. **One-click cash application:** advances on proforma auto-suggested for application to the
   resulting invoice.
3. **Quotation follow-up cadence:** alert sales before a quotation expires ("expiring in 3 days,
   follow up").
4. **GST pre-close checklist:** before period close, auto-list invoices missing GSTIN/place-of-
   supply so they're fixed before filing.
5. **ITC tracking (fast-follow):** capture GST on vendor bills → net GST payable, not just output
   tax — sharpens cash planning.
6. **Certificate-on-dispatch:** auto-attach the relevant batch certificate to the invoice/dispatch
   for the customer.
7. **Revenue assurance:** flag invoices `paid` in status but with no payment record (data hygiene).

---

## 16. Configuration & settings

- Prefixes for QTN/PFI/PAY; invoice prefix retrofitted to the numbering service.
- GST due-date offsets per return type; period close rules.
- Payment methods list; advance/on-account behavior; overdue threshold days.
- Certificate categories, public-visibility default, expiry hide rule.
- Seller GSTIN/state (shared).

---

## 17. Integrations

- **Invoices (existing):** payments attach to invoices; proforma/quotation convert into invoices;
  GST compliance aggregates invoice tax.
- **Finance (Module 04):** payments = cash inflow → revenue/P&L (already keyed on payment status
  in Phase 1.5); receivables feed working-capital views.
- **Procurement (Module 01):** vendor payments (direction out) settle PO payment status; shared
  `payments` ledger.
- **Customer intelligence (Module 03):** payment timing → avg-days-to-pay and slow-payer lists.
- **Products & website:** test certificates link products and feed the public site.
- **Files (Module 00):** certificate PDFs via FileStore/attachments.

---

## 18. Acceptance criteria & test scenarios

**Acceptance**
- Partial payment → invoice `partial`, balance reduced; final payment → `paid`; P&L revenue
  reflects received cash; void reverts status.
- Quotation → PDF → accept → convert to proforma → convert to tax invoice; lines/GST identical
  end-to-end; converted docs read-only and linked.
- Certificate uploaded + made public appears on the public endpoint; unpublished does not.
- GST recompute builds periods with correct CGST/SGST/IGST sums matching invoices; overdue
  auto-flag; export totals reconcile.

**Test scenarios**
- Multi-rate invoice payment rounding (≤₹0.50 tolerance marks paid).
- Convert-idempotency: converting an already-converted doc is blocked (409).
- Public certificate endpoint leaks no internal fields; rate-limited.
- GST period excludes cancelled invoices; warns on missing GSTIN.
- Numbering shared across invoice/quotation/proforma/payment (no collisions under load).

---

## 19. Rollout plan within the module

| Step | Ship (Batch) | Why |
|---|---|---|
| 1 | Payment entry + receivables (2.1) | Highest value; makes revenue real; retrofits numbering |
| 2 | Quotation + Proforma (2.2) | Sales cycle; extracts shared GstCalculator/line editor |
| 3 | Test certificates (2.3) | Independent; quality/marketing asset |
| 4 | GST compliance tracker (2.4) | Consumes invoices; monthly value |

Each step ships with migration + UAT. Extract the shared `GstCalculator` and
`<DocumentLineEditor>` during step 2 and retrofit invoices to them (one engine, P5).

---

*Sales, Billing & Compliance closes the cash loop and the trust loop. Build payments first
(cash is truth), share one line/tax engine across quotation/proforma/invoice, and let the
system pre-compute GST so filing becomes routine instead of risk.*
