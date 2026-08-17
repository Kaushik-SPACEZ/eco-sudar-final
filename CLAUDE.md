# Kynetropo ERP Generator — Claude Rules

This project uses the Kynetropo design system. Read and follow every rule below before
writing any code. Do not ask for clarification on UI decisions — the answers are here.

**MANDATORY — runs after EVERY task that edits files:**
The `track-changes` agent runs automatically after every edit session — no tagging needed.
Do NOT skip it. It records what changed in `changes-registry.json` and drift-checks previous changes.

**When in doubt about any workflow step — read `PLAYBOOK.md` first.**
It contains the complete A-Z guide for building, testing, fixing, and deploying.

**CONTEXT FILES — read ALL of these before every task:**

```
1. PLAYBOOK.md                    ← workflow rules and agent order
2. CLAUDE.md                      ← design rules and coding standards  
3. client-briefs/DOMAIN-*.md      ← business domain knowledge (if exists)
4. client-briefs/BRIEF-*.md       ← client requirements and entities
5. project-graph.json             ← current project structure and relationships
```

Reading all 5 gives Claude:
- HOW to work (PLAYBOOK + CLAUDE.md)
- WHAT the business does (DOMAIN-*.md)
- WHAT the client needs (BRIEF-*.md)
- WHAT already exists (project-graph.json)

**Never skip reading these.** Every wrong decision traces back to missing context.

**If DOMAIN-*.md doesn't exist yet — run /research-domain first.**

**When an employee describes an issue or feature request:**
Read PLAYBOOK.md, identify the scenario, generate a complete autonomous prompt
with the correct agents in the correct order. The prompt must run without
requiring answers from the employee.

**When generating ANY prompt — always include these agents in the correct order:**

For every feature/fix prompt, include ALL of these that apply:

```
STEP 0:  /build-graph              ← always first — sync graph
STEP N:  php -l <file>             ← after every PHP edit
STEP N:  /impact-check → "..."     ← after main code changes, finds all affected files
STEP N:  /validate-schema          ← after any PHP that queries DB
STEP N:  /review-all               ← after all code changes — TypeScript + UI checks
STEP N:  /review-ui-behavior       ← after any dialog/form/navigation changes
STEP N:  /review-cross-module      ← after ANY feature touching financial data, payments,
                                      expenses, navigation, or list columns
STEP N:  /build-graph              ← after all changes — update relationships
STEP N:  npm run build             ← must be clean before deploying
```

Never generate a prompt that:
- Makes code changes without running /impact-check afterward
- Writes PHP without running /validate-schema
- Writes TSX without running /review-all
- Touches financial data without running /review-cross-module
- Adds navigation without running /review-cross-module
- Ends without npm run build

**/review-cross-module is MANDATORY when:**
- Any payment, expense, invoice, GST, or settlement is created/updated
- Any new list page or table column is added
- Any navigation, back button, or routing is changed
- Any Finance sub-module is modified

Always end every generated prompt with:
- List of files changed → SFTP upload list
- SQL to run in phpMyAdmin (if any)
- php migrate.php command (if SQL changed)
- /verify-deployment → <slug> (after upload)

---

## CRITICAL — Read actual SQL before writing any PHP or TypeScript

Before writing ANY controller, model, or frontend code that queries a table:

1. Find the SQL file that creates that table in `database/`
   ```bash
   grep -rl "CREATE TABLE.*<table_name>" database/
   ```
2. Read it completely — get exact column names, types, PKs, and FKs
3. Write code using ONLY columns that exist in that SQL file
4. Never assume column names from memory, templates, or other controllers

**Common column name mistakes this prevents:**
- Using `expense_id` when PK is actually `id`
- Using `vendor` when column is actually `paid_to`
- Using `total` when column is actually `total_amount`
- Using `employee_id` FK when it is actually `employee_key`
- JOINing `ON e.id` when PK is `e.user_id`

**Rule: The SQL file in `database/` is the source of truth. Always.**

If a column you need doesn't exist in the SQL:
- Write an ALTER migration to add it
- OR use a column that does exist
- NEVER write PHP/TypeScript referencing a non-existent column

---

## Project Folder Structure

This is the ONLY valid structure. Always write files to these exact paths.

```
kynetropo-erp-template/          ← project root
│
├── CLAUDE.md                    ← you are reading this
├── BRIEF-TEMPLATE.md
├── .env.example
├── package.json
├── tailwind.config.ts
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── index.html
│
├── client-briefs/
│   └── BRIEF-<CLIENTNAME>.md    ← written by /new-client-setup
│
├── tests/
│   └── http/
│       ├── auth.http            ← pre-built login test
│       ├── env.http.example     ← copy to env.http, fill token
│       └── <entity>.http        ← written by /build-client per entity
│
├── .claude/
│   ├── agents/                  ← skill source files
│   └── commands/                ← same files — Claude Code reads these as slash commands
│
├── public/
│   ├── kynetropo-logo.png       ← replace with client logo
│   └── favicon.ico
│
└── src/
    ├── main.tsx                 ← entry point (do not edit)
    ├── App.tsx                  ← router — ADD routes here per entity
    ├── index.css                ← all CSS tokens (do not edit)
    ├── brand.ts                 ← client name/logo — EDIT this per client
    │
    ├── components/
    │   ├── DashboardLayout.tsx  ← shell layout (do not edit)
    │   ├── AppSidebar.tsx       ← sidebar (do not edit)
    │   ├── TopNavbar.tsx        ← top bar (do not edit)
    │   ├── StatCard.tsx         ← import and use — never recreate
    │   ├── BrandLogo.tsx        ← uses brand.ts (do not edit)
    │   ├── NavLink.tsx          ← (do not edit)
    │   ├── ModulesDialog.tsx    ← ADD new section colors here per module
    │   ├── ChatWidget.tsx       ← fixed bottom-right AI assistant (always-on, do not edit)
    │   │
    │   ├── ── Reusable UI building blocks (import and use — never recreate) ──
    │   ├── StatusBadge.tsx      ← universal status/source badge with full style map
    │   ├── TableSkeleton.tsx    ← loading skeleton rows for any table
    │   ├── EmptyTableRow.tsx    ← "No records found" table row
    │   ├── PageHeader.tsx       ← h1 + subtitle + right action slot
    │   ├── SavingButton.tsx     ← submit button with Loader2 spinner while saving
    │   ├── SearchInput.tsx      ← search icon + Input in a relative container
    │   ├── FilterBar.tsx        ← p-4 border-b flex row for filter controls
    │   ├── FormFieldWrapper.tsx ← Label + required * + hint + children
    │   ├── FormGrid.tsx         ← label-left form layout: FormGrid + FormRow + FormDivider (ALWAYS use for forms)
    │   ├── FormSection.tsx      ← border-t section with bold h3 title
    │   ├── FormDialogWrapper.tsx← Dialog + form + Cancel/Save footer
    │   ├── ConfirmDeleteDialog.tsx ← AlertDialog for delete confirmation
    │   ├── SectionCard.tsx      ← bg-card rounded-xl with optional header
    │   ├── InlineField.tsx      ← dt/dd label-value pair for detail panels
    │   ├── DetailFieldGrid.tsx  ← responsive dl grid for InlineField items
    │   ├── DetailPageHeader.tsx ← BackButton + title + badges + actions
    │   ├── PageLoadingSkeleton.tsx ← full-page detail loading state
    │   ├── StatsRow.tsx         ← responsive grid of StatCard items
    │   ├── UnderlineTabs.tsx    ← underline-style tab bar (shadcn Tabs)
    │   ├── TabStatusBar.tsx     ← pill-button filter tabs with count badges
    │   ├── PaginationBar.tsx    ← prev/next with "Page X of Y · N records"
    │   ├── RecordCount.tsx      ← muted "1,234 records" count text
    │   ├── TableActionButtons.tsx ← View/Edit/Delete icon buttons for table rows
    │   ├── SortToggleButton.tsx ← Newest/Oldest toggle button
    │   ├── ExportButton.tsx     ← outline Export button with loading state
    │   ├── BackButton.tsx       ← ghost back button using useSmartBack
    │   ├── PhoneButton.tsx      ← tel: link button (also exports WhatsAppButton)
    │   ├── PhoneInput.tsx       ← country-code dropdown + number input (ALWAYS use for phone fields in forms)
    │   ├── CurrencyText.tsx     ← INR formatted amount (uses src/lib/currency.ts)
    │   ├── ProgressBar.tsx      ← labelled bar with green/sky/amber thresholds
    │   ├── PriceBreakdownRow.tsx← label/value row for financial summaries
    │   ├── DateRangeFilter.tsx  ← From/To date input pair
    │   ├── MonthPicker.tsx      ← labelled <input type="month">
    │   ├── AmPmTimePicker.tsx   ← 3-select 12h time picker (converts to 24h)
    │   ├── InlineCrossAlert.tsx ← amber warning for duplicate phone/email
    │   ├── ExportDialog.tsx     ← column-picker Excel export with date range filter
    │   ├── ImportDialog.tsx     ← 3-step CSV/XLSX import wizard (upload→map→preview)
    │   ├── FilePreviewDialog.tsx← authenticated document preview (image/PDF/download)
    │   ├── RecordCombobox.tsx   ← rich combobox: secondary info + Add New inline
    │   ├── SortableHeader.tsx   ← sortable <th> with asc/desc arrow indicator
    │   │
    │       ├── button.tsx
    │       ├── input.tsx
    │       ├── badge.tsx
    │       ├── dialog.tsx
    │       ├── select.tsx
    │       ├── skeleton.tsx
    │       ├── scrollable-x.tsx ← USE THIS for all table wrappers
    │       └── ...50 more components
    │
    ├── contexts/
    │   ├── AuthContext.tsx      ← useAuth() hook — provides isAuthenticated, login, logout
    │   └── ChatContext.tsx
    │
    ├── hooks/
    │   ├── useDashboardLayout.ts
    │   ├── use-mobile.tsx
    │   └── useSmartBack.ts      ← back navigation with fallback route
    │
    ├── lib/
    │   ├── utils.ts             ← cn() helper — always import from here
    │   ├── currency.ts          ← inr() compact + inrFull() 2-decimal formatters
    │   ├── navigation.ts        ← sidebar sections — ADD entries here per module
    │   ├── companyProfile.ts
    │   └── api/
    │       ├── client.ts        ← apiFetch() base — always import from here
    │       └── <entity>.ts      ← written by /build-client per entity
    │
    ├── types/
    │   └── <entity>.ts          ← written by /build-client per entity
    │
    └── pages/
        ├── Login.tsx            ← pre-built (do not edit)
        ├── Dashboard.tsx        ← placeholder — customise per client
        ├── NotFound.tsx         ← pre-built (do not edit)
        ├── Settings.tsx         ← placeholder
        ├── <Entity>s.tsx        ← written by /build-client (LIST page)
        ├── <Entity>Form.tsx     ← written by /build-client (FORM dialog)
        └── <Entity>Detail.tsx   ← written by /build-client (DETAIL page, if needed)
```

### What agents write (never write outside these paths)

| Agent | Writes to |
|---|---|
| `/new-client-setup` | `src/brand.ts`, `src/lib/navigation.ts`, `client-briefs/BRIEF-*.md` |
| `/build-client` | `src/types/`, `src/lib/api/`, `src/pages/`, `api/controllers/admin/`, `database/`, `tests/http/` |
| `/build-client` (patches) | `src/App.tsx`, `src/lib/navigation.ts`, `src/components/ModulesDialog.tsx`, `api/index.php` |
| `/review-all` | edits any generated file to fix violations |
| `/hostinger-deploy` | creates `.env` on server, uploads via SFTP |

### What agents NEVER touch

- `src/components/DashboardLayout.tsx` — pre-built shell
- `src/components/AppSidebar.tsx` — pre-built shell
- `src/components/TopNavbar.tsx` — pre-built shell
- `src/components/ui/*` — all shadcn/ui components
- `src/contexts/*` — auth and chat contexts
- `src/index.css` — design tokens
- `src/main.tsx` — entry point
- `src/pages/Login.tsx` — pre-built
- `src/pages/NotFound.tsx` — pre-built
- `api/core/*` — framework core
- `api/middleware/*` — auth middleware
- `api/helpers/*` — JWT, Validator, Mailer
- `api/services/*` — NumberSequence, FileStore etc.

---

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v3 (class-based dark mode)
- shadcn/ui + Radix UI primitives
- react-router-dom v6
- @tanstack/react-query v5
- react-hook-form + zod
- lucide-react icons

---

## Color Tokens — NEVER hardcode hex values

Use Tailwind semantic classes only. The CSS variables are defined in `src/index.css`.

| What | Class to use |
|---|---|
| Page / app background | `bg-background` |
| Card background | `bg-card` |
| Primary text | `text-foreground` |
| Text on card | `text-card-foreground` |
| Dimmed / label text | `text-muted-foreground` |
| Primary action (sky blue) | `bg-primary`, `text-primary` |
| Text on primary bg | `text-primary-foreground` |
| Danger / delete | `bg-destructive`, `text-destructive` |
| Sidebar background | `bg-sidebar` |
| Sidebar active item | `bg-sidebar-primary text-sidebar-primary-foreground` |
| Border | `border-border` |
| Input background | `border-input` |

Brand raw values (for Framer Motion, SVG, canvas only — not for className):
- sky: `#2ea0da`, ink: `#0f1729`, flare: `#ff1f5a`

---

## Border Radius

| Context | Class |
|---|---|
| Cards, content panels | `rounded-xl` |
| Buttons, inputs, badges | `rounded-md` or `rounded-lg` |
| Full pill (status tags) | `rounded-full` |
| Chat / floating panels | `rounded-2xl` |
| Small icon containers | `rounded-lg` |

Base radius token = `--radius: 0.75rem`. Never use raw `rounded-[Xpx]` values.

---

## Typography Scale

| Element | Classes |
|---|---|
| Page H1 | `text-2xl font-bold text-foreground` |
| Section H2 | `text-xl font-semibold text-card-foreground` |
| Card title | `text-base font-semibold text-card-foreground` |
| Body / table cell | `text-sm text-card-foreground` |
| Label / field name | `text-sm text-muted-foreground` |
| Caption / helper | `text-xs text-muted-foreground` |
| Table column header | `text-xs font-medium uppercase tracking-wider text-muted-foreground` |
| Stat value | `text-2xl font-bold mt-1 text-card-foreground` |

---

## Layout Structure

Every page is rendered inside `<DashboardLayout>` via the router. Never replicate
the sidebar or topbar — they are provided by the layout.

### Standard page skeleton
```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold text-foreground">Page Title</h1>
    <Button>Primary Action</Button>
  </div>

  {/* optional stats row */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard ... />
  </div>

  {/* main content card */}
  <div className="bg-card rounded-xl border shadow-sm">
    <div className="p-4 border-b flex items-center justify-between">
      <h2 className="text-base font-semibold text-card-foreground">Table Title</h2>
      {/* filters / search here */}
    </div>
    <div className="p-4">
      {/* table or list content */}
    </div>
  </div>
</div>
```

---

## Page Types

Use ONLY these four patterns. Do not invent new layouts.

### LIST page
- Filter bar above the card (search input + select dropdowns)
- Table inside `<ScrollableX>` (not raw `overflow-x-auto`)
- Row hover: `hover:bg-muted/30 transition-colors`
- Action column: icon buttons only (`variant="ghost" size="icon"`)
- Pagination or load-more at the bottom
- Page header has TWO buttons: `[⋮ DropdownMenu] [+ Add Entity]`
  - The `⋮` button (`<MoreHorizontal>`) opens a `<DropdownMenuContent>` with "Export to Excel"
  - Clicking "Export to Excel" opens `<ExportDialog>` (column picker + date range + password protect)
  - Never use a plain "Export" button — always the three-dot menu

```tsx
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger }
  from '@/components/ui/dropdown-menu';
import { ExportDialog, type ExportColumnDef } from '@/components/ExportDialog';

const EXPORT_COLUMNS: ExportColumnDef<Invoice>[] = [
  { header: 'ID',      key: 'id' },
  { header: 'Amount',  key: 'total' },
  { header: 'Status',  key: 'status' },
  { header: 'Created', key: 'created_at' },
  // extra detail fields (unchecked by default):
  { header: 'Notes', key: 'notes', group: 'detail', defaultChecked: false },
];

// State:
const [exportOpen, setExportOpen] = useState(false);

// Header:
<div className="flex items-center gap-2">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => setExportOpen(true)}>Export to Excel</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Invoice</Button>
</div>

// After header, before the table card:
<ExportDialog
  open={exportOpen}
  onOpenChange={setExportOpen}
  title="Invoices"
  columns={EXPORT_COLUMNS}
  rows={filtered}
  dateField="created_at"
  filename="invoices"
/>
```

### FORM — dialog or full page?

| Condition | Pattern |
|---|---|
| ≤ 8 fields, single-section, no line-items | **Dialog only** |
| > 8 fields, OR multi-section (identity / contact / address / bank / etc.), OR has line-item table | **Full page** using `<FormPage>` |

**Nested / inline creation rule:** when a form needs to create a *related* entity without leaving the page (e.g. adding a Customer while filling an Order), always use a **Dialog** — never navigate away. The `<Entity>Form.tsx` file therefore exports BOTH:
- A named `export function <Entity>Form` (Dialog) — used for inline creation inside other forms
- A `export default function <Entity>FormPage` — the standalone create/edit page at `/entities/new` and `/entities/:id/edit`

**Dialog form (named export):**
- Use `<Dialog>`, `<DialogContent>`, `<DialogHeader>`
- `onOpenChange={(v) => { if (!saving) onOpenChange(v); }}` — block close while saving
- Use `<SavingButton saving={saving}>` for submit
- Use `<FormFieldWrapper>` for each label + input pair
- Wrap multi-section dialogs in `<FormSection>` blocks
- Two-column grid for wider forms: `grid grid-cols-2 gap-4`

**Full-page form (default export)** — uses `<FormPage>` from `@/components/FormPage`:
```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { FormPage } from '@/components/FormPage';
import { useUnsavedChanges } from '@/components/UnsavedChangesGuard';

export default function InvoiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Track dirty state for unsaved-changes guard
  const dirty = !loading && JSON.stringify(form) !== JSON.stringify(saved);
  useUnsavedChanges(dirty, 'invoice-form');

  return (
    <FormPage
      title={isEdit ? 'Edit Invoice' : 'New Invoice'}
      description={isEdit ? 'Changes apply everywhere this invoice appears.' : 'Added to the Invoices list immediately after saving.'}
      onBack={() => navigate('/invoices')}
      backLabel="Invoices"
    >
      {/* loading skeleton */}
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* sections */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* fields */}
            </div>
          </section>
          <section className="space-y-4 border-t pt-5">
            <h3 className="text-sm font-semibold text-foreground">Contact</h3>
            {/* fields */}
          </section>
          {/* Cancel + Submit */}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : (isEdit ? 'Save Changes' : 'Create Invoice')}
            </Button>
          </div>
        </form>
      )}
    </FormPage>
  );
}
```
Add routes in `App.tsx`:
```tsx
<Route path="/invoices/new"      element={<DashboardLayout><InvoiceFormPage /></DashboardLayout>} />
<Route path="/invoices/:id/edit" element={<DashboardLayout><InvoiceFormPage /></DashboardLayout>} />
```
Update LIST page "Add" button: `onClick={() => navigate('/invoices/new')}`
Update LIST page Edit button: `onClick={() => navigate(\`/invoices/${item.id}/edit\`)}`

**`<FormPage>` props:**
- `title` — page h1
- `description` — subtitle below h1
- `backLabel` — label on the back button (e.g. "Invoices")
- `onBack` — navigate back function
- `actions?` — extra buttons in the header row (e.g. "Duplicate")
- `footer?` — puts Cancel/Save in a fixed border-t footer strip; omit when buttons live inside the form
- `children` — the form content (inside `bg-card rounded-xl border shadow-sm p-4 md:p-6`)

### DETAIL page
- Two-column layout: `grid grid-cols-1 lg:grid-cols-3 gap-6`
- Left col (lg:col-span-2): main fields in card
- Right col: related/summary card
- Edit opens a FORM dialog (do not navigate away)

### DASHBOARD page
- Stats row (4 StatCards)
- Chart card (recharts BarChart or LineChart)
- Recent activity table (last 10 rows, no pagination)

---

## Table Pattern

Always wrap tables in `<ScrollableX>` — never raw `overflow-x-auto`.

```tsx
import { ScrollableX } from '@/components/ui/scrollable-x';

<ScrollableX>
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b bg-muted/50">
        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Column
        </th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
          <td className="py-3 px-4 text-card-foreground">{item.field}</td>
        </tr>
      ))}
    </tbody>
  </table>
</ScrollableX>
```

---

## StatCard Component

Always import from `@/components/StatCard`. Never recreate this component.

```tsx
import { StatCard } from "@/components/StatCard";
import { ShoppingCart } from "lucide-react";

<StatCard
  title="Total Orders"
  value="1,234"
  subtitle="+12% this month"
  icon={ShoppingCart}
  subtitleColor="primary"  // or "muted"
/>
```

---

## Data Fetching Pattern

**Use `useEffect + useState` for all data fetching. This is the production pattern
in every page in this codebase. Never use `useQuery`/`useMutation` from react-query.**

### API file pattern (`src/lib/api/invoices.ts`)

```ts
import { apiFetch } from "@/lib/api/client";
import type { Invoice } from "@/types/invoice";

// apiFetch takes RequestInit — NO { params } key. Build query strings manually.
function qs(p?: Record<string, string>) {
  if (!p || !Object.keys(p).length) return "";
  return "?" + new URLSearchParams(p).toString();
}

export const invoiceApi = {
  list:   (params?: Record<string, string>) => apiFetch<{ data: Invoice[] }>(`/admin/invoices${qs(params)}`),
  get:    (id: string | number) => apiFetch<{ data: Invoice }>(`/admin/invoices/${id}`),
  create: (body: Partial<Invoice>) => apiFetch<{ data: Invoice }>("/admin/invoices", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string | number, body: Partial<Invoice>) => apiFetch<{ data: Invoice }>(`/admin/invoices/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string | number) => apiFetch<void>(`/admin/invoices/${id}`, { method: "DELETE" }),
};
```

### Page data fetching pattern

```tsx
const [items, setItems]     = useState<Invoice[]>([]);
const [loading, setLoading] = useState(true);

const load = async () => {
  setLoading(true);
  try {
    const res = await invoiceApi.list();
    setItems(res.data ?? []);
  } catch (err) {
    toast.error('Failed to load: ' + (err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    setLoading(false);
  }
};

useEffect(() => { load(); }, []);
// Re-call load() after any create/update/delete to refresh the list
```

### Loading state — always 5 Skeleton rows, never a spinner

```tsx
{loading && Array.from({ length: 5 }).map((_, i) => (
  <tr key={i} className="border-b">
    <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
  </tr>
))}
```

### Empty state — always inside a table row

```tsx
{!loading && filtered.length === 0 && (
  <tr>
    <td colSpan={N} className="px-6 py-8 text-center text-muted-foreground text-sm">
      No invoices found
    </td>
  </tr>
)}
```

### Saving state — button shows spinner + disabled

```tsx
const [saving, setSaving] = useState(false);

// In submit handler:
setSaving(true);
try { await invoiceApi.create(form); toast.success('Created'); onSuccess(); }
catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
finally { setSaving(false); }

// Button:
<Button type="submit" disabled={saving}>
  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save'}
</Button>

// Block dialog close while saving:
onOpenChange={(v) => { if (!saving) onOpenChange(v); }}
```

---

## Form Pattern

Forms use a single `form` state object + inline validation with `toast.error()`.
**Do not use react-hook-form for module forms** — the production pages use direct state.

```tsx
const EMPTY = { name: '', status: 'draft', amount: 0 };
const [form, setForm]   = useState(EMPTY);
const [saving, setSaving] = useState(false);

const openCreate = () => { setForm(EMPTY); setFormOpen(true); };
const openEdit   = (item: Invoice) => { setForm({ ...item }); setFormOpen(true); };
const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.name?.trim()) { toast.error('Name is required'); return; }
  setSaving(true);
  try {
    if (editing) { await invoiceApi.update(editing.id, form); toast.success('Updated'); }
    else         { await invoiceApi.create(form);             toast.success('Created'); }
    setFormOpen(false);
    load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Save failed');
  } finally {
    setSaving(false);
  }
};
```

### Form layout — always label-left with `<FormGrid>`

**Never** use `grid grid-cols-2` or `space-y-1.5 + Label above Input`. All forms use the
label-left pattern: a fixed 10 rem label column on the left, the input fills the right.
This matches Zoho/Xero/QuickBooks and keeps forms compact and scannable.

```tsx
import { FormGrid, FormRow, FormDivider } from '@/components/FormGrid';
import { PhoneInput } from '@/components/PhoneInput';

<FormGrid>
  <FormRow label="Name" required>
    <Input value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
  </FormRow>

  <FormRow label="Status">
    <Select value={form.status} onValueChange={v => set('status', v)}>
      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="active">Active</SelectItem>
      </SelectContent>
    </Select>
  </FormRow>

  <FormRow label="Phone" required>
    <PhoneInput
      code={form.phone_code ?? '+91'}
      number={form.phone ?? ''}
      onCodeChange={v => set('phone_code', v)}
      onNumberChange={v => set('phone', v)}
    />
  </FormRow>

  {/* Section divider — bold heading spanning both columns */}
  <FormDivider label="Address" />

  <FormRow label="Street">
    <Textarea rows={2} value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
  </FormRow>

  <FormRow label="City">
    <Input value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
  </FormRow>
</FormGrid>
```

**`<FormRow>` props:** `label` (required), `required?`, `hint?`, `error?` (red message under field), `htmlFor?`
**`<FormDivider>` props:** `label` — renders a `border-t` + bold section heading spanning both columns

Field components inside `<FormRow>`:
- Text: `<Input value={form.name ?? ''} onChange={e => set('name', e.target.value)} />`
- Number: `<Input type="number" value={form.amount} onChange={e => set('amount', Number(e.target.value))} />`
- Date: `<Input type="date" value={form.date ?? ''} onChange={e => set('date', e.target.value)} />`
- Select: `<Select value={form.status} onValueChange={v => set('status', v)}>` — add `className="w-48"` on `<SelectTrigger>` so it doesn't stretch full width
- Textarea: `<Textarea rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />`
- Switch: `<div className="pt-2"><Switch checked={!!form.is_active} onCheckedChange={v => set('is_active', v)} /></div>`
- **Phone: always use `<PhoneInput>` — never a plain `<Input>` for phone fields**

For alternate/secondary phone, add `phone_code: '+91', phone: '', alternate_phone_code: '+91', alternate_phone: ''` to `EMPTY` and:
```tsx
<FormRow label="Alternate Phone">
  <PhoneInput
    code={form.alternate_phone_code ?? '+91'}
    number={form.alternate_phone ?? ''}
    onCodeChange={v => set('alternate_phone_code', v)}
    onNumberChange={v => set('alternate_phone', v)}
  />
</FormRow>
```

Stores two fields per phone: `phone_code` (e.g. `"+91"`) and `phone` (local digits only). Display with `formatPhone(code, number)` from `src/lib/countryCodes.ts`.

---

## Navigation Registration

Every new module MUST be added to `src/lib/navigation.ts`. Add a new section or
append items to an existing section. The sidebar picks it up automatically.

```ts
// Add to the sections array in src/lib/navigation.ts
{
  label: "Billing",
  items: [
    { title: "Invoices",  url: "/invoices",  icon: FileText },
    { title: "Payments",  url: "/payments",  icon: Wallet  },
  ],
},
```

---

## Icon Rules

All icons from `lucide-react`. Never use react-icons unless an icon doesn't exist in lucide.

| Context | Size class |
|---|---|
| Sidebar nav | `h-5 w-5 shrink-0` |
| Table action button | `h-4 w-4` |
| Stat card | `h-6 w-6 text-primary` |
| Topbar button | `h-5 w-5 text-muted-foreground` |
| Page header | `h-5 w-5` |

---

## File Structure for Each New Module

```
src/
  pages/
    <Module>.tsx          — list page (default export)
    <Module>Detail.tsx    — detail/form page (if needed)
  lib/api/
    <module>.ts           — all API functions, exported as <module>Api object
  types/
    <module>.ts           — TypeScript interfaces, exported as named types
```

Always use PascalCase for page files, camelCase for api/type files.

---

## Status Badge Pattern

When a field is a `select` with status-like values, always render it as a `<Badge>`
with these exact classes. Never invent your own colors.

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  // Order / delivery statuses
  delivered:          "bg-status-delivered/10 text-status-delivered border-status-delivered/20",
  processing:         "bg-status-processing/10 text-status-processing border-status-processing/20",
  shipped:            "bg-status-shipped/10 text-status-shipped border-status-shipped/20",
  pending:            "bg-status-pending/10 text-status-pending border-status-pending/20",
  confirmed:          "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20",
  "out-for-delivery": "bg-status-out-for-delivery/10 text-status-out-for-delivery",
  cancelled:          "bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20",
  returned:           "bg-status-returned/10 text-status-returned border-status-returned/20",
  // Generic yes/no / active states
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
  // Finance statuses
  paid:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  unpaid:   "bg-red-50 text-red-600 border-red-200",
  draft:    "bg-gray-100 text-gray-500 border-gray-200",
  sent:     "bg-blue-50 text-blue-600 border-blue-200",
  overdue:  "bg-red-50 text-red-600 border-red-200",
  // HR statuses
  present:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  absent:   "bg-red-50 text-red-600 border-red-200",
  half_day: "bg-amber-50 text-amber-600 border-amber-200",
  leave:    "bg-purple-50 text-purple-600 border-purple-200",
};

// Usage — always apply "border" so the border color shows
<Badge className={cn("border capitalize", statusStyles[item.status] ?? "bg-muted text-muted-foreground")}>
  {item.status.replace(/_/g, " ")}
</Badge>
```

If the status value isn't in the map above, fall back to `bg-muted text-muted-foreground`.
Never use `variant="default"` for status fields — always use this pattern.

---

## Modules Dialog Section Colors

When adding a new navigation section to `src/lib/navigation.ts`, also add an entry
to the `sectionColors` map in `src/components/ModulesDialog.tsx`.

The full map — extend it with the same pattern:

```tsx
const sectionColors: Record<string, { bg: string; icon: string }> = {
  Overview:              { bg: "bg-blue-50",    icon: "text-blue-600"   },
  Operations:            { bg: "bg-sky-50",     icon: "text-primary"    },
  Inventory:             { bg: "bg-sky-100/70", icon: "text-sky-700"    },
  Finance:               { bg: "bg-amber-50",   icon: "text-amber-600"  },
  "Human Resources":     { bg: "bg-purple-50",  icon: "text-purple-600" },
  Productivity:          { bg: "bg-cyan-50",    icon: "text-cyan-600"   },
  "Customer Engagement": { bg: "bg-pink-50",    icon: "text-pink-600"   },
  Intelligence:          { bg: "bg-violet-50",  icon: "text-violet-600" },
  Admin:                 { bg: "bg-slate-50",   icon: "text-slate-600"  },
  // Add new client sections here — pick a color not already used above
};
```

Color assignment guide for new sections:
- Warehouse / Logistics → `bg-orange-50` / `text-orange-600`
- Legal / Compliance → `bg-red-50` / `text-red-600`
- Marketing → `bg-rose-50` / `text-rose-600`
- Projects → `bg-teal-50` / `text-teal-600`
- Support → `bg-lime-50` / `text-lime-600`

---

## Spacing & Shadow Conventions

| Where | Padding | Shadow |
|---|---|---|
| Page `<main>` | `p-4 md:p-6` | none |
| Stat card | `p-5` | `shadow-sm` |
| Content card | `p-4` (header) + `p-4` (body) | `shadow-sm` |
| Dialog content | default shadcn | `shadow-lg` |
| Floating widget | — | `shadow-2xl` |
| Dropdown / popover | default shadcn | `shadow-md` |

Section spacing between page blocks: always `space-y-6`.
Grid gap between cards: always `gap-4`.
Never use `shadow-md` on flat content cards — only `shadow-sm`.
Never use `shadow-xl` unless the element is floating (modal-like).

---

## What NOT to do

- Never hardcode colors (`#2ea0da`, `text-[#0f1729]`)
- Never use inline `style={{}}` for anything achievable with Tailwind
- Never use `useQuery`/`useMutation` for data fetching — use `useEffect + useState`
- Never create a new layout wrapper — use `<DashboardLayout>` from `@/components/DashboardLayout`
- Never use class components
- Never skip TypeScript types for API responses
- **Never use `grid grid-cols-2` or `space-y-1.5 + <Label>` for form fields** — always use `<FormGrid>` + `<FormRow>` + `<FormDivider>`
- **Never use a plain `<Input>` for phone fields** — always use `<PhoneInput>` (stores `phone_code` + `phone` separately)
- Never add a new page without registering it in `navigation.ts` and `App.tsx`
- Never install a new UI library — everything needed is already installed
- Never recreate components that already exist in `src/components/` — import them instead:
  - `StatusBadge` for any status/source field
  - `TableSkeleton` + `EmptyTableRow` for table loading/empty states
  - `SavingButton` for submit buttons with loading state
  - `SearchInput` for search fields
  - `FilterBar` for the card filter header strip
  - `FormFieldWrapper` + `FormSection` for form layout
  - `FormGrid` + `FormRow` + `FormDivider` for ALL form field layout — never `grid grid-cols-2` or `space-y-1.5 + Label`
  - `FormDialogWrapper` for any create/edit dialog form
  - `ConfirmDeleteDialog` for delete confirmations — never use `window.confirm()`
  - `SectionCard` for content cards
  - `InlineField` + `DetailFieldGrid` for detail panel fields
  - `DetailPageHeader` + `PageLoadingSkeleton` for detail pages
  - `StatsRow` to render a grid of StatCards
  - `UnderlineTabs` or `TabStatusBar` for tab navigation
  - `PaginationBar` for paginated lists
  - `TableActionButtons` for View/Edit/Delete row actions
  - `ExportButton` for CSV/PDF export actions
  - `BackButton` for navigation with fallback
  - `PhoneButton` / `WhatsAppButton` for contact actions
  - `PhoneInput` for any phone number field in a form — never use a plain `<Input>` for phone
  - `CurrencyText` for INR amounts (uses `src/lib/currency.ts`)
  - `ProgressBar` for target vs actual visualisation
  - `PriceBreakdownRow` for financial summary panels
  - `DateRangeFilter` for From/To date inputs
  - `MonthPicker` for month-scoped inputs
  - `AmPmTimePicker` for time entry
  - `InlineCrossAlert` for duplicate phone/email warnings
  - `RecordCount` + `SortToggleButton` for list header utilities
  - `ExportDialog` for column-picker Excel/CSV export with date range + password protection — never build a custom export dialog, never use a plain "Export" button (always the `⋮` three-dot menu)
  - `ImportDialog` for CSV/XLSX bulk import — never build a custom import flow
  - `FilePreviewDialog` for any document link — never open a raw URL in a new tab
  - `RecordCombobox` for any `ref:Entity` field — never use a plain `<Select>`
  - `SortableHeader` for any sortable table column — never use a static `<th>`

---

## Agents

These slash commands are available in every project. Run them at the right time — see `PLAYBOOK.md` for the full workflow.

### Generation

| Command | What it does |
|---|---|
| `/new-client-setup` | Brand, prune nav, write `BRIEF-*.md` for a fresh client clone |
| `/build-client` | Entire ERP from a `BRIEF-*.md` — frontend + backend + HTTP tests for every entity |
| `/scaffold-entity` | Full-stack for a single entity — frontend pages + PHP controller + SQL migration + HTTP tests |
| `/generate-module` | Frontend only — types + API + LIST/FORM/DETAIL pages for one entity |
| `/add-feature` | Adds new capability to an existing project without breaking existing code |
| `/add-page-type` | Adds a missing page type (LIST/FORM/DETAIL/DASHBOARD) to an entity that already has types + API |
| `/restore-module` | Re-adds a template module to a pruned client project, adapted to the client's domain |
| `/seed-brief` | Turns raw client notes or a discovery transcript into a filled `BRIEF-*.md` ready for `/build-client` |

### Research & Planning

| Command | What it does |
|---|---|
| `/research-domain` | Compiles domain knowledge into `DOMAIN-*.md` — makes every subsequent agent smarter |
| `/market-research` | Deep-researches a business domain; produces market + feature knowledge files |
| `/analyze-reuse` | Before `/build-client` — maps what can be reused, adapted, or built from scratch |
| `/compare-features` | Gap analysis: what's built vs what the domain/market research says should exist |
| `/build-graph` | Scans the project and produces `project-graph.json` — entity map + file relationships; always run first |
| `/build-journal` | Writes a developer journal entry summarising what changed and why |

### Review & Quality

| Command | What it does |
|---|---|
| `/review-all` | Fixes TypeScript errors, import issues, and UI pattern violations across all generated files |
| `/review-module` | Reviews a single page/module against CLAUDE.md + UI-SYSTEM rules; lists violations with line + fix |
| `/review-ui-behavior` | Checks dialog/form interaction bugs: saving guards, select conflicts, double-submit, navigation |
| `/review-cross-module` | Verifies data entered in one module reflects correctly across all other modules, especially Finance and navigation; **mandatory after any payment, expense, invoice, GST, settlement, list column, or routing change** |
| `/review-standards` | Code standards review — engineering principles, naming, error handling; reports violations without fixing |
| `/review-edge-cases` | Finds every edge case, boundary condition, and missing undo/reversal path that could corrupt data |
| `/audit-project` | Full project health report — code quality, API coverage, test results, prioritised fix list |
| `/audit-comprehensive` | Deep security + quality audit across all of `src/` and `api/` — validation, auth, business logic, UX |

### Database & Schema

| Command | What it does |
|---|---|
| `/validate-schema` | Cross-references every PHP controller against SQL files; reports every unknown column or missing table |
| `/normalize-db` | Checks schema against 1NF–4NF/BCNF; cross-references live controller code to find redundant columns |
| `/ensure-coupling` | Verifies every cross-entity trigger is implemented — one action should cascade all consequences |

### Impact & Sync

| Command | What it does |
|---|---|
| `/impact-check` | Before any change — reads `project-graph.json`, finds every affected file, makes all required changes |
| `/ui-sync` | Upgrades an existing project's UI to current Kynetropo standards — see below |
| `/track-changes` | Records every change in `changes-registry.json`; drift-checks previous changes — **runs automatically** |

### Testing & Deployment

| Command | What it does |
|---|---|
| `/create-http-tests` | Writes `.http` test files for every endpoint in a controller |
| `/create-ui-tests` | Writes browser-based UI test scripts for forms, dialogs, and navigation flows |
| `/local-test` | Guides full local verification before deploying — dev server, API, auth, all modules |
| `/hostinger-deploy` | Deploys to Hostinger via SFTP — creates `.env`, uploads files, runs migrations |
| `/verify-deployment` | Checks a live Hostinger deployment — PHP, DB schema, `.htaccess`, `.env`; auto-fixes via SSH |

### /ui-sync — upgrading an old project

Run `/ui-sync` on any project cloned before these components existed, or any project built by a third party.

It does NOT touch business logic or APIs. It only upgrades frontend files to match the current design system:

1. Copies missing components from the template (`ExportDialog`, `ImportDialog`, `FilePreviewDialog`, `RecordCombobox`, `SortableHeader`, `ChatWidget`, and all other standard reusables)
2. Upgrades `TopNavbar` and `AppSidebar` to the latest version (GlobalSearch, WorkspaceTabs, avatar popover, fullscreen toggle)
3. Upgrades `DashboardLayout` to fixed `h-screen overflow-hidden`, `--sidebar-width-icon: 5.25rem`, always-on `<ChatWidget />`
4. Upgrades every page in `src/pages/`:
   - `window.confirm()` → `<ConfirmDeleteDialog>`
   - Dialog forms with > 8 fields → dedicated full-page form with `<BackButton>`
   - Raw `overflow-x-auto` → `<ScrollableX>`; static `<th>` → `<SortableHeader>`
   - Spinner / plain loading → 5 `<TableSkeleton>` rows
   - Hardcoded badge colors → `<StatusBadge>`
   - `<Select>` for ref fields → `<RecordCombobox>`
   - Hardcoded color classes → design token classes
   - Missing export button → `<ExportDialog>`
5. Runs `npm run build` and fixes any TypeScript errors introduced

### /track-changes — change registry (RUNS AUTOMATICALLY)

**You MUST run the `track-changes` agent after every task that writes or edits any file.**
No tagging required — it runs automatically. Do not skip it, even for small changes.

Trigger it by invoking the agent after every edit session completes and `npm run build` is clean.

**What it stores per change:**
```json
{
  "id": 1,
  "date": "2026-08-11",
  "description": "Plain English: what changed and why",
  "change_type": "ui-pattern | component-swap | field-type | layout | logic | api | style | new-feature | bug-fix",
  "file": "src/pages/Customers.tsx",
  "element": "delete confirmation for customer row",
  "location_hint": "handleDelete function and Delete button",
  "before": "<exact old code snippet>",
  "after": "<exact new code snippet>",
  "drifted": false,
  "drift_checked": "2026-08-11"
}
```

**Deduplication rule:** If a new change touches the same `file` + `element` as an existing entry, the old entry is replaced — the registry always reflects the current intended state, not the full history.

**Drift check:** Runs automatically before recording. Also run explicitly before any big change:
`@track-changes drift-check` — verifies all `after` code is still present; auto-repairs drift.

**Modes (when called explicitly):**
- `@track-changes` — drift check + record (default)
- `@track-changes drift-check` — check only, no new record
- `@track-changes list` — print all recorded changes in plain English
