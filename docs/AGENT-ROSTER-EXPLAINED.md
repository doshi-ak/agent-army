# The 232 Agents, Explained

*Plain English, for Akash. No engineering background assumed. Every fact below comes
from `PLAN.md`, `~/Developer/GitHub/agent-superteam`'s own README/manifest/attribution
files, and `evals/EVALS-DRAFT.md`'s status notes — nothing is invented.*

---

## The one-sentence answer

**The 232 agents are 232 written job descriptions sitting in a folder. None of them are
running. None of them are installed anywhere. None of them override anything you've
named.** They're a parts shelf. What actually runs in your projects is a much smaller,
curated set that this product builds on top of that shelf — and your own named roles
(meta agent, regression tester, executor, iterator) map cleanly onto that curated set,
not the other way around.

The rest of this document explains that in three layers, then walks through what it
looks like to actually use this day to day, then tells you exactly what's built today
versus what's still coming.

---

## Layer 1: the LIBRARY — a parts shelf, not a team

Location: `~/Developer/GitHub/agent-superteam` on your machine.

This is a folder of 232 files. Each file is a job description for one kind of specialist
— a short document telling an AI "you are a Python expert" or "you are a security
auditor," written by other people and collected here. Per that folder's own README:

- It's a merge of two open-source collections — VoltAgent/awesome-claude-code-subagents
  (154 agents) and wshobson/agents (134 agents) — both MIT-licensed, meaning free to
  reuse with credit.
- 288 files went in, 56 were removed as duplicates, leaving **232 unique agent
  descriptions**, organized into 9 subject-matter folders plus one "super agents"
  folder for orchestration-style roles.
- Per its own attribution file: *"Each agent file here is copied verbatim from one of
  the two repos above."* This repo adds no new writing of its own — it adds
  organization and dedup, nothing more.

None of these 232 files do anything by themselves. They're text. A file only becomes a
working agent once something copies it into a specific project and a Claude session
actually dispatches it — and per this product's own hard design rule, the tool server
itself is never allowed to do that dispatching (more on that in Layer 3).

### The 10 categories (with counts and a few examples each)

| Category | Count | A few examples |
|---|---|---|
| ★ Super Agents — Orchestration & Meta | 27 | `agent-organizer`, `multi-agent-coordinator`, `orchestrate`, `team-lead` |
| 01 · Core Development & Architecture | 16 | `backend-architect`, `api-designer`, `database-architect`, `frontend-developer` |
| 02 · Language Specialists | 41 | `python-pro`, `typescript-pro`, `rust-engineer`, `golang-pro` |
| 03 · Infrastructure, Cloud & DevOps | 19 | `cloud-architect`, `kubernetes-architect`, `terraform-specialist`, `sre-engineer` |
| 04 · Quality, Security & Testing | 25 | `debugger`, `security-auditor`, `code-reviewer`, `penetration-tester` |
| 05 · Data & AI | 15 | `data-scientist`, `ml-engineer`, `llm-architect`, `prompt-engineer` |
| 06 · Developer Experience, Docs & Tooling | 28 | `docs-architect`, `cli-developer`, `mermaid-expert`, `readme-generator` |
| 07 · Specialized & Hardware Domains | 19 | `quant-analyst`, `risk-manager`, `blockchain-developer`, `seo-specialist` |
| 08 · Business, Product & Marketing | 30 | `product-manager`, `content-marketer`, `customer-success-manager`, `technical-writer` |
| 09 · Research & Analysis | 12 | `market-researcher`, `competitive-analyst`, `research-analyst`, `trend-analyst` |
| **Total** | **232** | |

You will almost certainly never touch most of this shelf directly. It exists so that
when a project needs something genuinely specific — say, a Rust expert, or a
penetration tester — there's a vetted, pre-written description to draw from instead of
writing one from scratch every time.

---

## Layer 2: the CATALOG — the standard hires

This is where your named roles live. `PLAN.md` §6 defines a **curated set of 10 roles**
that this product ships by default, built by taking the richer of any duplicate
definitions from the 232-file library and adding a standard 5-line header to each one
(what the role owns, the rule that it must verify its own work before calling something
done, and a no-secrets rule). One of the 10 is **net-new** — written specifically for
this product, not pulled from the library at all.

| Catalog role | Where it came from | What it does |
|---|---|---|
| `agent-manager` | **Net-new**, written for this product | The maintenance role. Runs the iteration check (`manager_tick`), applies accepted fixes to the team's status files, and regenerates the dashboard. Never edits another agent's actual work — maintenance only. |
| `debugger` | Library (Layer 1) | Root-causes bugs. |
| `systems-architect` | Library | Designs system structure before building. |
| `regression-test-engineer` | Library | Verifies changes don't break existing behavior. |
| `ci-cd-engineer` | Library | Builds/maintains automated build-and-deploy pipelines. |
| `forward-deployed-engineer` | Library | Hands-on implementation work in a specific environment. |
| `code-reviewer` | Library | Reviews code for correctness and quality. |
| `security-auditor` | Library | Checks for security issues. |
| `docs-writer` | Library | Writes documentation. |
| `performance-engineer` | Library | Optimizes speed/efficiency. |

### Does the 232-file library override your named roles? No.

Here's the direct mapping, per what's actually specified in `PLAN.md`:

| Your name | Maps to (catalog role) | Note |
|---|---|---|
| **Meta agent** | `agent-manager` | This is the literal DoD item #3 in the plan: "Iteration logic: agent-manager maintaining STATE.md / PROGRESS.md / ROLES.md." |
| **Iterator** | `agent-manager` | Same role, same mechanism — `manager_tick` is the iteration engine: it checks for stale work, gaps, and role-utilization issues and returns a recommendations report. |
| **Regression tester** | `regression-test-engineer` | Direct name match in the catalog. |
| **Executor** | Closest catalog analog: `forward-deployed-engineer` (the hands-on-implementation role) | **Flagging this one honestly:** "Executor" is also the literal name of a seat in a *different* org chart — the three-person team (Architect / Orchestrator / Executor) building *this product itself*, defined in PLAN §9 point 6, where Executor is the Sonnet-tier seat that does the building against specs the Architect writes. That's the team building Multi-Agent MCP, not a role inside the product once it's shipped to you. If "Executor" is meant as a role your *own* project teams should have, `forward-deployed-engineer` is the nearest match in the shipped catalog; if it's meant as this build project's own internal seat, it already exists and isn't part of what you'd deploy. Worth a quick confirm with the Architect on which one you meant. |

So: the 232-file library is a source, not an authority. It never runs and never
overrides anything on its own. The 10-role catalog — including your named roles — is
what actually gets offered to a project team, and the catalog is a deliberate,
human-curated selection, not "whatever's biggest in the pile."

---

## Layer 3: the TEAM — the agents actually working on your project

This is the only layer where anything is "real" in the sense of doing work.

- `team_init` scaffolds the harness into a project: an agent folder, three tracking
  files (explained below), a connection file, and a dashboard seed.
- `agent_create` is what actually stands up one agent for one project: it writes a
  definition file built from a role template — catalog first — plus the specific task
  context for that project.
- Per `PLAN.md`'s explicit, non-negotiable design rule: **the tool server itself never
  runs an AI model and never spawns an agent.** It only writes files and tracks status.
  The actual dispatching — the "go do this" moment — happens on the session side, in
  whatever Claude interface you're using (Desktop, CLI, or Code), reading the
  recommendations the server produces. This split exists specifically so a small,
  auditable server can't secretly go do things — it can only prepare and record.
- Curation for a team pulls from the **catalog first** (the 10 roles above). Only when
  a task genuinely needs something the catalog doesn't cover does curation reach into
  the 232-file library for that one specific role — never installing the whole shelf at
  once. `PLAN.md` states this as an explicit non-goal: *"no bulk-install of the
  232-role library."*

---

## Deploy in minutes — the walkthrough once v1 ships

This is the literal sequence, per `PLAN.md`'s design (not yet fully built — see status
below):

1. **Install the plugin once.** It's skills-only — plain-language commands, no bundled
   server program inside it (bundling one would break how plugins get validated). The
   plugin wires up the actual server through a small connection file the first time you
   use it.
2. **Open any project** — new or existing — in Desktop, CLI, or Code.
3. **Say one sentence.** Something like "set up a team for this project" or "build me
   X." You describe the outcome in plain language; you never write code or configure
   anything.
4. **The team staffs itself.** Behind that one sentence: the harness gets scaffolded
   (agent folder, tracking files, dashboard, and — if this is a brand-new project with
   no existing files — a nudge to build a project-specific skill from *your* project's
   own material, not generic knowledge). Then agents get created, pulling roles from
   the 10-role catalog first. The plan also requires this to happen with **zero
   permission prompts on the happy path** — the setup step writes a scoped, limited
   allowlist so routine file writes inside the team's own folder don't stop and ask you
   every time. Anything involving git pushes, network access, deleting things, money,
   or sending/posting anything stays gated — those are never auto-approved.
5. **Three files plus a dashboard show the work happening in real time:**
   - `STATE.md` — who's on the team, what's actively being worked on, what's blocked,
     and the last maintenance check's top recommendation.
   - `PROGRESS.md` — an append-only running log; every event gets added, nothing gets
     edited or erased, so you always have a full audit trail.
   - `ROLES.md` — which agent has which role, where that role's template came from,
     and a dated history of any refinements to it.
   - `dashboard.html` — a single self-contained web page (opens in any browser, no
     internet connection needed) that refreshes automatically every time any of the
     above changes.
6. **A morning approvals queue.** Anything drafted that would need to leave the
   building — a trade, a post, a comment, a payment, an email — parks in `STATE.md`'s
   Blockers section as "awaiting your approval," not as a silent pass-through. That's
   the queue you'd check each morning: a short list of decisions, not a pile of status
   updates.

---

## What exists today vs. what's still coming

Being exact about this, per `PLAN.md`'s own milestone tracking and `evals/EVALS-DRAFT.md`'s
status note (both current as of this writing):

| Milestone | Covers | Status today |
|---|---|---|
| **M1 — Server core** | The basic tools: scaffold a project (`team_init`), create/delete/list agents, assign roles, browse the role catalog | **Done and verified.** Landed on the main branch, 38 of 38 smoke tests passed, and an independent verification pass was dispatched separately from the person who built it. |
| **M2 — State engine + maintenance loop** | The three tracking files' read/write logic, schema validation, and the `manager_tick` maintenance check | **In build.** A stub exists but the validators, fixtures, and the maintenance-check logic aren't finished yet. |
| **M3 — Plugin** | The actual installable plugin: the one-sentence skills (`team:init`, `team:new-task`, `team:new-agent`, etc.), bundled role templates | **Not started.** Placeholder folders only, no content yet. |
| **M4 — Dashboard** | The auto-refreshing `dashboard.html` | **Not started** as of this writing. |
| **M5 — Docs + evals + cross-platform testing** | The non-technical guide, the test suite, confirming everything works the same on Desktop/CLI/Code | **Partial.** An early (v0.9) interactive version of the guide exists separately from this document. A draft test suite exists (the one this document's facts are partly checked against) but it's explicitly marked as unexecuted — none of its pass/fail results have been filled in yet, because there's no finished plugin or dashboard to test against.

**Bottom line:** the tools that let you create, delete, and re-role agents and browse
the catalog work today and have been checked. The pieces that make it feel like "say one
sentence and a team appears with zero setup" — the plugin, the live dashboard, the
finished guide, and a fully tested maintenance loop — are still being built. This
document describes the destination faithfully; it isn't a claim that the destination is
reached yet.

---

*Sources: `PLAN.md` (§0.1, §2, §3, §4, §6, §7, §9.5, §10.5); `~/Developer/GitHub/agent-superteam/README.md`,
`ATTRIBUTION.md`, and a direct file count of `agents/*/`; `evals/EVALS-DRAFT.md` (status
note and §C verification matrix). Where PLAN.md doesn't fully settle a detail — the
"Executor" naming question above — that's called out explicitly rather than guessed.*
