# PLAN.md — Multi-Agent MCP (v1)

> **Authority:** This file is the source of truth for the build (per
> `cowork-mcp-builder-agent-team copy.md` §3/§6 — the governing process spec).
> Reality diverging from this plan gets reported to the Architect (Desktop, via
> `_coordination/STATE_Desktop.md` or a BOARD message) — never silently patched.
> Author: Desktop (ARCHITECT). Date: 2026-07-11. Status: **READY FOR EXECUTION.**

## 0. Goal

Build **Multi-Agent MCP**: an installable system (MCP server + skills plugin) that turns
any Claude Code project into a coordinated team of autonomous agents with persistent
file-based state, an agent-manager maintenance loop, a monitoring dashboard, and a
non-technical onboarding guide. Sources: Akash's /goal (2026-07-11), the original
agent-team spec (this folder), and the merged community agent library.

## 0.1 Optimized goal statement (Architect's normalization of Akash's /goal — v1.2)

**Problem:** Akash needs agent teamwork that survives sessions, surfaces, and his own
absence — today it lives in ad-hoc session coordination that only works while he relays.
**Product:** Multi-Agent MCP — install once, then any project can staff, run, track, and
tune its own agent team through plain-language commands, with a paper trail a
non-engineer can read.
**Testable DoD (normalized):** D1 surface-as-team (plugin install → `team:init` →
dispatched agents visible in state files); D2 lifecycle skills (create/delete/assign/
context/skill-creation each invocable and observable); D3 manager loop (`manager_tick`
findings → STATE/PROGRESS/ROLES updated, new eval cases generated); D4 guide (non-tech
read-through passes — Akash is the test); D5 net-new nudge (fresh env → skill-forge
offer fires, conformant to agentskills.io authoring workflow); D6 harness deploy
(`team_init` idempotent, complete, correct in a scratch project); D7 dashboard
(auto-regenerates on every state mutation); D8 tri-surface (all flows pass on Desktop +
CLI; Web passes with documented git-sync boundary).
**Non-goals (explicit):** no autonomous money/outbound (hard gate, permanent); no
model execution or agent spawning inside the server (§3.8); no bulk-install of the
232-role library; no hooks shipped in the plugin (skills-only — see §11).
**Inputs:** the original agent-team spec (this folder), agent-superteam (VoltAgent +
wshobson, merged), obra/superpowers (patterns), agentskills.io (format contract).

## 1. Section-1 gate verdict (stated out loud, per the spec)

**Team build is WARRANTED.** ~13 tools across cleanly separable groups (`team_*`,
`agent_*`/`role_*`, `state_*`/manager, dashboard, plugin/skills, docs) = independent
ownership blocks; a standing 3-seat team already exists. Blocks map to milestones
M1–M5 below. The Executor may parallelize across blocks with its own `builder`
subagents — one block per subagent, never two writers in one block.

## 2. Definition-of-done mapping (Akash's 8 items → components)

| # | DoD item | Component | Milestone |
|---|---|---|---|
| 1 | Surface as a team of autonomous agents on separate tasks | MCP server + plugin skills + routing block | M1–M3 |
| 2 | Plugin wrapping basic-function skills (create/delete agents, assign roles, context, skill creation) | Plugin (skills-only) | M3 |
| 3 | Iteration logic: agent-manager maintaining STATE.md / PROGRESS.md / ROLES.md | State engine + `manager_tick` + agent-manager agent | M2 |
| 4 | Non-technical comprehensive guide | GUIDE.md + GUIDE.html (double-clickable twin) | M5 |
| 5 | Implicit nudge to build specialized Agent Skills in net-new environments | `team_init` detection + skill-forge flow | M1+M3 |
| 6 | Deploys harnesses correctly | `team_init` scaffolder | M1 |
| 7 | Automatic dashboard monitoring | `dashboard_refresh` + auto-regen on every state write | M4 |
| 8 | Seamless across Code Web / Desktop / CLI | Repo-shipped stdio server + project `.mcp.json`; state travels via git | M1 + verification matrix (M5) |

## 3. Architecture decisions (Rule-1 gate first)

1. **Transport: LOCAL stdio.** Access path is local files (agent defs, state files,
   project folders) — a third party cannot query it server-side. Per warehouse
   `CLAUDE.md` Rule 1 → local MCP over stdio. No remote variant in v1.
2. **Cross-surface model (DoD 8, honest version):** the server is plain TypeScript
   checked into the product repo and registered via **project-scope `.mcp.json`**
   (`npx`/`node` a repo-relative path). Any surface that opens the project — Desktop,
   CLI, or Code Web cloning the repo — launches the same server inside its own
   environment. Continuity boundary: Desktop/CLI share the Mac's disk in real time;
   Web syncs at git push/pull points. The guide states this plainly; the verification
   matrix (M5) tests all three.
3. **Product repo:** ~~`multi-agent-mcp`~~ → **RENAMED `agent-army` 2026-07-11 ~3:15AM**
   (Akash's pick, executed post-M1 per timing gate): local `~/Developer/GitHub/agent-army`,
   GitHub `doshi-ak/agent-army`, warehouse pointer updated. Older `multi-agent-mcp`
   mentions in this doc = the same repo. Originally: (new, private) — per the
   ratified source-goes-to-GitHub rule. Layout: `server/` (TS package), `plugin/`
   (`.claude-plugin/plugin.json` + `skills/` + `agents/` + `roles/`), `docs/`,
   `evals/`. The warehouse gets a pointer README (server source lives with its plugin
   here — one product, one repo; warehouse rule satisfied by the pointer).
4. **Plugin is skills-only + bundled agent/role definitions** (no bundled server
   binary — warehouse rule: bundling stdio servers trips plugin validation). The
   plugin's `team:init` skill wires the server via `.mcp.json` instead.
5. **Role templates source:** curated **copies** from `~/Developer/GitHub/agent-superteam`
   (already-merged VoltAgent + wshobson, MIT, do NOT re-scrape upstream), with
   ATTRIBUTION.md carried over. Curation = the named specialties below + what a task
   demands; never bulk-install 232.
6. **TS SDK gotchas apply** (warehouse Rule 2): `[key: string]: unknown;` in result
   interfaces; ZodRawShape for inputSchema; strict/cross-field validation inside
   handlers. **Verify before done** (Rule 3): `npm install && npm run build`, boot,
   inspector lists tools — every milestone.
7. **No secrets anywhere** in repo/plugin/state files. State files contain paths and
   status only.
8. **The server/session boundary (HARD CONSTRAINT — Akash's vehicle decision, recorded
   by Orchestrator 2026-07-11):** the MCP server **manages, tracks, and serves state; it
   never runs models and never spawns agents.** Agent *dispatch* is session-side only —
   plugin skills instruct the hosting Claude session to dispatch via its own Agent
   mechanism; `agent_create` writes definition files; `manager_tick` returns a
   recommendations *report* that the session-side agent-manager acts on. No tool in §4
   may execute an LLM call, and the Executor must reject any block implementation that
   crosses this line.

## 4. Tool inventory (~13, prefix = domain, action-oriented)

| Tool | Does | Annotations |
|---|---|---|
| `team_init` | Scaffold harness into cwd: `.claude/agents/`, `_team/STATE.md` + `PROGRESS.md` + `ROLES.md`, `.mcp.json`, CLAUDE.md routing block, dashboard seed. Detects net-new env → returns skill-forge nudge payload (DoD 5) | destructive:false, idempotent:true |
| `team_status` | Read all state files → structured team snapshot | readOnly |
| `agent_create` | Write `.claude/agents/<name>.md` from role template + task context | |
| `agent_delete` | Remove an agent def (archives to `_team/archive/`, never hard-deletes) | |
| `agent_list` | Enumerate agents + roles + last activity | readOnly |
| `agent_assign_role` | Re-role an agent from the specialties catalog | |
| `role_list` / `role_get` | Browse the pre-built specialties catalog | readOnly |
| `state_write` | Structured update to STATE.md (schema-validated) | |
| `progress_log` | Append timestamped entry to PROGRESS.md (append-only) | |
| `roles_sync` | Reconcile ROLES.md against `.claude/agents/` reality | |
| `manager_tick` | The iteration engine: stale claims, progress deltas, eval gaps, role-utilization → recommendations report (agent-manager acts on it) | readOnly |
| `dashboard_refresh` | Regenerate `_team/dashboard.html` from state (auto-called by every state-mutating tool — DoD 7) | |

## 5. State file schemas (exact; the Executor implements validators for these)

- **`_team/STATE.md`** — current truth. Sections: `## Team` (agent, role, status),
  `## Active Work` (task, owner, claimed-at, ETA), `## Blockers`, `## Last Manager Tick`
  (timestamp + top recommendation). Machine-readable YAML frontmatter mirrors the tables.
- **`_team/PROGRESS.md`** — append-only log: `- [ISO timestamp] <agent> — <event>:
  <one-line outcome>`. Never edited, only appended (audit trail).
- **`_team/ROLES.md`** — registry: role name → agent file → source template
  (superteam provenance) → refinement history (dated diffs of prompt changes).

## 6. Pre-built specialties catalog (v1 roles, curated from superteam)

`agent-manager` (net-new — the DoD-3 maintainer; spec below), `debugger`,
`systems-architect`, `regression-test-engineer`, `ci-cd-engineer`,
`forward-deployed-engineer`, `code-reviewer`, `security-auditor`, `docs-writer`,
`performance-engineer`. Each = superteam file (richer-version rule) + a 5-line
role-contract header (owner boundaries, verify-before-done, no-secrets).
**agent-manager spec:** runs `manager_tick`, applies accepted recommendations
(state hygiene, ROLES.md refinements, new eval cases into `evals/`), regenerates
dashboard, never edits another agent's work product — maintenance only.
**Specialized-role creation path (ruled 2026-07-11, closes the gap flagged by both the
eval draft and the roster doc):** three tiers, in order — (1) catalog role +
task-context via `agent_create` (covers most needs); (2) library pull: a superteam
template promoted into the project's roles (provenance recorded in ROLES.md); (3) truly
novel roles (e.g. social-media-strategist, the prediction-council specialists) are
authored through the `team:skill-forge` flow at M3 — synthesized from the project's own
artifacts per agentskills.io, then registered like any template. **Naming note:** the
product catalog has no role called "executor" — that's a seat name in THIS build's
three-session team, unrelated to deployed products; the roster doc flags it correctly.

## 7. Milestones = ownership blocks (one owner each; files listed = the block)

| M | Block | Owns (files) | Acceptance (Verifier runs these) |
|---|---|---|---|
| M1 | Server core: scaffold + `team_*`, `agent_*`, `role_*` — **✅ DONE 2026-07-11 (main `207e6c2`, 38/38 smoke, builder deviations 1–6 accepted by Architect; independent verify dispatched)** | `server/src/{index,team,agents,roles}.ts`, `server/package.json` (+accepted: `shared.ts`, `state/writers.ts` as M1 shared infra) | Build passes; server lists the **8 M1 tools** (13 = full product after M2+M4 — original row was an Architect error, caught by the builder); `team_init` in a scratch dir produces the full harness incl. valid `.mcp.json`; net-new detection returns the skill-forge nudge |
| M2 | State engine + manager: `state_*`, `progress_log`, `roles_sync`, `manager_tick` | `server/src/state/*`, schema validators, fixtures | Schema round-trip tests pass; `manager_tick` on fixture project yields correct stale-claim + eval-gap findings; PROGRESS.md is append-only under concurrent writes |
| M3 | Plugin: skills (`team:init`, `team:new-task`, `team:new-agent`, `team:retire-agent`, `team:assign-role`, `team:skill-forge`, `team:status`, `team:manager`) + bundled agents/roles + marketplace manifest | `plugin/**` | `/plugin install` from local marketplace succeeds; every skill invokes; `team:init` end-to-end in scratch project; skill-forge nudge fires on net-new (DoD 5) |
| M4 | Dashboard | `server/src/dashboard/*`, template HTML | Self-contained HTML, no external requests; reflects state within one tool-call of any mutation; renders on all 3 surfaces |
| M5 | Docs + evals + surface matrix. **Ownership split (2026-07-11, Akash directive): the GUIDE is Architect-authored** — v0.9 interactive artifact shipped (source `docs/guide/`, live at the claude.ai artifact link in BOARD); Executor packages it into the product repo and executes the matrix; Orchestrator's changelog is a separate deliverable, not this block | `docs/GUIDE.md`, `docs/guide/` (Architect), `evals/evaluation.xml`, `docs/VERIFICATION.md` (Executor) | Guide passes the non-technical read-through (Akash test); 10-question eval per mcp-builder Phase 4, answers verified; matrix executed on Desktop + CLI + Web with results recorded |

Order: M1 → M2 strictly (M2 imports M1's core). M3–M5 parallelizable after M2 via
Executor subagents (one block each). Shared infra (server scaffold, tsconfig, error
helpers, response format) is **M1-owned**; read-only to every other block after M1 lands.

## 8. Eval plan (Architect owns content; M5 packages it)

10 independent, read-only-verifiable questions (mcp-builder Phase 4) — e.g. "after
`team_init` + creating agents X,Y with roles A,B, what does `agent_list` return",
"what does `manager_tick` flag when a claim is 2× past ETA", "what provenance does
ROLES.md record for the debugger role". Plus the DoD matrix: 8 rows × pass/fail ×
3 surfaces where applicable. FAIL on any row = back to owning block.

**Primary eval scenario (received 2026-07-11): the prediction-market workflow** in
`_coordination/SAMPLE-USE-CASE/` (PREDICTION-AGENT-USE-CASE.MD + mermaid flow). Its
architecture validates ours: deterministic control system, LLM agents as replaceable
research modules ("useful analysts, dangerous autonomous traders" — cited live-trading
benchmarks show frontier models losing 16–31% on Kalshi), paper/HITL/live modes with
human gate, versioned prompts, point-in-time logging. End-to-end eval: deploy a team
via `team_init`, run the research→recommendation pipeline in PAPER mode, verify every
recommendation lands in PROGRESS.md with sources and NO execution occurs without the
human gate. This is the harness's flagship regression test.

## 9. Process rules (binding, from the governing spec + board)

1. One block = one owner = its own files. Cross-block needs → message the Architect.
2. Executor verifies (build + boot + inspector) before reporting any block done —
   speed never removes checks (ratified Executor amendment).
3. Verification of DONE blocks = `verifier` subagent dispatches (or the 4th seat if
   Akash opens it) — never the block's author.
4. Money/outbound/human-gate guardrails apply to everything this system ever runs.
5. STATE files + BOARD updated at every block claim/completion/blocker.
6. **Model-tiering policy (v3 — FINAL, per Akash's explicit statement 2026-07-11
   ~2:50AM: "Fable should be handling the hardest shit, Opus the second hardest,
   Sonnet executes"):** tier by DIFFICULTY, not by seat title. **Fable 5 = the hardest
   reasoning** — spec architecture, eval design, validation logic, integration
   decisions, repo reconciliation → lives in the Architect seat (Desktop stays on
   Fable; v2's Opus-downgrade is struck). **Opus 4.8 = second tier** — Orchestrator
   (1M-context whole-system state) + escalation target for failed blocks + verifier
   dispatches. **Sonnet 5 = execution** — Executor seat and all dispatched
   builder/writer agents running against tight specs. Escalation unchanged: 2 failed
   verify cycles → Opus; still failing → spec problem, back to Fable. The handoff
   discipline that makes this work: the hard thinking is FINISHED and written into
   PLAN/block specs BEFORE Sonnet touches anything — Sonnet executes decisions, never
   makes them.
7. **M-block eligibility signal (clarified 2026-07-11): commits on `main` ONLY.**
   WIP/backup branches (e.g. `m1-wip`) do NOT unblock dependent blocks — main receives
   commits only after the owning agent's verification passes. Cron/loop gates must
   check `git log main`, never branch existence.

## 10.5 Skill-layer architecture — the four sources combined (v1.2, researched 2026-07-11)

One architecture, four inputs, each with a distinct job:

| Source | Layer | What we take | What we refuse |
|---|---|---|---|
| VoltAgent + wshobson (via `agent-superteam`, MIT) | **Agent roles** | The §6 curated catalog; richer-file-wins merge already done | Bulk-install; re-scraping upstream |
| obra/superpowers (MIT, v6.1.1) | **Skill content patterns** | (a) verification-before-completion's 5-step gate (IDENTIFY→RUN→READ→VERIFY→CLAIM) → adopt near-verbatim into `verifier` + Executor done-criteria; (b) writing-skills' RED→GREEN→REFACTOR loop → the engine inside `team:skill-forge`; (c) subagent status vocabulary (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) → STATE.md's status enum; (d) batch-dispatch rule — cross-validates our existing dispatch discipline | **Its hooks** (`hooks/hooks.json` registers a SessionStart hook — we are skills-only by design); its telemetry; TDD-everywhere framing (our team does non-code work). MIT attribution in THIRD_PARTY_NOTICES for any ported text |
| agentskills.io (open spec, ex-Anthropic) | **Format contract** | SKILL.md frontmatter law for every M3 skill: `name` = dir name, ≤64 chars lowercase+hyphens; `description` states what+when, ≤1024 chars; body <500 lines/<5k tokens, bulk in `references/`; progressive disclosure. Validate with `skills-ref validate` pre-ship if installable | Treating it as a registry (it's a spec site) |
| agentskills.io best-practices | **skill-forge + team_init methodology** | The DoD-5 nudge implements "synthesize from the project's own artifacts" (docs, runbooks, schemas, git history) — never generic-knowledge skills; Gotchas sections as the primary iteration lever; calibrate prescriptiveness to task fragility | The anti-pattern it names: vague generic procedures from LLM general knowledge |

Full research brief with citations: BOARD message 2026-07-11 (researcher dispatch);
Executor reads this section before starting M3.

## 9.5 Late-breaking requirements (FROM_AKASH update 6, 2026-07-11 ~1:12AM)

1. **WAREHOUSE — CORRECTED 2026-07-11 ~2:00AM:** the retirement premise was FALSE. The
   folder-defect session (now landed in this workspace — see
   `_coordination/MCP-FOLDER-DEFECT-CONTEXT.md`) confirmed: `~/claude-mcp-servers`
   **stays** — the defect was a *rename* (`mcp-servers` → `claude-mcp-servers`) with
   stale references, fixed and verified. Kiro's escalation stands down. KEPT from the
   original mitigation (still good practice, no longer forced): the build-law rules are
   copied into the product repo as `server/BUILD-RULES.md` so the product is
   self-contained; warehouse pointer README lands as planned. *(Original text assumed
   retirement per FROM_AKASH update 6 — superseded by the defect session's first-hand
   correction.)*
2. **D9 — zero-friction deployment (promoted to the DoD):** a deployed harness must not
   stall on routine permission prompts — "a million agents blocked by an allowlist is
   zero throughput" (Akash). `team:init` (M3) writes a scoped project allowlist into the
   target's `.claude/settings.json`: auto-approve `_team/**` writes, agent-file writes
   under `.claude/agents/`, and read-only shell; keep gating git-push/network/rm/money/
   outbound. The guide documents exactly what is and isn't auto-approved. Acceptance:
   a fresh `team:init` → `team:new-task` → dashboard cycle completes with ZERO
   permission prompts on the happy path.

## 10.6 External tooling verdicts (researched 2026-07-11, cited brief on file)

**ADOPT:** (a) **Official Claude Code GitHub Actions** (`anthropics/claude-code-action`,
GA, 8.3k★) — THE while-you-sleep mechanism: `@claude` on issues/PRs + `schedule: cron`
workflows on GitHub's runners; auth via Pro/Max OAuth token (`claude setup-token`) or
API key. Requires Akash to run `/install-github-app` once (interactive — his morning
list). New work item on M5: nightly workflow that reads STATE/PROGRESS and advances the
queue or posts status. (b) **Repo CI hygiene** the moment agents push unattended:
`actions/setup-node` + `npm ci`, CodeQL (js/ts, push + weekly), Dependabot (npm +
github-actions) — Executor adds the files post-M1. (c) **DIY PR review pattern**:
`claude-code-action` invoking the `code-review` skill on pull_request events (the
managed Code Review service is Team/Enterprise-only, $15–25/review — plan-gated, skip).

**SKIP:** `claude-did-this/claude-hub` (re-implements the official action + you'd run a
server + stale releases); `dtinth/claude-code-webhook` (session-event notifier, wrong
problem); Kiro extension marketplace (Open VSX; nothing MCP-relevant found); **GitHub
Copilot — NOT needed** (separate product, zero functional dependency, added cost only).

**LATER:** `hookdeck/webhook-skills` (install only when an agent must *write* webhook
receivers); Agent SDK subagents doc — one-level-deep nesting is a real ceiling to design
around before the team scales past a handful of concurrent agents (Architect to read).

**mcpmarket "github-multi-agent-code-review" (Akash, vetted Sat AM): SKIP wholesale /
ADAPT two patterns.** Listing unverifiable (bot-walled aggregator — treat mcpmarket
listings as leads, never install sources); inferred upstream (spencermarx/
open-code-review, Apache-2.0, active) violates our hard rules: hooks-enabled `.mcp.json`,
unpinned `npx ruflo@latest` (supply-chain), auto-fix-commit-push loop collapsing the
reviewer≠fixer separation, +28 unrelated swarm skills. ADAPTED (no code imported):
(1) discourse cross-examination (CHALLENGE/CONNECT/SURFACE) + 0–100 confidence scoring
w/ 80-threshold → verifier agent prompt (done) and M5 eval rubric — verifier verdicts
must state per-finding confidence; (2) sourced the official code-review plugin's
confidence-filter concept as the cleaner false-positive control.

## 10.7 Second automation pathway — Manus + Relay.app (integrated 2026-07-11, v1.1 scope)

Akash's prior build (`_coordination/manus-cowork-relay-coordination-plan.md`, 613 lines,
confidence-tagged) prescribes a **shared-system-of-record pattern**: no tool-to-tool
integration; one task board all tools read/write; Relay.app as traffic controller;
Manus driven via its real REST API; human gates at Relay approval steps.

**Architect's integration verdict:** that plan and this product CONVERGE — its "optional
upgrade" is literally a Task-Board MCP server, which is what we're building. Our
`_team/STATE.md / PROGRESS.md / ROLES.md` **are** the shared system of record. Therefore:
- **v1 (now):** no scope change. The state-file schemas (§5) already serve as the board.
- **v1.1 (post-ship):** add the external-worker adapter — (a) a `manus-worker` role that
  dispatches grunt work (scraping, bulk formatting, long research) to Manus via API,
  logging to PROGRESS.md — saving Claude context/tokens exactly as Akash intends;
  (b) Relay.app webhook → `progress_log` ingestion so Relay-orchestrated flows appear on
  the same board. The plan's hard limit stands: Cowork can't be triggered externally —
  always-on execution routes via Anthropic API/GitHub Actions instead.
Registered as a LATER row in the board Deliverables Registry when v1.1 starts.
Also parked at the same v1.1 weight (per audit consistency note): **Desktop Buddy /
ESP32 hardware status display** — a dashboard consumer reading the same `_team/` files;
fun, low-risk, post-ship.

## 10. Open items (non-blocking; Architect decisions pending Akash veto)

- Product repo name `multi-agent-mcp` under `~/Developer/GitHub/` — **proceeding
  unless Akash objects.** Private.
- Dashboard auto-open behavior (auto-open browser on `team_init` only; refreshes are
  silent) — proceeding.
- Code Web: private-repo `npx` inside the sandbox depends on repo access at clone
  time; if it bites, fallback is committing `server/dist/` (documented in guide).
  Verifier confirms in M5.
