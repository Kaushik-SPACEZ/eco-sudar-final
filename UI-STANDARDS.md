# Kynetropo ERP — UI Standards

Every standard listed here applies to every project built on the Kynetropo template.
Run `/apply-ui-standards` to audit and fix the entire codebase against these rules.

---

## 1. Header

- Global search bar in the header — keyboard shortcut `Ctrl+K` opens it, searches all data in the system
- Right side icons in order: Search (compact on mobile) → Notifications → Settings → Fullscreen toggle → Contact Support → Profile avatar
- Clicking any icon highlights it as selected (active state)
- Contact Support icon opens a panel with support details and a Sign Out button that also shows the logged-in user's display name and role
- Notifications icon shows unread count badge
- Settings icon links to `/settings`
- Fullscreen toggle uses `document.requestFullscreen()` / `document.exitFullscreen()`
- Reuse `TopNavbar.tsx` from the template — never recreate

---

## 2. Workspace Tabs (under header)

- Maximum 4 tabs open at once — when a 5th tab opens, the first unpinned tab is removed automatically
- Right-click on a tab → Pin option — pinned tabs are never auto-removed
- End of the tab row: a Clear All button that closes all unpinned tabs
- Reuse `WorkspaceTabs.tsx` from the template

---

## 3. Sidebar

- No divider line between Dashboard and the first module icon
- Collapsed sidebar uses the template's icon+label stacked layout — never icon-only
- Reuse `AppSidebar.tsx` from the template exactly — no custom sidebar

---

## 4. Tables

- Every table must use `<ScrollableX>` wrapper — never raw `overflow-x-auto`
- Floating horizontal scrollbar only — remove any duplicate fixed scrollbar at the bottom of the page
- Scrolling up/down (mouse wheel or touchpad vertical) moves the page only vertically — never horizontal
- Left/right movement only via the floating scrollbar or touchpad horizontal gesture
- Every column has a sort toggle (ascending / descending)
- Clicking a row opens the detail page — no popup on row click
- Action column contains Edit button only — Edit opens a full page with a Back button
- Remove the Eye/View icon from the action column — the row click replaces it
- Pagination at the bottom: user can select 25 / 50 / 75 / 100 rows per page, with Next/Previous navigation
- Loading state: always 5 skeleton rows — never a spinner

---

## 5. Forms and Pages

- Create and Edit always open as a full page with a Back button — never inside a Dialog for complex forms
- Exception: simple inline lookups (select an existing record) may use a popup — see Section 8
- Layout: two-column grid — never single column, never expandable/accordion fields
- Background: use `bg-background` (grey) from the Kynetropo theme — visible clearly behind form cards
- Every form card uses `bg-card rounded-xl border shadow-sm`
- Name fields: always Title + First Name + Last Name + Display Name — never a single "Full Name" field
- Phone fields: country code dropdown (shows country name e.g. IND → India) + primary number (10-digit) + optional alternate mobile
- Email fields: format validation (`name@domain.tld`)
- Phone fields: 10-digit numeric validation
- Number fields: numeric validation, no letters
- All field values: HTML entities encoding on save, decoding on display
- Autofill: when an existing record is selected (e.g. customer in an order), auto-populate related fields
- Unsaved changes guard: if the user navigates away with unsaved changes, show a popup:
  - Title: "Leave this page?"
  - Body: "If you leave, your unsaved changes will be discarded."
  - Buttons: "Stay here" (primary) | "Leave & discard changes" (destructive)
- Discard button: always show a Discard confirmation popup before clearing the form

---

## 6. Dropdowns and Select Fields

- Every dropdown that lists records (customers, products, leads etc.) shows key identifiers alongside the name — e.g. phone number, email, code, or reference number
- Every such dropdown includes an "Add new" option at the bottom that opens a popup to create the record inline without leaving the current page (see Section 8)
- Use `<RecordCombobox>` from the template for all reference/lookup fields — never a plain `<Select>`

---

## 7. Documents — Quotation, Invoice etc.

- Save as Draft: every document page has a "Save as Draft" button beside Save and Cancel
- Status flow:
  - Quotation: `Draft → Confirmed → Converted to Invoice`
  - Invoice: can be created directly or converted from a confirmed quotation, also supports Draft
- Before any download: show a Preview modal with the rendered document — buttons inside: "Download" and "Close"
- Document pages open as full pages — never as popups
- After opening a document page: double-column layout, no expandable sections

---

## 8. Popup Rules

Popups are only used for:
- Creating a new related record inline (e.g. new customer while filling an order)
- Preview before download
- Confirmation dialogs (delete, discard, leave page)
- Simple detail previews (not full edit forms)

Rules for all popups:
- Scrollbar appears outside the popup on the right edge — never inside the popup content area
- Large content = large popup (`max-w-4xl` or wider)
- Small confirmations = small popup (`max-w-md`)
- Every popup has a visible close button (X) in the top-right corner
- Every popup that contains a `<Select>` must have `onInteractOutside={(e) => e.preventDefault()}` on `DialogContent` to prevent accidental close

---

## 9. Export and Import

- Every list page has an Export button
- Export opens a dialog with:
  - Column selection (user picks which columns to include)
  - Date range filter
  - Row limit selector (max 1000 rows to avoid server load)
  - Export to CSV and Excel options
- Every list page that supports import has an Import button
- Import flow: Upload file → Field mapping (map CSV columns to system fields) → Preview (shows first 10 rows with decimal format) → Confirm import
- Before import: show a suggested template download link so users know the expected format
- Row limit on import: max 500 rows per import to avoid server load
- Reuse `<ExportDialog>` from the template

---

## 10. Record Actions

- Every list page: Inactive toggle and Clone option available per row (where applicable to the business entity)
- Inactive records: visually dimmed in the table, filterable via a status filter
- Clone: creates a duplicate of the record in Draft/Inactive state, opens it for editing

---

## 11. Chatbot

- Fixed position: bottom-right corner — not moveable, not draggable
- If the chatbot overlaps detail content, increase the page's bottom padding so content scrolls into view above it
- Never cover action buttons with the chatbot widget

---

## 12. Validations

- Required fields: show red border + error message below the field on blur
- Email: must match `name@domain.tld` format
- Phone: must be 10 digits (after country code)
- Numbers: no letters or special characters
- Dates: must be valid calendar dates
- All field values: HTML entities encoded on save (`htmlspecialchars`), decoded on display
- No fake validations — every validation must reflect actual backend rules

---

## 13. Miscellaneous

- "Extra Amount" label → rename to "Adjustment" everywhere
- Return / Damage products: add only if the business workflow requires it — agent asks during build
- Bank statement cross-verify: add reconciliation check where bank statements are uploaded
- Remove all duplicate UI elements — if two components do the same thing, keep one
- In-page record creation: when a dropdown needs a new record, open a popup form — never redirect away from the current page
- Sorting: every table column must have a sort toggle
- Inactive and Clone: available on all major entities (Customers, Leads, Orders, Products, etc.)
