# Kynetropo ERP — Standard Operating Procedure

How to build and evolve client projects.

---

## WORKFLOW 1 — Starting a brand-new client project

### Step 1 — Clone the template into a new folder

Open a terminal and run:

```bash
git clone https://github.com/processai2026-arch/kynetropo-agent-template <client-slug>-erp
cd <client-slug>-erp
npm install
```

Then open that folder in VS Code:

```bash
code .
```

Restart Claude Code inside that window (close and reopen, or reload the extension). Type `/` — all slash commands should appear. If they don't, the `.claude/commands/` folder is missing — run `git pull` to fix it.

---

### Step 2 — Drop the client brief into the project

Create a file at:

```
client-briefs/BRIEF-<CLIENTNAME>.md
```

This file must contain: client name, slug, list of modules/entities, key fields per entity, business rules, and any cross-entity connections (e.g. "a sale should reduce inventory").

If you only have messy notes or a voice transcript, run this first instead:

```
/seed-brief
```

Paste the raw notes. It writes a clean structured brief for you.

---

### Step 3 — Ask Claude to read the playbook and generate your execution prompt

This is the single most important step. Do NOT start writing prompts yourself. Instead, tell Claude:

```
Read PLAYBOOK.md and client-briefs/BRIEF-<CLIENTNAME>.md.
Generate the exact prompt I should run to build this ERP from scratch,
including which agents to use in what order. Make the prompt autonomous —
it should run without me needing to answer questions.
```

Claude will read the playbook, understand the mandatory agent order, and give you a ready-to-paste prompt. It will include `/new-client-setup`, `/research-domain`, `/analyze-reuse`, `/build-client`, the review chain, schema validation, and deployment steps — all pre-filled.

---

### Step 4 — Paste the generated prompt and leave it running

Copy the prompt Claude gave you and paste it into a new Claude Code message. Leave it running. Each agent runs in sequence. Do not interrupt unless an agent explicitly stops and asks for input.

The full build sequence (already encoded in the generated prompt) is:

1. `/new-client-setup` — sets brand, prunes unused pages, writes the structured brief
2. `/review-all` — catches broken imports from pruning
3. `/research-domain` — researches the client's industry, writes DOMAIN file
4. `/analyze-reuse` — classifies modules as REUSE / ADAPT / NEW
5. `/build-client` — generates all TSX + PHP + SQL files
6. `/review-all` — zero errors required after build
7. `/build-graph` — writes project-graph.json
8. `/validate-schema` — finds missing columns before they cause 500s
9. `/local-test` — full local check
10. `npm run build` — must be clean
11. `/hostinger-deploy` + `/verify-deployment`

---

## WORKFLOW 2 — Working on an existing project

Always work directly in the existing project folder. Do not clone the template into a separate folder for feature work.

The template is a starting point, not a reference library you query at runtime. Once a project is built, it already has all the components, hooks, and design system files it needs inside its own `src/`. Claude reads `CLAUDE.md` and `PLAYBOOK.md` inside the existing project — those files carry all the rules.

Open the existing project in Claude Code:

```bash
code <client-slug>-erp
```

Make sure you are in the client project folder, not the template folder.

---

### TYPE A — Running agents to fix, review, or deploy

Use this when you have a bug, a 500 error, a broken page, a TypeScript issue, or you are ready to deploy. You are not adding new code — you are fixing, checking, or shipping what is already there.

Tell Claude:

```
Read PLAYBOOK.md and project-graph.json.
[Describe the issue or what you want to verify — attach a screenshot if needed.]
Generate the exact prompt I should run to fix/build/deploy this,
including which agents to use in what order. Make it autonomous.
```

Claude reads the playbook, picks the right agents for the situation, and gives you a ready-to-run prompt.

**Common situations and what gets generated:**

| Situation | Agents Claude will include |
|---|---|
| Page shows 500 error | `/fix-500s` → `php -l` → `/verify-deployment` |
| TypeScript or UI broken | `/review-all` → `/review-ui-behavior` → `npm run build` |
| Ready to deploy | `/local-test` → `npm run build` → `/hostinger-deploy` → `/verify-deployment` |
| Payment not showing in Finance | `/review-cross-module` → fixes → `npm run build` |
| Something broke after a change | `/build-graph` → `/impact-check` → `/review-all` → `npm run build` |
| Full health check before handover | `/audit-project` |

Paste the generated prompt and leave it running.

---

### TYPE B — Adding or modifying a feature

Use this when you want to add new functionality, a new page type, a new entity, or change how something behaves.

#### How Claude knows what code to write

When you open a project in Claude Code, Claude reads the entire project before writing anything:

- `CLAUDE.md` — all design system rules, component names, patterns
- `PLAYBOOK.md` — agent order and mandatory steps
- `project-graph.json` — all entity relationships
- Every file in `src/` it needs to understand existing code

For anything already documented in `CLAUDE.md` (form dialogs, list pages, status badges, tables, etc.) — Claude already knows the pattern. You just describe what you want.

**You only need to point Claude at reference files when introducing a pattern that does not yet exist in the project.**

---

#### When and how to reference code files

**Situation 1 — The component exists in the template but was never copied to this project**

Example: you want `ExportDialog` on all list pages but this project was built before `ExportDialog` existed.

```
Read PLAYBOOK.md and project-graph.json.
Read kynetropo-erp-template/src/components/ExportDialog.tsx as reference.
Add export functionality to every list page in this project using that component.
After done: /review-all → /review-ui-behavior → npm run build → @track-changes.
```

---

**Situation 2 — A page pattern exists in another project (e.g. pipeline view, kanban board)**

Example: you want a pipeline view added to the Leads module, and it already exists in your CRM project.

```
Read PLAYBOOK.md and project-graph.json.
Read C:/Users/I768970/BI-ERP-KYNETROPO/eosudar-k2/src/pages/Pipeline.tsx as reference.
Add a pipeline view to the Leads module in this project using the same structure.
Adapt it to this project's Leads entity and API.
After done: /review-all → /review-ui-behavior → npm run build → @track-changes.
```

---

**Situation 3 — A pattern already exists in THIS project and you want it applied everywhere**

Example: you want all Create buttons to use full-page forms instead of dialogs, and one entity already has the full-page form pattern.

```
Read PLAYBOOK.md and project-graph.json.
Read src/pages/Customers.tsx and src/pages/CustomerForm.tsx as the reference pattern.
Convert every other entity's Create dialog to a full-page form using the same structure.
After done: /review-all → /review-ui-behavior → npm run build → @track-changes.
```

---

**Situation 4 — Adding a completely new feature (upload, PDF, portal, AI, notifications)**

No reference file needed — the feature type is already documented in PLAYBOOK.

```
Read PLAYBOOK.md and project-graph.json.
I need to add: [one clear sentence describing the feature].
Generate the exact prompt to build this, including all mandatory agents in the correct order.
Make it autonomous.
```

---

#### The full feature build sequence

Paste the prompt Claude gives you. It will follow this sequence:

1. `/build-graph` — resync the relationship map first
2. `/validate-schema` — verify current schema state
3. Read all related existing files before touching anything
4. Build the feature
5. After every controller method: `/ensure-coupling` — writes cascade code so related modules update automatically
6. After any new SQL migration: `/normalize-db` — removes calculated/duplicate columns before PHP is written
7. After feature complete: `php -l` on every PHP file touched
8. `/validate-schema` → `/impact-check` → `/review-all` → `/review-ui-behavior`
9. `/review-cross-module` — mandatory if the feature touches finance, payments, navigation, or list columns
10. `/review-edge-cases` — mandatory if the feature has status changes, approvals, or transactions
11. `/review-standards`
12. `/track-changes`
13. `/build-graph`
14. `npm run build` — must be clean

---

#### Quick reference — how Claude gets the code for each situation

| What you want to add | How Claude gets the pattern |
|---|---|
| Form dialog, list page, status badge, table | Already in `CLAUDE.md` — just describe it |
| Component from template not yet in the project | `Read kynetropo-erp-template/src/components/X.tsx` |
| Page pattern from another client project | `Read C:/path/to/other-project/src/pages/X.tsx` |
| Pattern that exists elsewhere in THIS project | `Read src/pages/X.tsx as reference, apply to all entities` |
| Upgrade all pages to latest standards at once | `/ui-sync` — copies and applies everything automatically |

---

## The golden rule for all workflows

**Never write a prompt without asking Claude to read PLAYBOOK.md first.**

The mandatory agent chain (build-graph → ensure-coupling → normalize-db → review-all → review-cross-module → review-edge-cases → track-changes → build) exists because skipping any one of them causes a category of bugs that only shows up in production. PLAYBOOK encodes the correct order. Claude reads it and generates a prompt that has everything in the right sequence. You just paste and run.
