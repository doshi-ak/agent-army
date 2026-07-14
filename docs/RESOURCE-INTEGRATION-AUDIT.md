# Resource Integration Audit

*Answers Akash's question 8 in `_coordination/FROM_AKASH.md` (the big numbered block, ~10:50am
update): "confirm every external resource... and confirm the unique elements and winning
pieces of each of those builds have been collectively aggregated into the entire build
architecture... show your work... without duplication."*

**What this document is:** a row-by-row trace of every external resource Akash supplied,
showing exactly where in the governing build spec (`PLAN.md`) or the coordination record it
was evaluated, what was taken, what was refused, and — where a verdict isn't in yet — an
honest "pending" instead of a guess.

**What counts as "integrated":** a resource is marked integrated only if a specific section
of `PLAN.md` (the binding spec — see `PLAN.md`'s own header: *"This file is the source of
truth for the build... reality diverging from this plan gets reported... never silently
patched"*) or another governing/coordination doc names it and states what was kept or
refused. No claim below is inferred from general knowledge of these tools — every row cites
the exact section.

**Audience:** non-technical. **Method:** every fact traced to a file + section; nothing
invented. Where the source material doesn't settle something, that's stated as a gap, not
papered over.

---

## 1. The full resource list, audited one by one

| # | Resource (as supplied) | What it contributed | Where integrated (cite) | Excluded / status |
|---|---|---|---|---|
| 1 | `cowork-mcp-builder-agent-team copy.md` (Akash's original agent-team spec, this folder) | The governing **process itself**: run a gate before spawning a team, write one `PLAN.md` as the single source of truth, partition work into non-overlapping ownership blocks, verify before calling anything done | `PLAN.md` header (lines 3–4): *"Authority: This file is the source of truth for the build (per `cowork-mcp-builder-agent-team copy.md` §3/§6)"*; PLAN §1 states the gate verdict out loud (*"Team build is WARRANTED... ~13 tools across cleanly separable groups"*); PLAN §7 turns every milestone into a named ownership block; PLAN §9 rules 1–3 restate one-owner-per-block, verify-before-done, and independent verification | Nothing refused — this is the constitution, not a menu item. One deliberate substitution, recorded not hidden: the spec's own `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` runtime toggle (its §2) was not used; instead the build ran as three separate Claude Code surfaces (Desktop/CLI/Kiro) coordinating through `_coordination/BOARD.md`'s Surface Registry — same one-owner-per-block discipline, different mechanics |
| 2 | `github.com/wshobson/agents` | 134 unique agent role definitions (MIT) | `~/Developer/GitHub/agent-superteam/ATTRIBUTION.md` ("134 ingested (unique)"); PLAN §3 architecture decision 5 (*"curated copies from `~/Developer/GitHub/agent-superteam`... already-merged VoltAgent + wshobson, MIT... never re-scrape upstream"*); PLAN §6 (4 of the 9 library-sourced v1 roles trace to wshobson per `agent-army/THIRD_PARTY_NOTICES.md`'s per-role provenance table) | Bulk import of all 134 excluded — PLAN §0.1 non-goal: *"no bulk-install of the 232-role library"*; only the PLAN §6 catalog selection is live |
| 3 | `github.com/VoltAgent/awesome-claude-code-subagents` | 154 agent role definitions (MIT) | Same citations as row 2 (`ATTRIBUTION.md` "154 ingested"; PLAN §3.5, §6); `MERGES.md` records the 41 exact-name + 15 semantic duplicates against wshobson resolved by a richer-file-wins rule before either repo touched the product | Same bulk-import exclusion as row 2. 56 of VoltAgent's/wshobson's combined 288 files were also dropped as duplicates during the merge (see §2 "no-duplication" below) — never reached the product twice |
| 4 | `github.com/obra/superpowers` | Three portable patterns, not code: (a) the verification-before-completion 5-step gate (IDENTIFY→RUN→READ→VERIFY→CLAIM); (b) the RED→GREEN→REFACTOR loop; (c) the subagent status vocabulary (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) | PLAN §10.5 row 2, in full: gate → *"adopt near-verbatim into `verifier` + Executor done-criteria"*; RED-GREEN-REFACTOR → *"the engine inside `team:skill-forge`"*; status vocabulary → *"STATE.md's status enum"*; batch-dispatch rule cross-validates the routing spec's own dispatch discipline | **Refused explicitly, same row:** its `hooks/hooks.json` (a SessionStart hook) — *"we are skills-only by design"*; its telemetry; its TDD-everywhere framing (*"our team does non-code work"*). PLAN §10.5 commits to *"MIT attribution in THIRD_PARTY_NOTICES for any ported text"* — checked `agent-army/THIRD_PARTY_NOTICES.md` directly: it currently documents only the agent-superteam/VoltAgent/wshobson role templates, **no superpowers entry yet** (flagged in Gaps, §4 below) |
| 5 | `agentskills.io` | The SKILL.md format contract (frontmatter rules, size limits, progressive disclosure) + the skill-authoring methodology (synthesize from a project's own artifacts, never generic knowledge) | PLAN §10.5 rows 3–4 in full, incl. the exact limits (*"name = dir name, ≤64 chars... description ≤1024 chars... body <500 lines/<5k tokens"*); PLAN §0.1 D5 (*"conformant to agentskills.io authoring workflow"*); PLAN §6's tier-3 role-creation path (*"authored through the `team:skill-forge` flow... synthesized from the project's own artifacts per agentskills.io"*) | **Refused explicitly:** treating it as a registry to install from — PLAN §10.5 row 3: *"Treating it as a registry (it's a spec site)"* |
| 6 | `github.com/claude-did-this/claude-hub` | Evaluated, nothing adopted | PLAN §10.6 SKIP list: *"re-implements the official action + you'd run a server + stale releases"* | Fully excluded |
| 7 | `github.com/dtinth/claude-code-webhook` | Evaluated, nothing adopted | PLAN §10.6 SKIP list: *"session-event notifier, wrong problem"* | Fully excluded |
| 8 | `code.claude.com/docs/en/github-actions` | The official Claude Code GitHub Action — `@claude` on issues/PRs + `schedule: cron` workflows | PLAN §10.6 ADOPT (a): *"THE while-you-sleep mechanism... New work item on M5: nightly workflow that reads STATE/PROGRESS and advances the queue or posts status"* | Adopted in spec; **not yet wired** — requires Akash's one-time `/install-github-app` (see Gaps) |
| 9 | `github.com/hookdeck/webhook-skills` | Evaluated, deferred (not rejected) | PLAN §10.6 LATER: *"install only when an agent must write webhook receivers"* | No current need; revisit if that need appears |
| 10 | `wevint.com` listicle + `affaan-m/ECC` (`ecc-universal`, `ecc-agentshield`) | Evaluated, rejected on security grounds | `_coordination/RULES.md` §3: *"`ecc-universal`/`ecc-agentshield` (affaan-m/ECC): FROZEN. Installed but inert (no hooks in live config, verified). Do not run `npx ecc`/`ecc-install`... until reviewed"*; `BOARD.md` (CLI flag, 2026-07-11): *"installs Claude Code hooks (auto-run shell on tool events) with home-dir blast radius. Untrusted/unofficial"*; `RESPONSES-TO-AKASH.md` (Kiro, Q2): the recommending site is *"an SEO/affiliate listicle — not a security audit"* | Excluded — package installed but inert, frozen un-run, held under the RULES.md §3 no-untrusted-code gate pending Akash's own review |
| 11 | `manus-cowork-relay-coordination-plan.md` (Akash's prior build, 613 lines) | The shared-system-of-record pattern: one task board every tool reads/writes, Relay.app as traffic controller, Manus via its real REST API, human gates at approval steps | PLAN §10.7 in full: *"that plan and this product CONVERGE — its 'optional upgrade' is literally a Task-Board MCP server, which is what we're building. Our `_team/STATE.md`/`PROGRESS.md`/`ROLES.md` **are** the shared system of record."* v1 = no scope change (§5's state-file schemas already serve as the board) | Nothing rejected — deferred to v1.1 by design: *"add the external-worker adapter — a `manus-worker` role... Relay.app webhook → `progress_log` ingestion"*. PLAN §10.7 itself says this gets *"registered as a LATER row in the board Deliverables Registry when v1.1 starts"* — checked `BOARD.md`'s Deliverables Registry directly: no such row exists yet, consistent with v1.1 not having started (see Gaps) |
| 12 | SAMPLE-USE-CASE 1 (prediction-market) | The flagship eval scenario + guardrail validation: deterministic control system, LLM agents as replaceable research modules ("useful analysts, dangerous autonomous traders"), paper/HITL/live modes with a human gate | PLAN §8: *"Primary eval scenario... the prediction-market workflow... This is the harness's flagship regression test."*; `evals/EVALS-DRAFT.md` §B(1) builds the full end-to-end scenario directly from the three source files, with an explicit PAPER-mode-only FAIL condition matching PLAN §0.1's non-goal | Nothing rejected. Gap carried forward, stated by EVALS-DRAFT.md itself: the source's 7 AI-council specialist roles (Resolution Auditor, Evidence Auditor, Quant/Microstructure Analyst, etc.) are **not** in the v1 10-role catalog — *"Which path M3 actually implements is not settled in PLAN.md — flagged for review"* |
| 13 | SAMPLE-USE-CASE 2 (LinkedIn engine) | The second eval scenario: content strategy, calendar, and audit pipeline | `evals/EVALS-DRAFT.md` §B(2), built directly from `Content Project Instructions [UNOPTIMIZED].md` | **Its ungated auto-posting is explicitly overridden**, not silently adopted. EVALS-DRAFT.md's opening flag: the source instructs "autonomous execution" and lists scheduled LinkedIn posting/commenting with *"no human-approval gate stated anywhere in the document"*; the eval imposes the gate from PLAN §0.1's non-goal (*"no autonomous money/outbound (hard gate, permanent)"*) and the routing spec's comms guardrail (*"nothing is sent, posted, submitted, accepted, or deleted without Akash's explicit instruction for that specific item"*) — stated as an automatic FAIL condition in §B(2) regardless of what the source document itself says |
| 14 | Desktop Buddy / ESP32 file (`_coordination/Claude-Hardware-Desktop-Buddy`) | Idea: a small physical device (M5Stack/ESP32) that reads the same status data the dashboard already produces | **Not in `PLAN.md` at all** — parked verbally only, in `_coordination/RESPONSES-TO-AKASH.md`: Kiro — *"a hardware buddy showing agent status on an ESP32 screen is a fun, low-risk output of the dashboard work"*; Desktop — *"agree with Kiro — park it, but it's a natural v1.1: the dashboard's data files are exactly what a little desk gadget would read"* | Parked for v1.1, consistent with rows 9 and 11, but **unlike Manus/Relay it never got promoted into a PLAN.md section** — a real documentation gap, called out in §4 below, not just a status note |
| 15 | `mcpmarket.com` — `github-multi-agent-code-review` skill | Vetting **in flight** | `BOARD.md` (Desktop heartbeat, 02:58): *"Vetting agent running on Akash's github-multi-agent-code-review skill (mcpmarket)"*; `RESPONSES-TO-AKASH.md` (Desktop): *"mcpmarket skill: vetting agent resumed (slept with the Mac); verdict lands here"* | **PENDING — no verdict recorded anywhere in the source material as of this audit.** Not marking this adopted, rejected, or scoped; that would be inventing a fact |
| 16 | Kiro extensions marketplace + GitHub Copilot question | Evaluated, nothing adopted | PLAN §10.6 SKIP list: *"Kiro extension marketplace (Open VSX; nothing MCP-relevant found)"*; *"GitHub Copilot — NOT needed (separate product, zero functional dependency, added cost only)"* | Fully excluded, reasoning cited in the same line |
| 17 | GitHub Apps/Actions marketplace CI hygiene (CodeQL, Dependabot) | Repo safety net for the moment agents start pushing code unattended | PLAN §10.6 ADOPT (b): *"`actions/setup-node` + `npm ci`, CodeQL (js/ts, push + weekly), Dependabot (npm + github-actions) — Executor adds the files post-M1"* | Adopted in spec; **not yet built** — checked `~/Developer/GitHub/agent-army` directly: no `.github/workflows/` directory exists in the repo (only irrelevant files inside third-party `node_modules/`). M1 is done, so per PLAN §10.6 this work is now due (see Gaps) |

---

## 2. Cross-check: anything Akash sent that isn't in the 17 above?

Every URL that appears anywhere in `_coordination/FROM_AKASH.md` and `PLAN.md` was pulled and
matched against the table above. Result: **all six URLs Akash pasted are accounted for** (the
four webhook/GitHub links, the wevint listicle, the mcpmarket link) — none were missed.

One item was deliberately **not** added as a resource under audit: Akash's question 4 (the
Perplexity MCP connector / research-routing idea). He scoped that himself in the same message
— *"this may be separately related from this project"* — so it isn't part of the agent-army
build's resource set. It's noted here so it isn't mistaken for an oversight.

---

## 3. No-duplication statement

Four separate mechanisms, all documented, kept any given resource from being pulled into the
build twice:

1. **The library was deduplicated once, upstream of the product.** VoltAgent's 154 files +
   wshobson's 134 files (288 total) went through one merge pass before the product ever saw
   them: 41 exact-name collisions and 15 semantic duplicates were collapsed to a single
   richer-prompt file each (`~/Developer/GitHub/agent-superteam/MERGES.md` §1–2), leaving 232
   unique files. The product's own rule reinforces this: PLAN §3 architecture decision 5 says
   plainly, *"do NOT re-scrape upstream."* The build only ever reads the already-deduplicated
   agent-superteam copy, never VoltAgent or wshobson directly.
2. **One binding spec, not one per resource.** Per the governing process
   (`cowork-mcp-builder-agent-team copy.md` §3/§6, cited in PLAN.md's own header), `PLAN.md`
   is the single source of truth. Every resource's verdict lives in exactly one named section
   — §10.5 for the three skill-layer sources, §10.6 for the eight tooling/webhook items, §10.7
   for the Manus/Relay pathway — so no block re-litigates a resource another block already
   ruled on; a divergence gets reported to the Architect and the one section gets updated
   (PLAN §9 rule 1).
3. **A standing registry for anything that gets built.** `_coordination/BOARD.md`'s
   Deliverables Registry rule: *"no session produces an artifact, repo, or standalone doc
   without a row here FIRST... a deliverable not in this registry is presumptively duplicate
   work."* This caught a real near-miss in this build: Kiro's "Mission Control" status page
   duplicated the Field Guide's job; once flagged, Kiro retired its own page rather than
   maintaining two (BOARD Messages, 2026-07-11, Kiro "Executor" entry).
4. **Curation, never bulk import, for the role library.** PLAN §0.1's explicit non-goal —
   *"no bulk-install of the 232-role library"* — plus §6's curation rule (*"never installing
   the whole shelf at once"*) means the 232-file library is read from exactly once per role,
   at the moment a project's team actually needs that specialty; it's a source the product
   draws from, not a second copy of itself living inside the product.

---

## 4. Gaps — evaluated but not yet fully wired (honest list)

| Gap | What's done | What's still open |
|---|---|---|
| GitHub Actions (`/install-github-app`) | Adopted in spec, PLAN §10.6 (a) | Requires Akash's one-time interactive step; listed as a "morning item" in `BOARD.md`/`RESPONSES-TO-AKASH.md`. Not yet run as of this audit |
| CI hygiene (CodeQL, Dependabot, `setup-node`) | Adopted in spec, PLAN §10.6 (b), due "post-M1" | M1 is done; checked the `agent-army` repo directly — no `.github/workflows/` exists yet. Unbuilt |
| `github-multi-agent-code-review` (mcpmarket) | Vetting agent dispatched | No verdict recorded anywhere in the source material yet — genuinely pending, not a hidden ADOPT or SKIP |
| Desktop Buddy / ESP32 | Verbally parked to v1.1 by two sessions (`RESPONSES-TO-AKASH.md`) | Never promoted into `PLAN.md` the way Manus/Relay was (§10.7) — inconsistent documentation weight for two similarly-deferred ideas |
| Manus/Relay v1.1 registry row | PLAN §10.7 commits to adding a Deliverables Registry row "when v1.1 starts" | Checked `BOARD.md` directly — no such row exists yet, which is correct only because v1.1 hasn't started; flagged so it isn't forgotten when it does |
| obra/superpowers MIT attribution | PLAN §10.5 commits to *"MIT attribution in THIRD_PARTY_NOTICES for any ported text"* | Checked `agent-army/THIRD_PARTY_NOTICES.md` directly — it documents only the agent-superteam role templates; no superpowers entry yet (the ported patterns live in the `verifier` role and `team:skill-forge`, both still unbuilt in M3/M5) |
| SAMPLE-USE-CASE 1 & 2 role gaps | Both use cases are wired into `evals/EVALS-DRAFT.md` | Neither use case's specialist roles (the prediction council, the social-media strategist) exist in the v1 10-role catalog yet; PLAN §6 names three possible creation paths but doesn't settle which one M3 will implement — flagged twice already in EVALS-DRAFT.md, repeated here for completeness |
| Overall build status | M1 (server core) is done and independently verified (`BOARD.md` Done Log, 2026-07-11 ~4:00AM) | M2–M5 are still in progress as of this audit, so several "integrated in PLAN.md" rows above are verified specification commitments, not yet verified-built features; `evals/EVALS-DRAFT.md` §C's own D1–D9 matrix is an unexecuted skeleton |

---

*Sources consulted in full: `PLAN.md` (§0.1, §3, §6, §8, §9, §9.5, §10.5, §10.6, §10.7);
`cowork-mcp-builder-agent-team copy.md`; `docs/AGENT-ROSTER-EXPLAINED.md`;
`evals/EVALS-DRAFT.md`; `_coordination/BOARD.md` (Deliverables Registry, Done Log, Messages);
`_coordination/FROM_AKASH.md`; `_coordination/RESPONSES-TO-AKASH.md`; `_coordination/RULES.md`;
`_coordination/STATE_Desktop.md`; `~/Developer/GitHub/agent-superteam/ATTRIBUTION.md` and
`MERGES.md`; `~/Developer/GitHub/agent-army/THIRD_PARTY_NOTICES.md`; a direct directory listing
of `~/Developer/GitHub/agent-army` (confirming the CI-hygiene gap).*
