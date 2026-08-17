# UX Standards — Pending Tasks

**Date:** 2026-08-14
**Branch:** `naresh` (deployed to test.ecosudar.com only; prod untouched)
**Blocker:** parallel agents 1 & 2 stopped on the account **weekly usage limit** (resets **10:30am Asia/Kolkata**), not a code fault.

This tracks the 7-point UX-standardization request. Items 3 & 6 are shipped. The rest is partly done and partly parked in isolated agent worktrees (nothing lost).

---

## The 7-point request — status

| # | Requirement | Status |
|---|---|---|
| 1 | Save-as-Draft + Draft→Confirmed→Invoice conversion + **preview before download** + open Quotation/Invoice as **full pages** (not popups) | ◑ **Partial, unverified** — Agent 1 worktree (uncommitted) |
| 2 | Form pages: no expandable fields, **two-column** layout, **visible grey** section backgrounds, validations (number / email / 10-digit phone / email format) | ◑ Products/Vendor **done (Agent 3, committed, not merged)**; Customer/Order **partial, unverified (Agent 2)** |
| 3 | Popup vertical scrollbar **outside** the card, at the window's right edge | ✅ **Done + live on test** (`DialogScrollContent`, applied to 6 popups) |
| 4 | Row-click opens **detail**; keep **Edit** in actions (opens a page) | ◑ Customers/Orders **live**; Products/RawMaterials **done (Agent 3, not merged)**; other list pages pending |
| 5 | Add/Edit open as a **page with back button**, not a popup (incl. a real **Customer edit** page — needs a small backend update endpoint) | ◑ **Partial, unverified** — Agent 2 worktree (uncommitted) |
| 6 | **Pagination** 25 / 50 / 75 / 100 rows + next page (reduce server load) | ✅ **Done + live on test** (10 list pages; Expenses already had server-side load-more) |
| 7 | Inline **quick-create** popup (e.g. new customer from the order form) without redirect — big, aligned | ◑ Component built (`QuickCreateDialog`, committed); **wiring into OrderForm partial, unverified (Agent 2)** |

---

## What is already shipped (committed + deployed to test)

**Commit `3ba135b` on `naresh`** — reusable foundation + rollout, `tsc` + `build:test` clean, deployed and hash-verified on test.ecosudar.com:

- `src/lib/pageSize.ts` + `src/components/Pagination.tsx` — app-wide rows-per-page (25/50/75/100, localStorage) + `usePagedRows()` client pager.
- `src/lib/validate.ts` — `isEmail`, `isPhone10`, `isNumeric`, `digitsOnly`, `capDigits`, `isPincode`, `isGstin`, `firstError`.
- `src/components/ui/dialog.tsx` → **`DialogScrollContent`** (overlay scrolls, scrollbar at window edge; blocks outside-click-close).
- `src/components/QuickCreateDialog.tsx` — large aligned inline-create popup.
- Pagination live on: Vendors, Customers, Orders, Products, PurchaseOrders, SalesDocuments, inventory Items / StockLevels / RawMaterials / Movements.
- Outside-scroll applied to: Customers + Orders detail, PurchaseOrders create, Expenses bill, StockLevels + RawMaterials dialogs.
- Row-click → detail on Customers (eye icon removed) and Orders.

---

## Work parked in agent worktrees (NOT yet on `naresh`)

Three agents ran in isolated git worktrees under `.claude/worktrees/`. **Preserve these worktrees/branches until integrated — they hold unmerged work.**

### Agent 3 — Products / Vendors / Inventory ✅ DONE
- Branch `worktree-agent-a8042add427238207`, commit **`7856309`**, `tsc --noEmit` clean, sits cleanly on top of `naresh`.
- Files (6): `ProductForm.tsx`, `purchase/VendorForm.tsx`, `Products.tsx`, `inventory/RawMaterials.tsx`, `inventory/StockLevels.tsx`, `purchase/PurchaseOrders.tsx`.
- Delivers **#2** (two-column grey forms + validators, incl. VendorForm email/10-digit-phone/pincode/GSTIN/account-no) and **#4** (Products row → edit page, RawMaterials row → edit dialog, action buttons `stopPropagation`).
- **Action: safe to merge/cherry-pick `7856309` into `naresh` as-is.**

### Agent 1 — Invoice / Quotation lifecycle (#1) ❌ INCOMPLETE
- Branch `worktree-agent-a532a58f956eceda7` — **uncommitted, unverified** partial work (died mid-write).
- Touched: `api/controllers/admin/AdminSalesDocumentController.php`, `api/models/SalesDocument.php`, `api/index.php`, `src/lib/api/phase2.ts`, `src/lib/salesDocumentPdf.ts`, `src/pages/sales/SalesDocumentsPage.tsx`.
- New (untracked): `src/pages/InvoiceForm.tsx`, `src/pages/sales/SalesDocumentForm.tsx`, `api/migrations/2026_08_14_sales_doc_confirmed_status.sql`.
- **Remaining:** finish the full-page quotation + invoice forms, Save-as-Draft, Draft→Confirmed→Convert-to-Invoice, preview-before-download; wire routes in `App.tsx`; get `tsc` + `php -l` green; **the new migration must be reviewed and run on the test DB (then prod later) — it was NOT executed.**

### Agent 2 — Customers / Orders (#2, #5, #7) ❌ INCOMPLETE
- Branch `worktree-agent-a882d77055a007880` — **uncommitted, unverified** partial work (died mid-write).
- Touched: `api/controllers/admin/AdminUserController.php`, `api/index.php`, `src/App.tsx`, `src/lib/api/customers.ts`, `src/pages/CustomerForm.tsx`, `src/pages/Customers.tsx`, `src/pages/OrderForm.tsx`.
- **Remaining:** finish the backend customer full-update endpoint; CustomerForm edit mode + `/customers/:id/edit` route + Edit action in Customers list; two-column grey + validators on Customer/Order forms; inline QuickCreate "+ New customer" in OrderForm; get `tsc` + `php -l` green.

---

## Resume plan (when limit resets / budget available)

1. **Merge Agent 3** (`7856309`) into `naresh` — safe, verified, disjoint files.
2. **Finish Agent 1 & Agent 2** partial work (resume the agents or complete by hand), keeping `tsc` + `php -l` green. Note `App.tsx` + `api/index.php` are edited by both 1 & 2 → additive route merges, resolve by keeping both.
3. Review + run migration `2026_08_14_sales_doc_confirmed_status.sql` on the **test** DB (`u952547820_test`). Prod DB later, on explicit go-ahead.
4. One unified `npx tsc --noEmit` + `npm run build:test`.
5. Deploy `dist/` → test admin (SSH `147.93.99.144:65002` — needs a network path that allows that port; use mobile hotspot/VPN if on a WiFi that blocks it), verify served hash.
6. Commit to `naresh`. Do **not** push; do **not** touch prod without explicit confirmation.

---

## Notes / gotchas
- Agents inherit the **eco-sudar-control** conventions, **not** the kynetropo template CLAUDE.md (that template's `BackButton`/`useSmartBack`/`FormFieldWrapper` don't apply here — this app uses `FormPage`, `Req`, `useUnsavedChanges`, `ScrollableX`, `ExportMenu`, `Filters`, and the new `Pagination`/`DialogScrollContent`/`QuickCreateDialog`/`validate`).
- Worktrees were initially based on the repo root commit, not `naresh`; each agent reset to `naresh` before working. Verify base when integrating.
- `SalesBilling` uses react-query (forbidden in this app) — Agent 1 correctly chose a fresh `InvoiceForm.tsx` instead of extending it.
