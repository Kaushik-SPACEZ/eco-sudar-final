# Kynetropo ERP — Agent Playbook

Complete reference for every scenario: building, testing, fixing, deploying, and evolving a client ERP.
**When in doubt about any step — read this file first.**

---

## HOW TO USE THIS PLAYBOOK

**For employees — when you have an error, bug, or new feature request:**

Step 1 — Describe the issue to Claude (with screenshots if needed)
Step 2 — Add this at the end of your message:

```
Read PLAYBOOK.md and generate the exact prompt I should run to fix/build this,
including which agents to use in what order. Make the prompt autonomous —
it should run without me needing to answer questions.
```

Step 3 — Claude reads PLAYBOOK.md and gives you a ready-to-run prompt
Step 4 — Paste that prompt into Claude and leave it running

**⚠️ NEVER make direct code changes without running agents.**
Direct changes without agents cause missing columns, broken imports, and stale graph.

If you already made direct changes — run this immediately:
```
Read PLAYBOOK.md. I made direct code changes to [describe what you changed].
Generate a prompt to verify and fix everything I may have missed.
```

---

## MANDATORY AGENTS IN EVERY GENERATED PROMPT

**Every prompt generated from this PLAYBOOK must include ALL of these agents in order.**
Claude must never generate a prompt that skips any of these.

**IMPORTANT: Even if someone writes a prompt themselves without asking PLAYBOOK —
Claude must detect missing agents and ADD them before executing.**

If Claude receives any prompt that is missing mandatory agents, it must:
1. Silently add the missing agents at the correct position
2. Then execute the full prompt with all agents included

```
STEP 0:  /build-graph              ← ALWAYS first — sync graph before anything
DURING:  php -l <file>             ← after EVERY PHP file edit — no exceptions
         (skip only if zero PHP changes)
AFTER:   /impact-check → "..."     ← after main code changes — finds all affected files
AFTER:   /validate-schema          ← after any PHP that queries the DB
         (skip only if zero PHP changes)
AFTER:   /review-all               ← after all code changes — TypeScript + UI checks
AFTER:   /review-ui-behavior       ← after any dialog, form, popup, or navigation change
AFTER:   /review-cross-module      ← MANDATORY when touching financial data, payments,
                                      expenses, navigation, list columns, or Finance module
                                      Checks: data propagation across modules, back button
                                      correctness, column value accuracy
AFTER:   /ensure-coupling          ← MANDATORY after writing ANY controller method, DB migration,
                                      or frontend form that creates/updates/deletes data
                                      Runs DURING development alongside every build step
                                      Writes cascade code for every module that should react
                                      to the action — one action triggers all consequences
AFTER:   /normalize-db             ← MANDATORY after creating ANY SQL migration file
                                      Detects calculated columns, duplicate columns, stored
                                      aggregates — fixes them BEFORE PHP controllers are written
                                      Ensures one source of truth for every piece of data
AFTER:   /review-edge-cases        ← MANDATORY when any flow has status changes, approvals,
                                      claims, cancellations, or financial transactions
                                      Checks: reverse/undo paths, idempotency, rollback,
                                      null safety, boundary conditions, cascade side effects
AFTER:   /build-graph              ← after all changes — update relationships
FINAL:   npm run build             ← must be clean before deploying
FINAL:   /track-changes           ← drift-check all previous changes, then record this change
                                     (tag "@track-changes" in any prompt to also record mid-session)
```

**When is /review-cross-module required:**
- Any payment, expense, invoice, GST, settlement created or updated
- Any new list page or table column added
- Any navigation, back button, or routing changed
- Any Finance sub-module (Payments, Expenses, GST, Reports, P&L) modified
- Any feature that creates data in one module that should appear in another

**What /review-cross-module catches:**
- Payment entered in one module but not showing in Finance → Payments
- Expense created but not appearing in Finance → Expenses or P&L
- GST entry not reflecting in Finance → GST module
- Back button goes to wrong page after form submit or dialog close
- Table column showing data from wrong table or wrong JOIN
- Finance totals not updating when transactions are created elsewhere

**Every generated prompt must also end with:**
- List of files changed → exact SFTP upload paths
- SQL to run in phpMyAdmin (if any new tables or ALTER columns)
- `php migrate.php` command (if SQL changed)
- `/verify-deployment → <slug>` (after upload to server)

**If any agent is missing from a received prompt — add it before running.**

---

**Examples of what to say:**

```
"The /admin/leads page shows 500 error. Screenshot attached.
Read PLAYBOOK.md and generate the exact prompt to fix this."

"I need to add a bulk export button to the Properties page that downloads all
properties as CSV. Read PLAYBOOK.md and generate the prompt to build this."

"After uploading new files, the login stopped working.
Read PLAYBOOK.md and generate the exact prompt to diagnose and fix this."
```

Claude will generate a complete prompt with the right agents, right order,
and all the details needed — you just paste and run it.

---

## THE AGENTS — what each one does

| Command | Purpose | Input | Output |
|---|---|---|---|
| `/new-client-setup` | Start a new client project — brand, prune, brief | Client name, slug, requirements | `BRIEF-*.md` written, unused pages/routes removed |
| `/seed-brief` | Convert messy notes to structured brief | Raw requirements text | `client-briefs/BRIEF-*.md` |
| `/analyze-reuse` | Compare brief to template — find reusable modules | Brief file path | `REUSE-*.md` with REUSE/ADAPT/NEW classification |
| `/build-client` | Generate entire ERP from brief | Brief file path | All TSX + PHP + SQL files |
| `/scaffold-entity` | Generate one entity (all 3 layers) | Entity block from brief | Types + API + Pages + Controller + SQL + HTTP tests |
| `/generate-module` | Frontend only for one entity | Entity block | TSX + API + Types |
| `/backend-scaffold` | Backend only for one entity | Entity block | PHP controller + SQL migration |
| `/create-http-tests` | HTTP test file for one entity (22 scenarios) | Entity block | `tests/http/<entity>.http` |
| `/add-page-type` | Add missing page to existing entity | Entity name + page type | New TSX page |
| `/restore-module` | Add a template module back to a pruned project | Module names | Pages restored, routes uncommented, SQL listed |
| `/add-feature` | Add new capability (upload, PDF, email, AI, popups, portals) | Feature description | Code changes across all layers |
| `/review-all` | Check ALL files for violations + fix them | (none) | Violations fixed, tsc zero errors, UI checks |
| `/review-ui-behavior` | Check dialogs/forms for interaction bugs — saving guards, dialog close, select conflicts | (none) | Behavior issues fixed |
| `/ui-sync` | Upgrade an existing project's UI to current Kynetropo standards — delete dialogs, form→page conversion, table patterns, export, status badges, comboboxes, color tokens | (none) | All pages upgraded to latest patterns; `npm run build` clean |
| `/review-cross-module` | Check financial data propagates across modules, navigation correctness, column accuracy | (none) | `CROSS-MODULE-INTEGRITY-REPORT.md` + all fixes applied |
| `/ensure-coupling` | Run DURING development after every controller/migration/form — writes cascade code so one action triggers all relevant module updates | (none) | `MODULE-COUPLING-MAP.md` updated, all cascade code written |
| `/normalize-db` | Run after creating SQL migrations — detects and fixes calculated columns, duplicate columns, and stored aggregates before any PHP is written | (none) | `DB-NORMALIZATION-REPORT.md` + fix migrations created |
| `/review-edge-cases` | Find every missing path in every flow — reverse/undo, idempotency, partial failure, null safety, boundary conditions | (none) | `EDGE-CASE-REPORT.md` with flowchart + all Critical fixes applied |
| `/track-changes` | Verify all previous changes still work, then record new change in changes-registry.json | (none) | `changes-registry.json` updated, broken changes auto-fixed |
| `/review-standards` | Check SOLID, ERP, AI, HCI, DRY, security principles | (none) | `CODE-STANDARDS-REPORT.md` + Critical fixes applied |
| `/build-graph` | Map all entity relationships | (none) | `project-graph.json` written |
| `/impact-check` | Find all files affected by a change + fix them | Change description | Impact report + all fixes applied |
| `/fix-500s` | Fix ALL failing endpoints in one pass | Error log output | Fixed controllers + upload list |
| `/local-test` | Verify everything works locally | (none) | Pass/fail per check + fixes |
| `/audit-project` | Full health check — code + all endpoints + cross-entity + report | (none) | `audit-report.md` |
| `/verify-deployment` | Verify live Hostinger — 12 checks + bulk 500 test | Client slug | All checks + auto-fixes |
| `/hostinger-deploy` | Step-by-step deploy guide | Client slug | Filled-in checklist |

**Prompt files for complex features:**
```
Read client-briefs/FEATURE-<name>.md and execute it fully.
```
Available: `FEATURE-call-transcript.md`, `FEATURE-detail-views.md`, `FEATURE-agent-portal.md`

---

## HOW TO ADD A NEW FEATURE

Use this exact prompt pattern every time you add any new feature.
Copy it, fill in the one line description, and paste into Claude.

```
Read PLAYBOOK.md, project-graph.json.
Read client-briefs/MODULE-COUPLING-MAP.md if it exists.

/build-graph
/validate-schema

Feature to add: [YOUR ONE LINE DESCRIPTION HERE]

Before writing any code:
  Read all related existing files
  Check database/ for exact column names before any PHP
  Read MODULE-COUPLING-MAP.md to understand existing module connections

Build the feature. After writing EVERY controller method or form submit:
  /ensure-coupling → write all cascade code immediately so this action
  triggers updates in every module that should know about it

If any new SQL migration files are created during the feature:
  /normalize-db → scan new tables, fix any violations before writing PHP

After feature is complete:
  php -l on every PHP file touched
  /validate-schema
  /impact-check → "[feature name]"
  /review-all
  /review-ui-behavior → apply every Critical fix found
  /review-cross-module → verify new feature connects to all relevant modules
  /review-edge-cases → verify reverse/undo, edge cases, null safety
  /review-standards → apply every Critical fix found
  /track-changes
  /build-graph
  npm run build — must be clean

Print files changed. Do NOT push to git.
```

### What /ensure-coupling does during development

Every time a new controller method is written, `/ensure-coupling` runs
immediately and writes all cascade code before moving to the next method.

Example — writing a "refund" feature:
1. Controller method written → `/ensure-coupling` runs
2. It writes: project balance update, finance entry, activity log,
   dashboard refresh, client payment timeline update
3. All in the same step — not discovered later

This is how one action triggers consequences in all modules automatically.

### New agents added to every feature prompt

| Agent | When | Why |
|---|---|---|
| `/ensure-coupling` | After every controller/form written | Writes cascade code so one action updates all modules |
| `/normalize-db` | After every new SQL migration created | Removes duplicate/calculated columns before PHP is written |
| `/review-cross-module` | After feature complete | Verifies all connections work correctly |
| `/review-edge-cases` | After feature complete | Finds missing reverse/undo paths |
| `/track-changes` | After build is clean | Records change in registry, verifies previous features still work |

---

## CHANGE REGISTRY — tracking and protecting every change

The change registry (`changes-registry.json` at the project root) is the source of
truth for what has been intentionally changed from the template baseline.

### Why it exists

Two problems it solves:
1. **Drift** — making 20 changes and finding that change #1 got accidentally overwritten somewhere in the middle
2. **Repeated work** — having to re-explain the same change in a new session because the context was lost

### How to use it — tag @track-changes in every prompt

Add `@track-changes` at the end of any prompt that makes code changes:

```
Change the status badge in the Orders table to use StatusBadge component. @track-changes
```

The agent runs **after** the change and records it. It also runs a drift check first to verify all previous changes are still intact.

### Modes

| Invocation | What happens |
|---|---|
| `@track-changes` | Drift check + record new change (default — run after every change session) |
| `@track-changes drift-check` | Check all previous changes are still present; auto-repair any that got overwritten |
| `@track-changes list` | Print all recorded changes in plain English with status (intact / drifted / needs-review) |

### Run drift-check before a big refactor

Before starting any large change (new module, `/ui-sync`, `/restore-module`):

```
@track-changes drift-check — make sure all previous changes are still in place before we start
```

This catches any changes that got quietly reverted and re-applies them before you add more on top.

### What gets stored per change

```json
{
  "id": 1,
  "date": "2026-08-11",
  "description": "Plain English: what changed and why",
  "change_type": "ui-pattern",
  "file": "src/pages/Customers.tsx",
  "element": "delete confirmation for customer row",
  "location_hint": "handleDelete function and Delete button",
  "before": "<exact old code snippet>",
  "after": "<exact new code snippet>",
  "drifted": false,
  "drift_checked": "2026-08-11"
}
```

### Deduplication rule

If you change the same element twice, the registry stores only the net result. Old entry is deleted and replaced by the new one. The registry always shows current intended state — not history.

Example: you change a dropdown to a textbox, then later change it back to a dropdown → the registry ends up with one entry: "field is a dropdown." The textbox detour is gone.

### Initialisation

On first run (no `changes-registry.json` exists), the agent creates it with entry #0 — a baseline snapshot listing all existing pages and modules. Every subsequent change builds on top of this baseline.

---

### 1. Read SQL before writing any PHP
```bash
grep -rl "CREATE TABLE.*<table_name>" database/
grep -A 40 "CREATE TABLE.*<table_name>" database/<file>.sql
```
Write ALL queries using ONLY columns in that SQL file. Never assume column names.
This prevents every "Unknown column" 500 error.

### 2. php -l after every PHP edit
```bash
php -l <path-to-file>.php
# Must say: No syntax errors detected
```
Never upload a PHP file that fails this check.

### 3. Portal JWT rule
```
Portal A JWT → Portal A Middleware ✅
Portal A JWT → Portal B Middleware ❌ → 401
```
Every secondary portal (agent/customer/dealer) must use its own routes and middleware.
Pages in Portal A must call `/portal-a/*` routes — never `/admin/*` routes.

---

## PHASE 1 — BUILD A NEW CLIENT ERP

### Step 1 — Clone and setup
```bash
git clone https://github.com/processai2026-arch/kynetropo-agent-template <client-slug>-erp
cd <client-slug>-erp
npm install
code .
# Restart Claude Code → type / → all commands appear
```

### Step 2 — Setup, prune and brief
```
/new-client-setup
```
Give it: client name, slug, raw requirements

**It does:**
1. Verifies all api/ framework folders exist (stops if missing — `git pull` to fix)
2. Updates `src/brand.ts`
3. Prunes unused pages, routes, nav sections, api/index.php routes
4. Writes `client-briefs/BRIEF-*.md` with entities, fields, business rules, cross-entity connections

**Immediately after:**
```
/review-all
```
Catches broken imports/routes from pruning. Zero errors required.

### Step 3 — Research domain (NEW — run before build)

```
/research-domain
```

Searches the web for everything about this client's industry and country.
Writes `client-briefs/DOMAIN-*.md` with:
- End-to-end business process
- Financial formulas and tax rules with worked examples
- Standard terminology (what things are called in this industry)
- Legal/compliance requirements
- Business rules and edge cases
- Auto-fill opportunities
- Missing features found in research

**This makes every subsequent agent smarter.** Claude reads this file before
every task and makes correct decisions without being told explicitly.

Example: If domain file says "GST = commission × 18%, never on gift amount" —
Claude will implement this correctly in PaymentForm without being told.

### Step 4 — Analyze reuse
```
/analyze-reuse  →  client-briefs/BRIEF-*.md
```
Classifies: REUSE / ADAPT / NEW. Writes `REUSE-*.md`.

### Step 4 — Build
```
/build-client  →  client-briefs/BRIEF-*.md
```
Reads SQL files before generating PHP — columns verified against actual schema.

After build:
```
/review-all
```
Zero errors required.

### Step 5 — Build graph
```
/build-graph
```
Writes `project-graph.json`. Required before `/impact-check`.

### Step 6 — Validate schema
```
/validate-schema
```
Finds missing tables and columns BEFORE they cause 500s on server.

After it writes `schema-report.md`:
```
Read schema-report.md and fix every issue listed.
For MISSING TABLES: find create_*.sql → import in phpMyAdmin, or wrap in try/catch
For MISSING COLUMNS: read SQL → fix column name → php -l
For AMBIGUOUS COLUMNS: add table alias prefix
After fixes: /review-all → /build-graph → npm run build
```

### Step 7 — Test locally
```
/local-test
```
Do not deploy until clean report.

### Step 8 — Deploy
```
/hostinger-deploy  →  <slug>
```
Key points:
- `.env` at `public_html/.env` — NOT above it
- Use unquoted heredoc `<< ENVEOF` — JWT expands correctly
- Generate JWT: `JWT=$(php -r "echo bin2hex(random_bytes(32));")`
- Import `database/auth_tables.sql` FIRST
- Upload `database/` folder via SFTP — migrate.php must be on server
- Run `php database/migrate.php` after every SQL import
- Verify `.env` still exists after every SFTP upload

### Step 9 — Verify deployment
```
/verify-deployment  →  <slug>
```
Runs 12 checks + bulk 500 test (base AND filtered queries).

For every ❌ 500:
```bash
tail -5 ~/domains/<slug>.kynetropo.com/public_html/api/error_log
```
Then `/fix-500s` to fix all failing endpoints in one pass.

---

## PHASE 2 — CLIENT ADDS A MODULE FROM TEMPLATE

```
/build-graph          ← resync first
/restore-module       ← restore pages + uncomment routes + adapt to client domain
/validate-schema      ← find missing columns/tables BEFORE deploying
/review-all           ← fix broken imports + React Router + UI checks
/build-graph          ← update graph
npm run build         ← must be clean
SFTP upload           ← api/index.php + dist/ + database/
SQL import            ← phpMyAdmin (agent lists files in dependency order)
php migrate.php       ← SSH
/verify-deployment    ← confirm all 200s
```

**Restore prompt:**
```
Add [modules] to this project. Read project-graph.json first.
Restore missing pages: git checkout origin/main -- src/pages/X.tsx
Uncomment routes in api/index.php.
Adapt to client domain — REMOVE if not in brief, ADAPT if terminology differs, KEEP AS-IS if matches.
List SQL in dependency order. Do not stop between modules.
```

---

## PHASE 2B — UPGRADING AN EXISTING PROJECT'S UI

When a project was built before the current UI standards (ExportDialog, ImportDialog,
FilePreviewDialog, RecordCombobox, SortableHeader, fixed ChatWidget, ConfirmDeleteDialog),
run `/ui-sync` to bring it up to date in one pass.

```
/ui-sync
```

It touches ONLY frontend files — no PHP, no SQL, no migrations.

After `/ui-sync`:
```
/review-all          ← fix any TypeScript errors
npm run build        ← must be clean
@track-changes       ← record all upgraded patterns as a baseline
SFTP upload dist/    ← deploy the upgraded frontend
/verify-deployment   ← confirm all pages still load
```

**What /ui-sync does:**
1. Copies all missing standard components from the template
2. Upgrades TopNavbar, AppSidebar, DashboardLayout to latest versions
3. Replaces `window.confirm()` with `<ConfirmDeleteDialog>` in every page
4. Converts large dialog forms (> 8 fields / multi-section) to full-page forms
5. Wraps all tables in `<ScrollableX>`, replaces static `<th>` with `<SortableHeader>`
6. Replaces inline loading spinners with 5-row `<TableSkeleton>`
7. Replaces hardcoded status badge colors with `<StatusBadge>`
8. Replaces `<Select>` on ref fields with `<RecordCombobox>`
9. Cleans hardcoded color classes to design token equivalents
10. Adds `<ExportDialog>` to every LIST page that lacks one

---

## PHASE 3 — ADDING NEW FEATURES

```
/build-graph  (if stale)
/add-feature  →  describe the feature
```

**add-feature automatically runs after writing code:**
1. `/impact-check` — finds affected files from graph.json
2. `/validate-schema` — verifies no missing columns
3. `/review-all` — TypeScript + php -l + UI checks
4. `/build-graph` — updates relationships
5. `npm run build`

**Feature patterns:**
- File upload → `FileStore::put()`
- PDF export → `jsPDF + autoTable`
- Email → `Mailer::send()`
- CSV import → `ImportEngine.php`
- Status timeline → append-only `*_history` table
- AI features → Groq API (already in .env)
- Detail popups → shadcn Dialog
- Side panels → shadcn Sheet
- Full detail pages → two-column layout
- Secondary portals → separate JWT + middleware + routes

**For complex features — use prompt files:**
```
Read client-briefs/FEATURE-<name>.md and execute it fully.
```

---

## PHASE 4 — CHANGING EXISTING FEATURES

```
/build-graph  (if stale)
/impact-check  →  describe the change
/validate-schema → /review-all → /build-graph → npm run build
Upload → php migrate.php → /verify-deployment
```

---

## PHASE 5 — WHEN THINGS BREAK

### Multiple 500 errors
```
/fix-500s
```
Paste failing endpoints + error log. Fixes all in one pass.

### Schema errors (Unknown column / Table doesn't exist)
```
/validate-schema
```
Then: `Read schema-report.md and fix every issue listed.`

### TypeScript / UI rendering errors
```
/review-all
```
Catches: TypeScript errors, missing imports, double-render bugs, wrong route nesting, portal JWT conflicts, data display issues.

### "No tenant context" error
```bash
ls ~/domains/<slug>/public_html/.env
grep "TENANCY_ENABLED\|JWT_SECRET" ~/domains/<slug>/public_html/.env
# JWT_SECRET must be real hex — not placeholder, not $(php...) literal
```
Fix:
```bash
JWT=$(php -r "echo bin2hex(random_bytes(32));")
sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT|" ~/domains/<slug>/public_html/.env
```

### 401 on secondary portal pages
Portal pages calling `/admin/*` routes get 401 — each portal must call its own routes.
Fix: add `/portal/*` route in api/index.php with correct middleware guard, update page to call that route.

### PHP syntax error
```bash
php -l ~/domains/<slug>/public_html/api/controllers/admin/<Controller>.php
```
Find the line, fix syntax, re-upload.

### .env disappeared after SFTP upload
```bash
JWT=$(php -r "echo bin2hex(random_bytes(32));")
cat > ~/domains/<slug>/public_html/.env << ENVEOF
DB_HOST=127.0.0.1
DB_NAME=u952547820_<slug>
DB_USER=u952547820_<slug>u
DB_PASS=<password>
JWT_SECRET=$JWT
TENANCY_ENABLED=false
FOUNDING_TENANT_ID=1
CORS_ORIGIN=https://<slug>.kynetropo.com
APP_ENV=production
groq_api_key=gsk_YOUR_KEY
groq_api_key_new=gsk_YOUR_KEY
ENVEOF
```

### migrate.php not found on server
Upload `database/` folder via SFTP — it was never uploaded.

---

## PHASE 6 — project-graph.json

| Scenario | Action |
|---|---|
| After `/build-client` | Run `/build-graph` once |
| Before `/impact-check` | Must exist — run `/build-graph` if missing |
| Before `/add-feature` | Must exist — run `/build-graph` if missing |
| Before `/restore-module` | Run `/build-graph` to map current state |
| After `/add-feature` | Auto-updated |
| After `/impact-check` | Auto-updated |
| After any manual file change | Run `/build-graph` to resync |
| After `/restore-module` | Run `/build-graph` after |

---

## QUICK REFERENCE — which agent for which scenario

| Scenario | Agent | Graph needed? |
|---|---|---|
| Research business domain before building | `/research-domain` | No |
| New client | `/new-client-setup` | No |
| Messy notes → brief | `/seed-brief` | No |
| Build entire ERP | `/build-client` | No (run after) |
| Add one entity | `/scaffold-entity` | Run after |
| Add missing page | `/add-page-type` | Run after |
| Client wants pruned module back | `/restore-module` | YES — before and after |
| Add field / rename / status change | `/impact-check` | YES |
| Add feature (upload/PDF/AI/popup/portal) | `/add-feature` | YES |
| Fix controller bug | `/impact-check` | YES |
| Page shows wrong data | `/impact-check` | YES |
| Multiple 500s | `/fix-500s` | No |
| Unknown column / table errors | `/validate-schema` | No |
| Check code quality + UI issues | `/review-all` | No |
| Upgrade old project UI to Kynetropo standards | `/ui-sync` | No |
| Test locally | `/local-test` | No |
| Deploy | `/hostinger-deploy` | No |
| Verify live + all 500s | `/verify-deployment` | No |
| Full project health check | `/audit-project` | No |
| Graph stale/missing | `/build-graph` | Rebuilds it |
| Something broke | `/fix-500s` (server) or `/review-all` (code) | No |

---

## COMMON ERRORS — cause and fix

| Error | Cause | Fix |
|---|---|---|
| Empty 500, no response | Missing `RewriteBase /api/` or `CGIPassAuth On` | `/verify-deployment` Check 2 |
| 500 on specific page | Template controller queries missing table | Comment route, add client controller |
| "No tenant context" | `.env` missing, JWT placeholder | `/verify-deployment` Check 1 |
| 401 on all requests | Token stripped by LiteSpeed | Check `CGIPassAuth On` in api/.htaccess |
| 401 on portal pages | Portal calling wrong middleware routes | Add /portal/* routes, update page API calls |
| Login page inside another page | Route nested inside layout wrapper | Move login to top-level Routes, no wrapper |
| `cn not found` | Missing import | `/review-all` |
| `array $request` type hint | Wrong PHP type | Fix to `Request $request` in ALL methods |
| `$request->userId()` | Method doesn't exist | Use `$request->user['user_id']` |
| `Table X doesn't exist` | SQL not imported | `/validate-schema` → import SQL → migrate.php |
| `Unknown column 'X'` | Wrong column name — read SQL first | `/validate-schema` → read SQL file → fix controller |
| `Errors parsing file.php` | PHP syntax error | `php -l file.php` → fix → re-upload |
| `migrate.php not found` | database/ folder not uploaded | Upload `database/` via SFTP |
| `Column not found` when importing SQL | ALTER before CREATE | Import CREATE file first, then ALTER |
| `.env` disappeared | SFTP deleted it | Recreate via SSH with unquoted heredoc |
| Base 200 but UI shows 500 | Filtered query fails | Test `?status=X` not just base endpoint |
| Dates show as ISO strings | Not formatted | Format in TSX: `new Date(x).toLocaleDateString()` |
| Null shows as "null" | Not handled | Show `"—"` for null/undefined values |

---

## UI TESTING

Run after every feature build. Two tools cover different things:

### Tool 1 — Playwright (automated)
Catches: page loads, missing routes, buttons, dialogs, form validation.

Run order:
1. /create-ui-tests → generates all test files
2. npx playwright test → runs tests, opens report
3. Analyze failures → write client-briefs/UI-FIXES-REQUIRED.md (prompt in UI-TESTING-GUIDE.md)
4. Fix real app code issues first (missing routes, crashes)
5. Fix test selector issues second
6. Re-run until 0 failures

### Tool 2 — /review-ui-behavior (static analysis)
Catches: dialog/select conflicts, double submit, missing saving guards, missing toasts.

Run: /review-ui-behavior
Output: client-briefs/UI-BEHAVIOR-ISSUES.md with exact fix prompts per file.
Most critical fix: onInteractOutside={(e) => e.preventDefault()} on every DialogContent that contains a Select.

### Skipped tests
Skipped = empty database. Fix by running database/seed_demo_data.sql in phpMyAdmin.

### Full guide
See client-briefs/UI-TESTING-GUIDE.md for exact prompts in order.

### What only manual testing catches
- Business logic correctness
- Mobile layout
- PDF content
- Performance

Run a manual walkthrough before every client handover (30 minutes).

---

## DEPLOYMENT CHECKLIST

```
[ ] /new-client-setup         — brand, prune, brief, index.php routes cleaned
[ ] /review-all               — zero TypeScript errors, zero UI issues
[ ] /analyze-reuse            — REUSE/ADAPT/NEW mapped
[ ] /build-client             — all code generated (reads SQL before writing PHP)
[ ] /review-all               — zero errors after build
[ ] /build-graph              — project-graph.json written
[ ] /validate-schema          — schema-report.md clean, all missing columns fixed
[ ] /local-test               — all checks pass locally
[ ] npm run build             — clean build (.htaccess auto-included from public/)
[ ] /hostinger-deploy         — follow all steps
[ ]   .env at public_html/.env — NOT above it
[ ]   JWT_SECRET is real hex (not placeholder, not $(php...) literal)
[ ]   Use unquoted heredoc << ENVEOF when creating .env
[ ]   auth_tables.sql imported FIRST
[ ]   database/ folder uploaded — includes migrate.php
[ ]   php migrate.php run after every SQL import
[ ]   api/.htaccess has RewriteBase /api/ + CGIPassAuth On
[ ]   index.php has config includes
[ ]   dist/ uploaded — .htaccess included automatically
[ ]   NEVER delete public_html/ — wipes .env
[ ]   .env verified after every upload
[ ] /verify-deployment        — all 12 checks pass
[ ] Bulk 500 check            — all endpoints 200 (base AND filtered queries)
[ ] Login works in browser
[ ] All module pages load + row clicks work (popup/panel/detail)
[ ] Create/edit/delete works on at least one entity
[ ] Cross-entity connections verified (e.g. transcript → follow-up auto-created)
[ ] Secondary portals working (agent/customer login + data filtered correctly)
[ ] AI chatbot works (groq_api_key in .env)
[ ] Client given login credentials
```
