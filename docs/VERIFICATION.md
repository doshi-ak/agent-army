# VERIFICATION.md — 3-Surface Verification Matrix (DoD 8)

> **What this document is.** PLAN.md DoD 8 requires Agent Army to work "seamlessly across
> Claude Code **CLI**, **Desktop**, and **Code Web**." This file records the actual
> verification of that claim across all three surfaces, plus the D1–D9 definition-of-done
> rows on each surface.
>
> **Read this first — the honesty contract of this file.** This project's defining failure
> mode is fabricated green checkmarks. This matrix therefore states plainly, per cell,
> whether a result was *actually observed* or is *awaiting a human*. It was authored from a
> **CLI** session, which can genuinely exercise the CLI surface but **cannot** drive the
> Desktop app or Code Web. So:
>
> - **CLI column — EXECUTED.** Every CLI result below was produced by building and booting
>   the real server and driving it over the real stdio MCP surface on 2026-07-17. The raw
>   evidence is pasted in §2. Nothing in the CLI column is asserted from the spec.
> - **Desktop column — `NOT YET EXECUTED`.** Reproducible steps are given in §4. A human
>   must run them on the Claude Code desktop app and fill in the result.
> - **Code Web column — `NOT YET EXECUTED`.** Reproducible steps are given in §5. A human
>   must run them in Claude Code Web against a pushed clone and fill in the result.
>
> A cell marked `NOT YET EXECUTED` is a **correct and complete** deliverable state — it is an
> honest record that the check awaits a human on a surface this session cannot reach. It is
> **not** a failure, and it must **never** be silently upgraded to a checkmark without a human
> pasting observed evidence next to it.

---

## 0. Surface status at a glance

| Surface | Can this session verify it? | Status | Evidence |
|---|---|---|---|
| **Claude Code CLI** (Terminal `claude`, stdio server) | Yes — this is a CLI session | **EXECUTED — PASS** | §2 (live build + tool list + harness + `team_init` run) |
| **Claude Code Desktop** (Mac app) | No — cannot drive the desktop app from here | **NOT YET EXECUTED** | §4 (steps for a human) |
| **Claude Code Web** (claude.ai/code on a repo clone) | No — cannot open a cloud sandbox from here | **NOT YET EXECUTED** | §5 (steps for a human) |

Build under test: repo HEAD **`80b2efd`**, `server/dist/index.js`, **14 tools**, run 2026-07-17.

**Scope note — server tool surface vs. session/plugin layer.** The CLI evidence below
verifies the **MCP server tool surface** (the 14 tools) end-to-end. Two DoD behaviors are
**session-layer** — they are performed by the Claude session executing the M3 plugin skills,
not by a server tool, and are therefore invisible to a stdio harness: (a) the D9 permission
allowlist write into `.claude/settings.json` (done by the `team-init` **skill**, step 4 —
not by the `team_init` **tool**), and (b) whether a surface loads and fires the `team-*`
skills at all. Those are called out explicitly in the matrix (rows D2-skill, D8, D9) and can
only be confirmed on an interactive surface — which is exactly why the Desktop/Web columns
matter and are left honest.

---

## 1. What "verified" means here

A row is only **PASS** on a surface when a human (or, for CLI, this session) has **observed**
the stated result on that surface and can point to evidence. The allowed cell values:

- **PASS** — observed, with evidence.
- **FAIL** — observed to not hold (routes back to the owning M-block per PLAN §8/§9).
- **NOT YET EXECUTED** — no one has run it on this surface yet. The default for Desktop/Web.
- **N/A** — the row does not apply to that surface (e.g., a human-read-through row on a
  non-interactive harness).

---

## 2. CLI surface — EXECUTED (real evidence)

All four artifacts below were produced this session on the CLI surface. Commands are
reproducible from a clean checkout.

### 2.1 Build — clean

```
$ cd server && npm install && npm run build
> multi-agent-mcp-server@0.1.0 build
> tsc
# exit 0 — TypeScript compiled with no errors
# node v26.3.0, npm 11.16.0
```

### 2.2 Tool surface — 14 tools listed over stdio

Booting `dist/index.js` and calling `listTools` over the real MCP client transport returns
**14** tools (PLAN §4 inventory + the `state_read` reader added in M2):

```
TOOL_COUNT=14
agent_assign_role   readOnly=false destructive=true  idempotent=false
agent_create        readOnly=false destructive=false idempotent=false
agent_delete        readOnly=false destructive=true  idempotent=false
agent_list          readOnly=true  destructive=false idempotent=true
dashboard_refresh   readOnly=false destructive=false idempotent=true
manager_tick        readOnly=true  destructive=false idempotent=true
progress_log        readOnly=false destructive=false idempotent=false
role_get            readOnly=true  destructive=false idempotent=true
role_list           readOnly=true  destructive=false idempotent=true
roles_sync          readOnly=true  destructive=false idempotent=true
state_read          readOnly=true  destructive=false idempotent=true
state_write         readOnly=false destructive=false idempotent=false
team_init           readOnly=false destructive=false idempotent=true
team_status         readOnly=true  destructive=false idempotent=true
```

### 2.3 Executable eval harness — 13/13 scoreable PASS, 0 guardrail breaches

`evals/harness/run-evals.mjs` drives the compiled server over stdio (the same path a Claude
session uses), one fresh scratch project per case:

```
$ node evals/harness/run-evals.mjs
  ✓ EVAL-01 PASS — team_init output set + net-new skill-forge nudge
  ✓ EVAL-02 PASS — agent_list after a create sequence
  ✓ EVAL-03 PASS — agent_delete archives, never hard-deletes
  ✓ EVAL-04 PASS — manager_tick flags a 2x-past-ETA stale claim
  ✓ EVAL-05 PASS — ROLES.md records superteam provenance for debugger
  ✓ EVAL-06 PASS — role_list returns the curated v1 catalog (10), not the full library
  ✓ EVAL-07 PASS — dashboard auto-regenerates on a state mutation (no explicit refresh)
  ✓ EVAL-15 PASS — dashboard is self-contained (no external network requests)
  ✓ EVAL-08 PASS — agent_assign_role updates ROLES.md refinement history
  ✓ EVAL-09 PASS — PROGRESS.md is append-only under concurrent writes
  ✓ EVAL-10 PASS — server/session boundary: compiled server has NO model/spawn/network APIs
  ✓ EVAL-12 PASS — team_init is idempotent (second run does not duplicate/corrupt)
  ✓ EVAL-14 PASS — roles_sync reconciles ROLES.md against .claude/agents reality
  ⃠ EVAL-11 BLOCKED — not a server tool by design — team:skill-forge is a plugin skill; scored as M3-04 by run-plugin-evals.mjs
  ⃠ EVAL-13 BLOCKED — permission gating is a session-layer behavior, not observable from the MCP tool surface; verify via D9 matrix on Desktop/CLI

Axis1 13/13 PASS (0 fail, 2 blocked) · Axis2 0 breaches
```

The 10 `evals/evaluation.xml` answers were separately confirmed against the same live server;
the verified values are: 10 catalog roles, `agent-manager` net-new, 3 opus-targeted roles,
`security-auditor`=opus, net-new nudge=True, second-run netNew=False, 1 stale claim, 1
archived agent, re-role→`code-reviewer`, 14 tools.

### 2.4 `team_init` end-to-end in a scratch dir (DoD 1 / DoD 6)

```
$ (server drives team_init on an empty scratch dir, projectName="demo-project")
Team harness initialized in /private/tmp/aa-demo-* (9 created, 0 already existed).

created: .claude/agents/, _team/, _team/archive/, _team/STATE.md,
         _team/PROGRESS.md, _team/ROLES.md, .mcp.json (created),
         CLAUDE.md routing block (created), _team/dashboard.html (regenerated)
netNew: true    skillForgeNudge: present (agentskills.io authoring workflow)

$ find . -type f | sort
./.mcp.json
./CLAUDE.md
./_team/PROGRESS.md
./_team/ROLES.md
./_team/STATE.md
./_team/dashboard.html

$ cat .mcp.json
{ "mcpServers": { "multi-agent-mcp": {
    "command": "node",
    "args": ["/Users/doshi/Developer/GitHub/agent-army/server/dist/index.js"] } } }
```

`.mcp.json` registers the server by absolute path, so any surface that opens this project
launches the identical server (the mechanism DoD 8 relies on). **Web caveat this creates:**
the path is *this Mac's* absolute path (`serverEntryPath()` = `path.resolve(__dirname,
"index.js")`, `server/src/shared.ts:74-76`) — a `.mcp.json` scaffolded here will not resolve
inside a Code Web sandbox. The Web run must re-run `team_init` in the sandbox (writing the
sandbox's own path) or hand-register a repo-relative command; §5 records this as a check.

### 2.5 Independent second CLI pass — M5 executor run (same day, separate scratch project)

A second, independently written driver (scratchpad `m5-matrix-driver.mjs`, reusing the
`server/test/e2e-scratch.test.mjs` client pattern) booted `server/dist/index.js` over stdio
at **2026-07-17T08:28:29Z**, cwd = `mktemp -d` → `/tmp/m5-matrix-Pv3EeZ` (deleted after the
run, `rm -rf` confirmed). dist freshness was checked first (`stat -f '%m %N' … | sort -rn`:
`dist/index.js` newer than every `server/src/*.ts`). It re-confirmed §2.2/§2.4 (14 tools;
identical `team_init` created-set; same generated `.mcp.json`) and added the following
observations not covered above — raw output snippets, all from one continuous run:

**D6 idempotency, byte-level.** Second `team_init` → `created:
["_team/dashboard.html (regenerated)"]` only (dashboard is a derived artifact, regenerated
by design); all 8 state/config items `skipped`; `netNew: false`; STATE.md read before/after
run 2 was **byte-identical**.

**D2 lifecycle, live.**

```json
agent_create   → { "name": "matrix-builder", "role": "debugger",
                   "file": ".../.claude/agents/matrix-builder.md",
                   "provenance": "agent-superteam/agents/04-quality-security/debugger.md
                                  (upstream VoltAgent + wshobson ..., MIT; copied verbatim 2026-07-11)" }
agent_assign_role → { "previousRole": "debugger", "role": "docs-writer",
                   "archivedPrevious": ".../_team/archive/matrix-builder-2026-07-17T082831Z.md" }
agent_delete   → { "archivedTo": ".../_team/archive/matrix-builder-2026-07-17T082831Z-2.md" }
```

Post-delete: archive dir holds both archived defs; active agent file gone (`exists →
false`); `team_status` → `agentCount: 0, archivedCount: 2, initialized: true`.

**D3 manager_tick, full report.** After planting one 2h-overdue claim + one IDLE agent:

```json
{ "staleClaims": [{ "task": "overdue-matrix-task", "owner": "matrix-builder",
                    "eta": "2026-07-17T06:28:31.104Z" }],
  "idleAgents": ["idle-one"],
  "evalGap": "No eval cases found in evals/ — generate at least one acceptance case per active work item.",
  "progressSinceLastTick": 5,
  "recommendations": [ "...stale claim...", "...idle agent...", "...eval gap..." ] }
```

Exactly the planted findings, no false positives; report-only (`readOnlyHint: true`),
consistent with §3.8.

**D7 same-call regen.** `_team/dashboard.html` read before → one `state_write
(op: upsert_agent)` → read after, **no other call in between**: `contentChanged: true`;
final dashboard shows the claimed task under "Active work"; `grep -oE 'https?://…'` over
the HTML → zero external URLs. Design note, not a defect: roster rows come from
`.claude/agents/*.md` (STATE.md's team table contributes *status* only — documented at
`server/src/dashboard/render.ts:67-74`), so a status-only `upsert_agent` with no agent
file adds no roster row.

**D9 tool-half, observed.** After the TOOL `team_init`:
`.claude/settings.json exists? → false`. The allowlist is owned by the `team-init`
**skill**, step 4 of `plugin/skills/team-init/SKILL.md`: *"**Write the D9 permission
allowlist.** Read `.claude/settings.json` in the target project (create it as `{}` if
absent). Merge the following into its `permissions.allow` array idempotently"* — with the
exact list (`Write(_team/**)`, `Write(.claude/agents/**)`, read-only shell) and the hard
refusal to ever add `git push` / network / `rm` / money-shaped commands. Whether the
*session* honors it (0 prompts happy path, gated ops still prompt) is SL-3 — interactive
surfaces only, not claimed here.

---

## 3. D1–D9 matrix across the three surfaces

Legend: **PASS** (observed here) · **NYE** = `NOT YET EXECUTED` (awaits a human) · **N/A**.
D1–D8 per PLAN §0.1; D9 per §9.5.

| # | DoD item | How to verify | CLI | Desktop | Web |
|---|---|---|---|---|---|
| **D1** | Surface as a team: init → agents visible in state files | Run `team_init`; create agents; confirm `_team/STATE.md` / `.claude/agents/` reflect them | **PASS** (§2.4, §2.3 EVAL-01/02) | **NYE** | **NYE** |
| **D2 (tools)** | Lifecycle tools create/delete/assign/list/roles each work | Exercise each tool; confirm observable state-file change | **PASS** (§2.3 EVAL-02/03/05/06/08/14; §2.5 live create → re-role → archive run) | **NYE** | **NYE** |
| **D2 (skills)** | The 8 `team:*` plugin skills fire on their trigger phrases | In an interactive session, say each skill's plain-English trigger; confirm the SKILL.md loads and acts | **N/A** (no interactive skill layer in a stdio harness) | **NYE** | **NYE** |
| **D3** | Manager loop: `manager_tick` surfaces stale claims / gaps | Stage a 2×-past-ETA claim; run `manager_tick`; confirm it is flagged | **PASS** (§2.3 EVAL-04; §2.5 full report: stale + idle + eval-gap, no false positives) | **NYE** | **NYE** |
| **D4** | Non-technical guide passes read-through (Akash test) | Akash reads the guide unaided and completes init → task → dashboard | **MANUAL / N/A** (human read-through, not a harness check). Guide status on disk: `docs/guide/GUIDE.html` exists (266,795 bytes, Jul 14) + `docs/guide/src/`; `docs/GUIDE.md` packaged Jul 17 ~04:30 (this M5 run — it landed 2 min after the first evidence sweep, which briefly recorded it absent) | **NYE** (Akash) | **NYE** (Akash) |
| **D5** | Net-new nudge fires, agentskills.io-conformant | `team_init` in an empty dir; confirm skill-forge nudge payload | **PASS** (§2.4, §2.3 EVAL-01) | **NYE** | **NYE** |
| **D6** | `team_init` idempotent, complete, correct | Run `team_init` twice; second run mutates nothing, reports `netNew:false` | **PASS** (§2.3 EVAL-12; §2.5: run 2 created nothing but the derived dashboard regen, STATE.md byte-identical) | **NYE** | **NYE** |
| **D7** | Dashboard auto-regenerates on every state mutation; self-contained | Mutate state without calling `dashboard_refresh`; confirm `dashboard.html` changed + no external requests | **PASS** (§2.3 EVAL-07/15; §2.5: content changed within the same `state_write` call, zero external URLs) | **NYE** | **NYE** |
| **D8** | Seamless across CLI / Desktop / Web (git-sync boundary documented) | Run the D1–D7 flow on each surface; confirm parity modulo the git push/pull continuity boundary | **PASS (CLI leg only)** — the other two legs are exactly what is NYE | **NYE** | **NYE** |
| **D9** | Zero-friction deploy: happy path 0 prompts; git-push/rm/network/money stay gated | Run init → new-task → dashboard with a fresh `.claude/settings.json`; count prompts (must be 0); then confirm a git push still prompts | **SPLIT VERIFIED** (§2.5) — tool half observed: the `team_init` TOOL wrote **no** `.claude/settings.json` (checked `false` post-init, by design); skill half quoted: `team-init` SKILL step 4 owns the allowlist write. Prompt *behavior* (both halves of the acceptance) is session-layer: **NYE** (SL-3; §2.3 EVAL-13 BLOCKED) | **NYE** | **NYE** |

**Reading of the matrix, stated plainly:** the CLI column is genuinely green where a stdio
harness can see the behavior, and honestly N/A where the behavior lives in the interactive
skill/permission layer a harness cannot see. **Every Desktop and Web cell is `NOT YET
EXECUTED`** — no one has run these on those surfaces yet, and this document does not pretend
otherwise. Completing DoD 8 requires a human to run §4 and §5.

---

## 4. Desktop surface — reproducible steps (result: `NOT YET EXECUTED`)

Run these on the **Claude Code desktop app** (Mac). Paste observed output next to each row in
§3's Desktop column and change `NYE` → `PASS`/`FAIL`. Do not change a cell without evidence.

1. **Install the plugin (once per machine).** In a Claude Code session:
   - `/plugin marketplace add doshi-ak/agent-army`
   - `/plugin install agent-army@agent-army-marketplace`
   - Restart the session. **Verify (SL-1):** the plugin appears in the installed list and the
     8 `team-*` skills are discoverable.
   - **Status reference (not a claim):** this is M3 acceptance C1 — session-layer, first
     interactive run **claimed by Cody Banks** (`evals/ADJUDICATION-LOG.md` B3;
     `evals/EVAL-RUBRIC.md` §6 SL-1..4). `evals/SCOREBOARD.md` caps M3 at "🟡 FILE-CONTRACT
     PASS — acceptance pending session-layer run", and `evals/results/session-layer.json`
     did not exist at this run (checked `ls evals/results/`). This matrix inherits that
     status; it does not overturn it. Record the run's evidence in `session-layer.json`
     per the rubric's protocol (runner, surface, headCommit, per-case literal evidence).
2. **Open a scratch project folder** (empty or a throwaway repo) in the desktop app.
3. **D5 / D1 / D6:** say *"set up an agent team in this project."* Confirm `_team/STATE.md`,
   `_team/PROGRESS.md`, `_team/ROLES.md`, `.mcp.json`, the CLAUDE.md routing block, and
   `_team/dashboard.html` appear; confirm the net-new skill-forge nudge fires. Run it again;
   confirm nothing is duplicated (D6).
4. **D9 (both halves):** confirm `.claude/settings.json` now carries the scoped allowlist
   (`_team/**` + `.claude/agents/**` writes, read-only shell); run init → new-task → dashboard
   and confirm **0** permission prompts on the happy path; then attempt a `git push` and
   confirm it **still** prompts (stays gated).
5. **D2:** exercise *"add a debugger to the team"*, *"make that agent a code reviewer"*,
   *"retire the docs agent"*; confirm each produces the expected state-file change and that
   retirement archives (never hard-deletes) to `_team/archive/`.
6. **D3:** *"run team maintenance"*; confirm `manager_tick` findings and the STATE.md
   `## Last Manager Tick` update.
7. **D7:** after any of the above, confirm `_team/dashboard.html` updated on its own and opens
   locally with no network calls.

## 5. Code Web surface — reproducible steps (result: `NOT YET EXECUTED`)

Run these in **Claude Code Web** (claude.ai/code). The continuity boundary (PLAN §3.2) is the
point of this column: Web operates on the **GitHub clone**, syncing at push/pull, not on the
Mac's live disk.

1. **Precondition:** a repo that already has a team harness committed (set up once from
   Desktop/CLI per §4, then `git push`). `server/dist/` is committed, so the clone runs the
   server without a build step (README "Build & run"). If a private-repo `npx`/clone issue
   bites, the documented fallback is the committed `dist/` (PLAN §10, open item).
2. Open the repo in Code Web; confirm the server and `_team/` files arrive with the clone and
   the `multi-agent-mcp` server registers from `.mcp.json`. **Absolute-path check (found on
   the CLI run — §2.4/§2.5):** `team_init` writes the scaffolding machine's *absolute*
   server path into `.mcp.json`, so a file committed from the Mac will not resolve in the
   sandbox. Expect to re-run `team_init` inside the sandbox (it writes the sandbox's own
   path) or hand-register a repo-relative `node server/dist/index.js`; record which was
   needed.
3. **D1/D2/D3/D7:** run the same flow as §4 steps 3–7; confirm parity with the Desktop/CLI
   result set.
4. **D8 boundary (the honest expected result, not real-time parity):** make a state change in
   Web, `commit and push`; pull it on Desktop/CLI and confirm it appears — and vice-versa.
   Web is expected to reflect changes **at sync points**, not instantly. Score this row
   against the documented boundary, not against live-disk parity.
5. **D9 on Web:** the Web permission model is unconfirmed — record exactly what you observe
   for the happy-path prompt count and the still-gated `git push`; do not assume it matches
   Desktop.

---

## 6. Summary

- **CLI: executed and passing** — 14 tools live, 13/13 scoreable harness cases pass with zero
  guardrail breaches, `team_init` produces the full harness end-to-end. Evidence in §2,
  including a second independent same-day pass (§2.5) that live-ran the D2 lifecycle,
  D3 manager_tick report, D7 same-call dashboard regen, byte-level D6 idempotency, and the
  D9 tool/skill split — scratch projects deleted after both runs.
- **Desktop: not yet executed** — steps in §4, awaiting a human on the desktop app.
- **Web: not yet executed** — steps in §5, awaiting a human in Code Web; the git-sync boundary
  is the expected result for D8, not a defect.

DoD 8 is **partially verified**: one of three surfaces is genuinely green; the other two are
honestly pending. This is the accurate state of the deliverable, recorded as such.
