# Kynetropo ERP — UI Sync Procedure

How to bring an existing project up to current Kynetropo UI standards.

---

## When to use this

- The project was built before the current UI standards were established
- Pages are using `overflow-x-auto` instead of `<ScrollableX>`
- Delete confirmations use `window.confirm()` instead of `<ConfirmDeleteDialog>`
- Status badges are hardcoded colors instead of `<StatusBadge>`
- List pages are missing `<ExportDialog>`
- Loading states use spinners instead of `<TableSkeleton>`
- Large dialog forms that should be full-page forms
- `TopNavbar`, `AppSidebar`, or `DashboardLayout` are on an older version

---

## Step 1 — Pull the latest template and sync the MD files

Before touching the client project, make sure it has the latest rules, patterns, and agent definitions.

```bash
cd C:/Users/I768970/BI-ERP-KYNETROPO/kynetropo-erp-template
git pull
```

Then copy these files into the client project root (overwrite if they already exist):

```
kynetropo-erp-template/CLAUDE.md    →  <client-slug>-erp/CLAUDE.md
kynetropo-erp-template/PLAYBOOK.md  →  <client-slug>-erp/PLAYBOOK.md
kynetropo-erp-template/AGENTS.md    →  <client-slug>-erp/AGENTS.md
```

Keep the template as a sibling folder alongside all client projects so Claude can reference it when copying missing components:

```
BI-ERP-KYNETROPO\
  ├── kynetropo-erp-template\     ← always kept updated
  ├── ravi-medicals-erp\
  ├── eosudar-k2-erp\
  └── <client-slug>-erp\
```

---

## Step 2 — Open the existing project in Claude Code

```bash
code <client-slug>-erp
```

Make sure you are in the client project folder, not the template folder.

---

## Step 3 — Run a drift check first

Before changing anything, verify what has been intentionally customised so nothing gets accidentally overwritten:

```
@track-changes drift-check — make sure all previous changes are still in place before we start
```

---

## Step 4 — Run the upgrade

```
Read PLAYBOOK.md.
/ui-sync
```

What it does to every page in the project:

- Wraps all tables in `<ScrollableX>` (removes raw `overflow-x-auto`)
- Replaces `window.confirm()` delete prompts with `<ConfirmDeleteDialog>`
- Replaces inline loading spinners with 5-row `<TableSkeleton>`
- Replaces hardcoded status badge colors with `<StatusBadge>`
- Replaces `<Select>` on reference / lookup fields with `<RecordCombobox>`
- Adds `<ExportDialog>` to every list page that doesn't have one
- Upgrades `TopNavbar`, `AppSidebar`, `DashboardLayout` to latest versions
- Converts large dialog forms (more than 8 fields or multi-section) to full-page forms
- Cleans all hardcoded color classes to design token equivalents

Touches **only frontend files** — no PHP, no SQL, no migrations.

---

## Step 5 — Fix any TypeScript errors from the upgrade

```
/review-all
```

---

## Step 6 — Build must be clean

```
npm run build
```

Fix anything it reports, then re-run until clean.

---

## Step 7 — Record the upgrade as a new baseline

```
@track-changes
```

This stamps all the upgraded patterns as the new baseline so future drift checks know what the intended state is.

---

## Step 8 — Deploy

```
/hostinger-deploy → <slug>
/verify-deployment → <slug>
```

Only the `dist/` folder needs to be uploaded — no PHP or SQL changes were made.

---

## If components are missing entirely

Sometimes an older project is missing components that didn't exist when it was built (`ExportDialog`, `ScrollableX`, `ConfirmDeleteDialog`, etc.). `/ui-sync` checks for this and copies missing components from the template automatically.

If it cannot find the template, add this to your prompt:

```
Read PLAYBOOK.md.
The template is at kynetropo-erp-template/src/components/.
Copy any missing components from there, then run /ui-sync.
```

---

## Full command sequence at a glance

```
0. cd kynetropo-erp-template && git pull
   Copy CLAUDE.md + PLAYBOOK.md + AGENTS.md → <client>-erp/
1. code <client-slug>-erp
2. @track-changes drift-check
3. Read PLAYBOOK.md → /ui-sync
4. /review-all
5. npm run build          ← must be clean
6. @track-changes
7. /hostinger-deploy → <slug>
8. /verify-deployment → <slug>
```
