# Kynetropo ERP — Agent Reference

What each agent does and when to run it.

---

## Generation Agents

### `/new-client-setup`
Sets up a brand-new project. Updates `src/brand.ts` with the client name and logo, prunes all pages and routes that are not needed for this client, cleans `api/index.php`, and writes the structured `BRIEF-*.md` file.

**When to run:** First thing, once, on a fresh clone. Never run again on an existing project — it will prune things that are already built.

---

### `/seed-brief`
Converts messy raw notes, voice transcripts, or bullet points into a clean structured brief file in `client-briefs/BRIEF-*.md`.

**When to run:** Before `/new-client-setup`, if the client's requirements came in as unstructured text rather than a properly formatted brief. Skip if you already have a clean brief.

---

### `/research-domain`
Searches the web for everything about the client's industry and country. Writes `DOMAIN-*.md` with business processes, financial formulas, tax rules, legal requirements, standard terminology, and edge cases specific to that domain.

**When to run:** After `/new-client-setup`, before `/build-client`. The domain file makes every subsequent agent smarter — it means Claude implements tax calculations, status flows, and business rules correctly without being told explicitly. Never skip this on a first build.

---

### `/analyze-reuse`
Reads the brief and compares it to the template. Classifies every module as REUSE (use as-is), ADAPT (use with changes), or NEW (build from scratch). Writes `REUSE-*.md`.

**When to run:** After `/research-domain`, before `/build-client`. Saves build time by identifying what doesn't need to be generated.

---

### `/build-client`
The main build agent. Reads the brief, reads the SQL schema files for exact column names, then generates all TypeScript types, API files, React pages, PHP controllers, SQL migrations, and HTTP test files for every entity in the brief.

**When to run:** Once per project, after `/analyze-reuse`. For adding individual entities to an existing project, use `/scaffold-entity` instead.

---

### `/scaffold-entity`
Generates everything for a single entity: types, API file, list page, form dialog, detail page (if needed), PHP controller, SQL migration, and HTTP tests. Also patches `App.tsx`, `navigation.ts`, and `api/index.php`.

**When to run:** When you need to add one new entity to an already-built project. Faster and more surgical than re-running `/build-client`.

---

### `/generate-module`
Frontend only — generates TypeScript types, API file, and React pages for one entity. Does not touch PHP or SQL.

**When to run:** When the backend already exists (controller + table) and you only need to build the UI for it.

---

### `/backend-scaffold`
Backend only — generates the PHP controller and SQL migration for one entity. Does not touch the frontend.

**When to run:** When the frontend already exists and you only need the backend, or when building an API-only endpoint.

---

### `/add-feature`
Adds a new capability to an existing project. Handles file upload, PDF export, email sending, CSV import, status timelines, AI features, detail popups, side panels, full detail pages, and secondary portals. Automatically runs `/impact-check`, `/validate-schema`, `/review-all`, `/build-graph`, and `npm run build` after the feature is complete.

**When to run:** Any time a client asks for a new capability that is not a whole new entity. Examples: "add a PDF export to invoices", "add WhatsApp notifications", "add a customer portal".

---

### `/add-page-type`
Adds a missing page type to an entity that already exists. For example, if an entity only has a list page and you need to add a detail page or a form page.

**When to run:** When `/scaffold-entity` was run previously but one of the page types was skipped, or when the requirement for a detail view comes in after the initial build.

---

### `/restore-module`
Restores a module that was pruned during `/new-client-setup`. Brings back the pages, uncomments the routes in `api/index.php`, adapts the terminology to the client's domain, and lists the SQL files that need to be imported.

**When to run:** When a client asks for a module that was removed during setup. For example: "we now need the HR module". Always run `/build-graph` before and after.

---

## Review and Quality Agents

### `/review-all`
Checks every generated file for design system violations, TypeScript errors, missing imports, wrong route nesting, broken component usage, and UI pattern issues. Fixes everything it finds.

**When to run:** After every code-generating agent. Mandatory after `/new-client-setup`, after `/build-client`, after any `/scaffold-entity` or `/add-feature` run. Also run it whenever you see a TypeScript error you cannot explain.

---

### `/review-ui-behavior`
Checks every dialog, form, and popup for interaction bugs: missing saving guards (dialog closes while saving), Select-inside-Dialog conflicts, double-submit bugs, missing toast messages, and missing `onInteractOutside` protection.

**When to run:** After any change that touches a dialog, form, popup, or navigation flow. Mandatory in the feature build chain.

---

### `/review-cross-module`
Checks that data created in one module appears correctly in every other module that should show it. Verifies: payments showing in Finance, expenses appearing in P&L, GST reflecting in the GST module, back buttons going to the correct page, table columns pulling from the correct JOIN.

**When to run:** Mandatory any time you touch financial data, payments, expenses, navigation, list columns, or any Finance sub-module. Also mandatory when a feature creates data in one module that should appear in another.

---

### `/review-edge-cases`
Finds every missing path in every flow: what happens if you cancel midway, what happens if the same action is triggered twice, what happens when a value is null or zero, what happens when you reverse a status (e.g. un-approve, refund, cancel a dispatched order). Writes `EDGE-CASE-REPORT.md` and applies all Critical fixes.

**When to run:** Mandatory whenever a feature involves status changes, approvals, claims, cancellations, or financial transactions.

---

### `/review-standards`
Checks the entire codebase against SOLID principles, ERP best practices, AI integration patterns, HCI (human-computer interaction) principles, DRY, and security rules. Writes `CODE-STANDARDS-REPORT.md` and applies Critical fixes.

**When to run:** After a major feature build or before a client handover. Also useful when code quality has drifted across many sessions.

---

### `/audit-project`
Full health check of the entire project: code quality, all API endpoints tested, cross-entity connections verified, deployment configuration checked. Writes `audit-report.md`.

**When to run:** Before a major client demo or handover. Also useful when a project has been in production for a while and you want a comprehensive status check.

---

### `/audit-comprehensive`
Deeper version of `/audit-project`. More thorough across all dimensions.

**When to run:** When `/audit-project` surfaces issues that need deeper investigation, or when a client project is being handed to a new developer.

---

## Database and Schema Agents

### `/validate-schema`
Reads every PHP controller and compares every column name it queries against the actual SQL migration files. Writes `schema-report.md` listing every missing table, missing column, and ambiguous column reference.

**When to run:** After `/build-client` or `/scaffold-entity`. After any PHP change that touches the database. Any time you see "Unknown column" or "Table doesn't exist" errors. Run it before deploying — it catches all schema problems before they become 500s on the server.

---

### `/normalize-db`
Scans new SQL migration files for calculated columns (values that can be derived from other columns), duplicate columns (same data stored in two places), and stored aggregates (totals that should be computed, not stored). Writes `DB-NORMALIZATION-REPORT.md` and creates fix migrations.

**When to run:** Mandatory immediately after creating any new SQL migration file, before the PHP controllers are written against those tables. Fixing the schema before writing PHP is far cheaper than fixing it after.

---

### `/ensure-coupling`
Runs after writing any controller method, migration, or form that creates, updates, or deletes data. Writes the cascade code that makes one action trigger all the consequences it should — for example, creating a payment also updates the project balance, creates a finance entry, logs an activity, and refreshes the dashboard total. Writes and maintains `MODULE-COUPLING-MAP.md`.

**When to run:** During development, after every single controller method or form submit handler is written. Not just once at the end — it runs continuously alongside the build. This is how cross-module data consistency is maintained.

---

## Impact and Sync Agents

### `/impact-check`
Reads `project-graph.json` and finds every file that is affected by a described change. Then fixes all affected files. Without this, a change in one place silently breaks three other places.

**When to run:** After any field rename, status change, or controller bug fix. Before and after any change that touches a shared entity. Requires `project-graph.json` to exist — run `/build-graph` first if it is missing or stale.

---

### `/ui-sync`
Upgrades an existing project's entire frontend to the current Kynetropo UI standards in one pass. Replaces `window.confirm()` with `ConfirmDeleteDialog`, wraps all tables in `ScrollableX`, replaces inline loading spinners with `TableSkeleton`, replaces hardcoded status colors with `StatusBadge`, replaces `Select` on reference fields with `RecordCombobox`, adds `ExportDialog` to every list page, cleans hardcoded color classes to design token equivalents.

**When to run:** When a project was built before the current standards were established and needs to be brought up to date. Touches only frontend files — no PHP, no SQL.

---

### `/track-changes`
Verifies that all previously recorded intentional changes are still in place (drift check), then records the new change in `changes-registry.json`.

**When to run:** After every change session, as the final step before pushing. Also run it before starting a big refactor with `@track-changes drift-check` to confirm nothing has been accidentally reverted. Tag `@track-changes` in any prompt to record changes mid-session.

---

## Graph Agent

### `/build-graph`
Reads the entire project and maps all entity relationships into `project-graph.json`. This file is required by `/impact-check`, `/add-feature`, and `/restore-module`.

**When to run:** After `/build-client`. After any `/scaffold-entity`. After `/add-feature` (it runs automatically). After any manual file change. Any time `/impact-check` says the graph is missing or stale. Always run it before and after `/restore-module`.

---

## Testing Agents

### `/create-http-tests`
Writes a `.http` test file for one entity covering 22 scenarios: list, filter, create, update, delete, validation errors, auth failures, and edge cases.

**When to run:** After `/scaffold-entity` or `/backend-scaffold`, once the controller exists. Run before deploying to get a fast way to verify every endpoint is working.

---

### `/create-ui-tests`
Generates Playwright test files for the entire project covering page loads, button clicks, dialog open/close, and form validation.

**When to run:** When the project is ready for a thorough automated UI check, usually before a client handover or after a major feature addition.

---

### `/local-test`
Verifies the full project works locally: dev server starts, all routes load, login works, API endpoints respond, build is clean.

**When to run:** Before every deploy. Do not deploy until this passes.

---

## Deployment Agents

### `/hostinger-deploy`
Provides the step-by-step deployment guide for Hostinger: SFTP upload paths, SQL import order, `.env` creation via SSH heredoc, JWT generation, `php migrate.php` command, and post-upload verification steps.

**When to run:** When deploying to Hostinger for the first time, or after a major feature build that has new SQL tables.

---

### `/verify-deployment`
Runs 12 checks against the live Hostinger server: `.env` exists, JWT is real hex, auth endpoints return 200, all module endpoints return 200 (base and filtered queries), PHP syntax is clean, `.htaccess` is correct.

**When to run:** After every deploy. For every 500 it finds, run `tail -5 ~/domains/<slug>/public_html/api/error_log` to get the error, then `/fix-500s` to fix all failing endpoints in one pass.

---

## Fix Agents

### `/fix-500s`
Takes the error log output and failing endpoint list, finds the root cause in the PHP controllers, and fixes all of them in one pass. Lists exact SFTP upload paths after fixing.

**When to run:** When `/verify-deployment` reports multiple 500 errors, or when the server error log shows a batch of controller failures.

---

## Research Agents

### `/research-domain`
*(See Generation Agents above — run before every first build.)*

---

### `/market-research`
Researches the competitive landscape, feature expectations, and industry benchmarks for the client's market.

**When to run:** When a client brief is vague about what the ERP needs to do, or when you want to validate that the proposed feature set is complete relative to what competitors offer.

---

### `/compare-features`
Compares two or more feature sets, modules, or implementations and produces a structured comparison.

**When to run:** When deciding between two approaches to implement a feature, or when a client asks "how does our system compare to X".

---

### `/build-journal`
Builds a running development journal for the project documenting what was built, when, and why.

**When to run:** At key milestones (after initial build, after major feature additions) to maintain a human-readable history of the project.

---

## Quick Decision Guide

| Situation | Agent |
|---|---|
| Starting a new client project | `/new-client-setup` |
| Client gave messy notes, no structured brief | `/seed-brief` |
| Before building — need industry knowledge | `/research-domain` |
| Full ERP build from brief | `/build-client` |
| Add one new entity to existing project | `/scaffold-entity` |
| Add a new capability (PDF, upload, portal, AI) | `/add-feature` |
| Restore a module that was pruned | `/restore-module` |
| Upgrade old project UI to current standards | `/ui-sync` |
| TypeScript errors or import issues | `/review-all` |
| Dialog or form behaves incorrectly | `/review-ui-behavior` |
| Payment / expense not showing in Finance | `/review-cross-module` |
| Missing cancel / undo paths in a flow | `/review-edge-cases` |
| Field renamed — need to find all affected files | `/impact-check` |
| New SQL table created | `/normalize-db` immediately, then `/validate-schema` |
| New controller method written | `/ensure-coupling` immediately after |
| "Unknown column" or "Table doesn't exist" error | `/validate-schema` |
| Multiple 500 errors on server | `/fix-500s` |
| About to start a big refactor | `@track-changes drift-check` first |
| After every change session | `/track-changes` |
| Before deploying | `/local-test` → `npm run build` |
| After every deploy | `/verify-deployment` |
| Full project health check | `/audit-project` |
| Graph stale or missing | `/build-graph` |
| Something broke (code) | `/review-all` |
| Something broke (server) | `/fix-500s` |
