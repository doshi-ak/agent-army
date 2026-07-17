# Agent Army — Field Guide

**Deploy a coordinated team of AI agents into any project — with a manager, a memory, and a
dashboard. No engineering degree required.**

This is the plain-language companion to the interactive guide in
[`docs/guide/GUIDE.html`](guide/GUIDE.html) (double-click that file to open it in a browser).
Same content, same order — this version is readable in any text editor or on GitHub. If you
read only one document about Agent Army, read this one, top to bottom.

> **A note on accuracy.** Every claim here is checked against what the product actually does
> today (repo `agent-army`, server `multi-agent-mcp`). Where the interactive guide's early
> draft named things that later changed — the repo name, the install commands, which parts
> are built — this version reflects the shipped reality. See `docs/VERIFICATION.md` for the
> receipts.

---

## Contents

1. [Overview — what this is](#1-overview--what-this-is)
2. [Quick Start — install and run](#2-quick-start--install-and-run)
3. [Architecture — the one picture](#3-architecture--the-one-picture)
4. [Roles — who you can staff](#4-roles--who-you-can-staff)
5. [Skills — the words you say](#5-skills--the-words-you-say)
6. [Runbook — when something's off](#6-runbook--when-somethings-off)
7. [Glossary — words, translated](#7-glossary--words-translated)
8. [Guardrails — the non-negotiables](#8-guardrails--the-non-negotiables)

---

## 1. Overview — what this is

**Agent Army turns any folder or repository into a coordinated team.** Instead of one AI
assistant doing everything in one long conversation, you get a small staff of specialists —
each with a defined job — plus three plain-text files that keep the team's memory, a manager
that keeps everything tidy, and a dashboard you can watch. You talk to one Claude session; it
staffs, dispatches, and tracks the rest of the team for you.

One idea holds the whole thing together:

> **The server is the filing system, not the brain.**

The Agent Army server manages the team's files and roster. It does **not** think, write code,
or make decisions — your Claude session does all of that. Keeping those two jobs separate is
what makes the system trustworthy and easy to debug: everything the team "knows" lives in
files you can open and read yourself.

And one promise is permanent: **nothing that spends money or sends something outward ever
happens without your explicit approval on that specific item.** More on that in
[Guardrails](#8-guardrails--the-non-negotiables).

### Where the build stands

The design is complete and ratified. Construction is essentially done — here is the honest
status, milestone by milestone (these are the real states, not aspirations):

| Milestone | What it is | Status |
|---|---|---|
| **M1 — Server core** | The engine: sets up a project's team, creates/retires agents, assigns roles | **Shipped** |
| **M2 — State engine + manager** | The memory: the three team files plus the manager's maintenance loop | **Shipped** |
| **M3 — Skills plugin** | The controls: the plain-English commands you say to run everything | **Shipped** |
| **M4 — Dashboard** | The window: a live page showing what every agent is doing | **Shipped** |
| **M5 — Guide + tests + 3-surface check** | The proof: this guide, a 10-question graded test, and verification across all three apps | **In progress** (you are reading part of it) |

### Three facts that matter for deployment

1. **Where it lives:** one GitHub repository (`agent-army`) holding the server, the plugin,
   and this guide — all in one place.
2. **How it deploys:** two one-time steps per machine — get the `agent-army` repo onto the
   machine (one clone, one `npm install` inside `server/`; the built server code ships in the
   repo), and install the plugin. After that, saying *"set up an agent team in this project"*
   in any folder is the whole per-project deployment. The plugin supplies the commands; the
   repo supplies the engine they drive.
3. **Where it works:** Claude Code in the **Desktop** app, the **Terminal** (CLI), and the
   **Web**. Desktop and Terminal share your Mac's files live; Web syncs through GitHub. No
   surface is missing features — they only differ in *when* they sync.

---

## 2. Quick Start — install and run

You install the plugin once, then use it in any project. The commands are the same on every
surface; only how you start Claude differs. Pick your surface.

**Once per machine, before anything else** — get the engine onto the machine:

```
git clone https://github.com/doshi-ak/agent-army ~/Developer/GitHub/agent-army
cd ~/Developer/GitHub/agent-army/server && npm install
```

(The built server code ships in the repo; `npm install` just fetches its one SDK dependency.
Skip this if the repo is already on the machine.)

### Desktop app (Claude Code on the Mac)

1. **Add the marketplace (once per machine)** — paste into the Claude Code input:
   ```
   /plugin marketplace add doshi-ak/agent-army
   ```
2. **Install the plugin:**
   ```
   /plugin install agent-army@agent-army-marketplace
   ```
   Then restart the session.
3. **Open the project folder you want a team in, then say:**
   ```
   Set up an agent team in this project
   ```
4. **Give it work:**
   ```
   Have the team research X and draft a one-pager
   ```
5. **Watch:** double-click `_team/dashboard.html` in the project folder.

### Terminal (CLI)

Same commands — you type them inside the session.

1. **In Terminal, go to your project and start Claude:**
   ```
   cd ~/path/to/your-project && claude
   ```
2. **Add the marketplace + install (once per machine):**
   ```
   /plugin marketplace add doshi-ak/agent-army
   /plugin install agent-army@agent-army-marketplace
   ```
   Restart the session after installing.
3. **Deploy the team:**
   ```
   Set up an agent team in this project
   ```
4. **Check on things anytime:**
   ```
   How's the team doing?
   ```

### Web (claude.ai/code, working on a GitHub repo)

The repo carries everything.

1. Make sure the project repo already has a team (set it up once from Desktop or Terminal,
   then push it to GitHub).
2. Open the repo in Claude Code Web — the team files arrive with the clone. One honest
   caveat: the server registration written by setup points at the path where the engine
   lives on *your Mac*, so inside the Web sandbox the session may need to install the
   server's dependency once (`npm install` inside `server/`, a few seconds) or re-point
   `.mcp.json` at the cloned copy. This is the documented Web git-sync boundary — the
   verification record (`docs/VERIFICATION.md`) tracks it.
3. **Work normally:**
   ```
   Have the team pick up the next task from STATE
   ```
4. **Before you leave, sync:**
   ```
   Commit and push the team state
   ```
5. **Honest limit:** Web sees the GitHub copy, not your Mac. Desktop and Terminal sync
   instantly; Web catches up (and shares back) whenever the repo syncs.

### The actually-quick version

> Install once → open any project → *"set up an agent team in this project"* → *"have the
> team do X"* → open the dashboard. That is the entire product.

---

## 3. Architecture — the one picture

Three parts, one job each:

```
   Your Claude session   →   Agent Army server   →   _team/ files + dashboard
   ───────────────────       ─────────────────       ────────────────────────
   Runs the agents,          Files everything:        The permanent record —
   makes every decision,     roster, roles, state.    readable by you, any
   dispatches all work.      Never runs AI, never     session, any surface.
                             spawns agents.
```

- **Your Claude session** is the brain. It runs the agents, makes every call, and dispatches
  all work.
- **The Agent Army server** is the filing cabinet. It records the team roster, the roles, and
  the current state. It never runs an AI model and never spawns an agent.
- **The `_team/` files and dashboard** are the permanent record — plain files you (or any
  session, on any surface) can open.

This boundary is a hard rule from the build spec: if any version of the server ever calls an
AI model or spawns an agent, it fails review automatically. That is deliberate — it keeps the
whole system debuggable, because everything the team "knows" sits in files you can open.

### Five things appear in your project

When you set up a team, these show up in the project folder:

| File / folder | In plain English |
|---|---|
| `_team/STATE.md` | **The whiteboard** — who's on the team, who's doing what right now, what's blocked. |
| `_team/PROGRESS.md` | **The logbook** — a permanent, timestamped record of everything that happened. It is only ever added to, never edited. |
| `_team/ROLES.md` | **The org chart** — each role, where it came from, and how it's been refined. |
| `_team/dashboard.html` | **The window** — double-click to watch the team work; it refreshes itself. |
| `.claude/agents/` | **The staff** — one file per agent; your Claude session reads these automatically. |

Two more files get wired up quietly: `.mcp.json` (which connects the server to the project)
and a short routing block appended to the project's `CLAUDE.md` (which tells every session
the team's ground rules).

### How three apps stay one team

The whole system is just files in your project, and the server ships inside the repo — so any
surface that opens the project gets the identical team. Desktop and Terminal share your Mac's
disk in real time. Web works on the GitHub copy: it is fully capable, and it catches up (and
shares back) whenever the repo syncs. No surface has a weaker feature set — only a different
sync moment.

---

## 4. Roles — who you can staff

Agent Army ships a curated catalog of **10 specialist roles**. A team hires the specialist a
task needs — never all of them at once. Nine of the ten are proven templates adapted from a
large open community library (VoltAgent + wshobson, MIT-licensed, credited in
`THIRD_PARTY_NOTICES.md`); one — `agent-manager` — was written fresh for this product.

| Role | What it does (plain English) | Runs on | Source |
|---|---|---|---|
| `agent-manager` | The team's chief of staff: keeps the whiteboard, logbook, and org chart current; proposes new tests and role tune-ups. | sonnet | **New for this build** |
| `debugger` | Hunts down *why* something is broken and pinpoints the fix. | sonnet | Community library |
| `systems-architect` | Designs how the pieces fit together before anyone builds. | opus | Community library |
| `regression-test-engineer` | Makes sure new changes never silently break old features. | sonnet | Community library |
| `ci-cd-engineer` | Automates the build → test → release pipeline. | haiku | Community library |
| `forward-deployed-engineer` | Drops into a new environment and gets things working end-to-end. | sonnet | Community library |
| `code-reviewer` | Reads every change for bugs, clarity, and safety. | opus | Community library |
| `security-auditor` | Checks for leaked secrets, unsafe commands, and risky patterns. | opus | Community library |
| `docs-writer` | Keeps documentation accurate and readable as the work evolves. | haiku | Community library |
| `performance-engineer` | Finds and fixes what's slow. | inherits your session's model | Community library |

You never have to memorize this table — ask *"what kinds of agents can I staff?"* and the team
lists the catalog for you. If your project needs a specialist the catalog doesn't cover, the
`team:skill-forge` command (below) helps you build a new one from your own project's material.

---

## 5. Skills — the words you say

Eight commands cover everything. You don't memorize syntax — say the plain-English version and
the right skill fires.

| Command | What you say | What it does |
|---|---|---|
| `team:init` | *"Set up an agent team in this project"* | Deploys the whole setup into the current folder: agents, the three team files, the server wiring, and the dashboard. In a brand-new project it also offers to build custom skills for that environment. **Safe to re-run — it never overwrites your work.** |
| `team:new-task` | *"Have the team handle X"* | Takes a task, picks the right agents, hands each one full context, and logs the work in the team files. **This is the everyday command.** |
| `team:new-agent` | *"Add a debugger to the team"* | Creates a new agent from a role template, customized with your project's context. |
| `team:retire-agent` | *"Retire the docs agent"* | Removes an agent — archived, never hard-deleted, so it can come back. |
| `team:assign-role` | *"Make that agent a security auditor"* | Re-roles an existing agent from the specialties catalog. |
| `team:skill-forge` | *"Build this project its own skills"* | Walks through creating custom Agent Skills for your specific project, following the agentskills.io standard. **Fires automatically in brand-new environments.** |
| `team:status` | *"How's the team doing?"* | Reads the team files and gives you the picture — and refreshes the dashboard. |
| `team:manager` | *"Run team maintenance"* | The agent-manager reviews everything: stale work, missing tests, role tune-ups, throughput ideas. **You approve; it applies.** |

---

## 6. Runbook — when something's off

**The team's tools don't show up.**
The server likely isn't built yet in this copy of the project. In the project folder, run the
two setup commands (`npm install`, then `npm run build` inside `server/`), then restart the
Claude session.

**`/plugin install` can't find the plugin.**
Add the marketplace first: `/plugin marketplace add doshi-ak/agent-army`. Then install with
`/plugin install agent-army@agent-army-marketplace`. Restart the session after installing.

**On the web version, the team looks out of date.**
That's expected — the web version syncs when the project syncs to GitHub. Ask any session to
*"commit and push the team state,"* then reload.

**An agent seems stuck.**
Say *"run team maintenance."* The manager flags stale work and recommends what to do. Nothing
is auto-killed without you.

**Can agents spend money or send emails?**
No. By design, every trade, purchase, send, or publish stops and waits for your explicit
approval. This is permanent and cannot be switched off.

---

## 7. Glossary — words, translated

- **MCP server** — a small helper program Claude can call for specific jobs. This one is the
  team's filing system; it never thinks or writes code itself.
- **Plugin** — an installable add-on for Claude Code. Ours adds the `team:*` commands.
- **Skill** — a recipe Claude follows when you say a certain phrase. `team:init` is a skill.
- **Agent** — a specialist copy of Claude with one job and only the tools that job needs.
- **Harness** — everything above, wired together in one project and ready to work.
- **State files** — the three plain-text files in `_team/` that hold the team's memory.

---

## 8. Guardrails — the non-negotiables

These are permanent and not configurable off:

- **No agent ever trades, moves money, or changes orders.** Proposals come to you; you decide.
- **Nothing is sent, posted, submitted, or deleted without your explicit OK** on that specific
  item.
- **No secrets in any team file, ever** — keys live in your keychain, not in the repo. The
  team files hold paths and status only.
- **Every agent sees only the tools its job needs** — nothing more.

If any request would cross one of these lines, the team stops and parks it for your approval
rather than acting. That is the point of the system, not a limitation of it.

---

*Built against `PLAN.md` · role templates courtesy of the VoltAgent & wshobson agent libraries
(MIT), credited in `THIRD_PARTY_NOTICES.md` · skill standard: agentskills.io · interactive twin:
`docs/guide/GUIDE.html` · verification record: `docs/VERIFICATION.md`.*
