# M6 — Manus + Relay.app + Task-Board External-Worker Adapter (spec draft)

> **Status: DRAFT, pending Architect ratification into `PLAN.md` §7.** Per `BOARD.md`
> (Desktop, Mon Jul 13 ~2:45 PM): "Task 4 (Manus/Relay absorption): the handoff file
> LANDED... M6 spec draft is being written NOW (dispatched); it becomes a PLAN §7 block
> after my ratification pass." This file is that dispatched draft. Author: writer agent
> (Sonnet), dispatched by the Architect. Date: 2026-07-13.
>
> **Sources read in full:** `_coordination/Manus-Cowork-Relay-Integration/HANDOFF-Manus-Cowork-Relay-Integration-2026-07-13.md`
> (the just-landed handoff — canonical for current state); `_coordination/manus-cowork-relay-coordination-plan.md`
> (613-line architecture plan); `PLAN.md` §4, §5, §7, §10.7. Two filesystem facts were
> independently verified for this draft (not taken on the handoff's word) — see §7.
> No fact below is invented; where the handoff itself couldn't confirm something, that
> is preserved as unverified, not upgraded to fact.

---

## 0. Goal

Absorb the Manus + Cowork + Relay.app task-board integration — built as **Sample-Use-Case-1**
by a now-closing Cowork session — into `PLAN.md` as a first-class milestone, **M6**, per
Akash's Jul-13 directive ("this means it is now being fully absorbed into this multi-agent
MCP" — `FROM_AKASH.md`, item 4). This is not new design work: `PLAN.md` §10.7 already ruled
on the *pattern* on 2026-07-11 ("that plan and this product CONVERGE"). What's new is that
the handoff shows **real, mostly-working infrastructure now exists** (Notion board, Telegram
bridge, Manus API, Relay workflows) — M6's job is to formally own that infrastructure, wire
it to the harness's own state files without duplicating them, and finish the one blocked
piece, not to redesign anything.

---

## 1. Inventory — what exists, verified vs. claimed

The handoff itself distinguishes verified work from work that's built-but-unproven. This
table preserves that distinction; nothing here upgrades a claim to "verified" beyond what
the source states.

| Component | Status | Evidence |
|---|---|---|
| Notion Task Board (schema, 3 views, Integration Contract page) | **Built** | HANDOFF §3 |
| Telegram bridge, both directions (`telegram_sync.py`) | **VERIFIED** — live round-trip proven (DM → board row → Telegram reply); a Relay Custom-HTTP send returned 200 OK | HANDOFF §3 |
| Manus API connectivity (key, endpoint, auth header, body shape) | **VERIFIED** | HANDOFF §3, §9 |
| Manus callback webhook registration | **VERIFIED registered + active** (id `M4YeuHJczcDUQepVCuVqRg`) | HANDOFF §3, §9 |
| Manus callback, full end-to-end (`task_stopped` round-trip) | **NOT verified — claimed-pending.** "No real `task_stopped` event has round-tripped yet" | HANDOFF §6 |
| Relay's 6 Telegram steps (native picker replaced with Custom HTTP) | **Partially verified** — one step live-tested 200 OK; the other 5 built on the same pattern but not each individually confirmed live | HANDOFF §3 |
| Relay's Manus-dispatch step (body/header shape) | **Confirmed correct structurally** — not yet fired live (blocked on the Notion step below) | HANDOFF §3 |
| Relay's 5 Notion steps (dedup, create-row, merge, find-by-manus-id, mark-done/awaiting) | **NOT working** — "Empty filters," pointed at the wrong database. **THE blocker.** | HANDOFF §4 |
| Cowork hourly poll (`cowork-taskboard-poll`) | **Claimed live/enabled**; has not yet been proven to claim + work a real row end-to-end (that requires Relay's Notion steps to be fixed first) | HANDOFF §3, §7 |
| `healthcheck.py` | Reported all-green **"as of packaging"** — a point-in-time snapshot, not continuous monitoring, and **not re-run by this dispatch** (see §7) | HANDOFF §0, §3 |
| 3 validation board rows (Cowork self-test / Manus dispatch / Approval-gate) | 1 of 3 done (Cowork self-test); other 2 pending the Relay fix | HANDOFF §7 |
| Manus's own errored orchestration task (`TczqwG3k8Db0DeROezSgxa`, 978 credits) | **Errored, unresolved** — a separate track, not part of this integration's success criteria, but flagged for Akash | HANDOFF §5 item 6, §6 |
| Memory-file path ambiguity (handoff flagged this as open) | **RESOLVED by this dispatch** — verified directly via filesystem: the file exists ONLY at `~/.claude/projects/-Users-doshi-claude-mcp-servers/memory/taskboard-coordination-project.md`; the stale candidate path (`-Users-doshi-mcp-servers`) does not contain it | Verified directly, 2026-07-13 (not from the handoff) |
| `secrets.env` permission bits | **Verified 600** via direct `ls -l` (values not read) | Verified directly, 2026-07-13 |

**Net read:** the plumbing that doesn't touch Notion (Telegram, Manus API/webhook registration)
is solid and independently verifiable. Everything that routes through Relay's Notion
connection is either broken (the 5 Notion steps) or unproven end-to-end (the callback,
the Cowork poll's real-world loop) because it's all downstream of the same one blocker.

---

## 2. Integration architecture — one system of record, decided and justified

**Decision: `_team/STATE.md` / `PROGRESS.md` / `ROLES.md` remain the harness's single system
of record (per `PLAN.md` §5, already ratified in §10.7). The Notion Task Board is not a second,
competing system of record — it is the necessary operational substrate for the M6
external-worker adapter, because it is the only surface Manus, Relay, and Cowork can all
reach natively.** This is not a new decision; M6 executes what §10.7 already ruled, now that
real infrastructure exists to hang it on.

Justification:

1. **Reachability, not preference, decides where a task's live state lives.** `agent-army`'s
   `_team/` files are local, git-tracked project files, read/written by a local stdio MCP
   server (`PLAN.md` §3 architecture decision 1: "a third party cannot query it server-side").
   Manus and Relay are cloud services with no path to a local disk. Notion is the one substrate
   all three tools have a native connector for (per `manus-cowork-relay-coordination-plan.md`
   §3: "Manus, Cowork, and Relay can all natively read/write Notion"). Making `_team/` files
   the live ledger for Manus/Relay-owned tasks isn't a design choice being passed over — it's
   not physically possible without building the plan's own §8 "optional upgrade" (a public
   Task-Board MCP server), which both that plan and `PLAN.md` §10.7 deliberately deferred.
2. **The two systems record disjoint work, not the same work twice.** Notion's rows are
   specifically the ones tagged `owner_tool ∈ {relay, manus, cowork, user}` for the
   Sample-Use-Case-1 external-tool workflow. `agent-army`'s own internal M-block build work
   (the Architect/Orchestrator/Executor seats, or any future `team_init`'d project's agents)
   never appears in Notion and doesn't need to — it stays exclusively in `_team/` files, as
   `PLAN.md` already specifies. There is no overlap of *who writes where*.
3. **The one place a human (or the harness's own dashboard) looks for "what's my team doing"
   stays `_team/STATE.md` / `PROGRESS.md` / `dashboard.html` — never Notion.** The adapter's
   job (M6.3 below) is one-directional: a Notion status change gets condensed into one
   `progress_log` line, so the dashboard shows "Manus task X: done, see Notion for detail"
   without mirroring or polling the whole board. This is exactly what `PLAN.md` §10.7 already
   specified for v1.1 ("Relay.app webhook → `progress_log` ingestion so Relay-orchestrated
   flows appear on the same board") — M6 is that item, pulled forward and given real
   infrastructure to attach to.
4. **No rebuild, no second Notion database, no second Task-Board MCP server.** The
   already-built board + Telegram bridge + Manus webhook + Relay workflows (the handoff's
   real work) become the concrete implementation of the v1.1 external-worker lane, used
   as-is — not rebuilt, not duplicated.

### Schema mapping (Notion Task Board → `_team/` files)

| Notion field | `_team/` equivalent | Fit / note |
|---|---|---|
| `task_id` (UUID), `manus_task_id` | none in `STATE.md`'s Active Work table | Carried through only as a correlation key inside the `progress_log` line's text — no new ID field added to `STATE.md`'s schema |
| `Title`, `description` | `PROGRESS.md` log-line text | 1:1 — becomes the human-readable event text |
| `owner_tool` (relay / manus / cowork / user / unassigned) | `STATE.md` Team (agent, role, status) + Active Work (owner) | Only rows where `owner_tool=cowork` correspond to an actual `agent-army` agent. Rows owned by `relay`/`manus`/`user` are external — they get a `PROGRESS.md` line, never a `STATE.md` Team row |
| `status` (todo / in_progress / blocked / awaiting_user / done / cancelled) | `STATE.md`'s status enum (`DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`, adopted from obra/superpowers per `PLAN.md` §10.5 row 2c) | **Not a 1:1 map** — six Notion values vs. four `STATE.md` values. **Flagged for Architect, not silently resolved:** recommend translating at the adapter boundary (`done`→`DONE`, `blocked`/`awaiting_user`→`BLOCKED` or `NEEDS_CONTEXT`, `todo`/`in_progress`→ held in Notion only, not logged until a terminal state, `cancelled`→ logged as a one-line closure, not tracked as active). Do not grow `STATE.md`'s own vocabulary to fit an adapter's needs |
| `priority`, `due_date`, `dependencies`, `dedup_key`, `attempts` | none | Stay Notion-only — these are Relay's dispatch/loop-guard mechanics, out of scope for `_team/`'s narrative record |
| `handoff_notes`, `external_links` | folded into the `progress_log` line's outcome text | Concatenated into the one-line entry on each terminal status change |
| `user_approval_required` | `RULES.md` §1 human gate (money / outbound / secrets) | Not a new field or a new gate — any Notion row with this `true` already routes to a human under the harness's existing guardrail; M6 inherits it, doesn't add one |

---

## 3. Ownership blocks + acceptance criteria (`PLAN.md` §7 style)

| Block | Owns | Depends on | Acceptance (Verifier runs these) |
|---|---|---|---|
| **M6.0 — Human unblock** (no agent owns this; Akash only) | Notion sharing settings; Relay's 2 approval-step assignee fields | — | Task Board appears in Relay's Notion data-source picker; Relay's "Provide input to Manus" and "User decision" steps show a real assignee, not "Missing assignee" |
| **M6.1 — Relay finish-out** | Relay's hosted workflow config (no local files); `taskboard-coordination/RELAY_INSTRUCTIONS.md` (reference only) | M6.0 | All 5 Relay Notion steps point at data source `0b1500c1-c67a-46b1-b2ad-1a25ad770473` with the dedup filter set to open rows only (`status NOT IN done,cancelled`); firing the intake webhook (HANDOFF §5 step 2) produces a correctly-populated board row + owner routing + Telegram notification; the callback branches on `task_detail.stop_reason` (nested, not top-level); `healthcheck.py` still green after |
| **M6.2 — `manus-worker` role** (executes `PLAN.md` §10.7(a), independent of M6.0/M6.1) | `agent-army` repo: `server/roles/manus-worker.md` (or `plugin/roles/`), a `PLAN.md` §6 catalog entry, a `THIRD_PARTY_NOTICES.md` line if templated from an existing role | none (Cowork's own Notion connector already reaches the existing board — only Relay's separate connection is blocked) | Role file exists, carries the standard 5-line role-contract header (owner boundaries, verify-before-done, no-secrets) per `PLAN.md` §6's pattern; documents that it dispatches scoped work to Manus via the taskboard-coordination pattern and logs outcomes through `progress_log`; `roles_sync` recognizes it without error |
| **M6.3 — `progress_log` ingestion bridge** (executes `PLAN.md` §10.7(b), independent of M6.0/M6.1) | New: a small bridge (extends `telegram_sync.py`'s poll, or a standalone script in `taskboard-coordination/`) translating Notion status changes into `progress_log` calls per the mapping in §2 | none (reads via Cowork's existing Notion access) | A Notion row's terminal status change (e.g., a `manus`-owned row → `done`) produces exactly one new `_team/PROGRESS.md` line in the relevant project, carrying `task_id`/`manus_task_id` + outcome text; re-polling the same row does not duplicate the line (idempotent) |
| **M6.4 — Eval + docs** | `evals/EVALS-DRAFT.md` (a 4th independent scenario, alongside UC1–UC3); a "how a Manus/Relay task shows up in your dashboard" section in `docs/guide/` | M6.1 (needs a real end-to-end run to eval against) | 4th eval scenario added in the existing `EVALS-DRAFT.md` format (independent, ≥2 tool calls, read-only verifiable, no wall-clock dependency); the guide section passes the non-technical read-through (the Akash test, per `PLAN.md` §7 M5 row) |

**Dependency note, corrected from a first-pass assumption:** M6.2 and M6.3 do **not** wait on
M6.0/M6.1. The Task Board was created through **Cowork's own Notion connection**, which
already has full read/write access today (HANDOFF §6) — it's only **Relay's separate**
Notion connection that's blocked. So the adapter (agent-army-side) can be built and tested
against the live board right now; only Relay's own 5 steps are gated on Akash's 2-click
action.

---

## 4. Human-gate items (approvals stay with Akash — no exceptions)

Per `_coordination/RULES.md` §1 and the routing spec's comms/secrets guardrails, applied to
this integration specifically:

- **Notion access-control change** (the 2-click connection) — not one of RULES.md's three
  named categories (money/outbound/secrets), but the handoff itself designates it human-only:
  "Cowork does NOT change Notion sharing — access-control changes are the human's to make"
  (HANDOFF §8). No agent should attempt a workaround.
- **Outbound sends** (Telegram messages, Relay's two approval-step continuations) — already
  correctly designed as HITL gates in the existing build (Relay's "Provide input to Manus" /
  "User decision" steps stop for a human by construction). M6 adds no new gate here; it just
  needs an assignee set (M6.0).
- **Secrets** — the Telegram bot token and Manus API key are currently **inline in Relay's
  Custom-HTTP step URLs** (plaintext in a third-party UI, per HANDOFF §10). Rotating both and
  moving the bot token into a Relay secret is Akash-only, per RULES.md §3/§4 (secrets never
  live in a tracked file or a dispatch prompt — this is the same principle applied to a SaaS
  UI instead of a repo).
- **Money** — nothing in this integration touches trades or transfers today. If a future
  Manus task is scoped to something financial, RULES.md's existing money gate applies
  unchanged; M6 does not loosen it.

---

## 5. Open items requiring Akash

1. **Connect the Notion Task Board to Relay's Notion integration** (2-click; HANDOFF §0) —
   THE blocker. Nothing in M6.1 can complete without it.
2. **Set an assignee** on Relay's two human-approval steps ("Provide input to Manus", "User
   decision") — currently "Missing assignee."
3. **Decide on rotating** the Telegram bot token + Manus API key, and moving the bot token
   into a Relay secret, once M6.1's wiring is confirmed (HANDOFF §5 item 5, §10).
4. **Review Manus's own errored orchestration task** (`TczqwG3k8Db0DeROezSgxa`, 978 credits) —
   a separate track from this integration, unresolved, flagged for awareness (HANDOFF §5
   item 6).
5. **Confirm the system-of-record decision in §2** before the Architect ratifies this draft
   into `PLAN.md` §7 — if Akash wants a different split, say so now; this draft assumes no
   objection to `PLAN.md` §10.7's already-ratified direction.
6. **Confirm timing:** `PLAN.md` §10.7 originally scoped M6.2/M6.3 as "v1.1 (post-ship)."
   Akash's Jul-13 directive ("absorb... as a first-class milestone now") reads as pulling
   that forward. Worth an explicit yes/no on whether M6.2/M6.3 build now (parallel to
   M2–M5) or wait for M2–M5 to ship first — this draft does not assume an answer either way.

---

## 6. Recommended edits for the Architect's ratification pass

- Add an **M6** row (with the M6.0–M6.4 sub-blocks above) to `PLAN.md` §7's milestone table.
- Update `PLAN.md` §10.7 to note: the v1.1 external-worker adapter now has a landed reference
  implementation (`~/claude-mcp-servers/taskboard-coordination/`) to build M6.2/M6.3 against,
  rather than starting from the plan's own pseudocode.
- Add M6.4's scenario to `evals/EVALS-DRAFT.md` as a 4th independent use case, alongside UC1–UC3.
- Add a `BOARD.md` Deliverables Registry row for the `taskboard-coordination` warehouse
  service itself (it has none yet, per the Cowork session's own request in `BOARD.md`,
  2026-07-13 ~12:58 PM message) — separately from the M6 spec block, since the code already
  exists and is owned by the Cowork session that built it, not by an `agent-army` block owner.

---

## 7. What this dispatch could not verify (in addition to §1's per-item table)

- **`healthcheck.py` was not executed by this dispatch.** The handoff's "all green" claim is
  "as of packaging" — a point-in-time snapshot, not a live status as of today. Whoever picks
  up M6.1 should re-run it before relying on it.
- **Whether the Notion 2-click connection has since been made was not checked** (no Notion
  API access invoked for this document-only dispatch). `BOARD.md`/`RESPONSES-TO-AKASH.md`,
  as of the versions read for this draft, do not record it as done.
- **Relay's workflow UI was not independently inspected** — every Relay-side fact above comes
  solely from the handoff's own account, not from this dispatch re-checking Relay directly.
- **`secrets.env`'s values were not read** (correctly out of scope) — only its permission
  bits (600) were confirmed via `ls -l`, matching the handoff's claim.
- The memory-file path (HANDOFF §6) and `secrets.env` permissions are the **only two facts**
  in this draft independently re-verified against the live filesystem rather than taken from
  the handoff's own account (see §1's table, last two rows).
