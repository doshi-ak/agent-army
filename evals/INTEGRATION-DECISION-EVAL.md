# INTEGRATION-DECISION-EVAL — the integrate-direct vs keep-separate vs skip rubric

> **What this is.** A scoring rubric (owned by the Evaluator, Evelyn) that decides, for any
> candidate EXTERNAL integration, whether Agent Army should **(A) integrate it DIRECTLY**
> (build it into the server/plugin), **(B) keep it SEPARATE** (route to it vendor-agnostically,
> behind a seam), or **(C) SKIP** it. It also does an *incremental* analysis: what each
> additional integration adds vs. what it costs and risks.
>
> **Design, not code.** Nothing here writes or changes server code. It is a decision instrument
> plus an automatable check-set.
>
> **Canonical steer (binding).** `SCOPE-BOUNDARY.md` already ruled the archetypal case:
> Tavily is **OUT OF SCOPE** — "optional future research connector at most … 1 vendor-agnostic
> routing line in M3." That single sentence encodes the whole philosophy this rubric formalizes:
> **the smallest integration surface that meets the need wins; a vendor-agnostic routing line
> beats a direct build.** Every verdict below anchors to a specific section of the canonical
> docs (`SCOPE-BOUNDARY.md`; `PLAN.md` §3, §10.5–§10.7; `docs/RESOURCE-INTEGRATION-AUDIT.md`;
> `docs/M6-MANUS-RELAY-SPEC-DRAFT.md`).

---

## 0. The prime constraint every candidate is measured against

`PLAN.md` §3.8 (HARD CONSTRAINT): the server **"manages, tracks, and serves state; it never
runs models and never spawns agents."** No tool in §4 may execute an LLM call, and the Executor
must **reject** any block that crosses this line. `PLAN.md` §3.1 pins the transport to **local
stdio** ("a third party cannot query it server-side"), and §3.7 bans secrets from the repo,
plugin, and state files.

Consequences for integration decisions, stated up front so the rubric doesn't have to re-derive
them per row:

- Any integration whose value *is* "the server calls a model / runs an agent / does research
  inline" is a §3.8 violation on its face → it cannot be verdict A. At most it is B (the session
  or an external worker does the work; the server only records the result).
- Any integration that puts a live remote endpoint *inside the stdio server's request path*
  fights §3.1 → pressure toward B or C.
- Any integration carrying secrets into the repo/plugin/state → §3.7 violation → C unless the
  secret lives entirely outside the tracked surface (SaaS UI, `secrets.env` at `600`, etc.,
  per `M6-…SPEC-DRAFT.md` §4).

---

## 1. Scoring rubric (weighted, 0–100)

Seven criteria. Each scored 0–15 (raw), then multiplied by a weight, then normalized to 100.
**Higher total = safer to bring closer (toward A). Lower total = keep at arm's length (B) or
out (C).** Two criteria are *gates*: a 0 on either forces the verdict regardless of total.

| # | Criterion | Weight | What a HIGH score means | What a LOW score means | Anchor |
|---|---|---|---|---|---|
| C1 | **§3.8 boundary alignment** *(GATE)* | 0.22 | Integration only serves/records state; never asks the server to run a model or spawn an agent | The value proposition requires in-server model/agent execution | `PLAN.md` §3.8 |
| C2 | **Scope fit** | 0.18 | Named in `PLAN.md` as in-scope for a milestone | Not in `PLAN.md`; declared out-of-scope / predecessor | `SCOPE-BOUNDARY.md`; `PLAN.md` §7 |
| C3 | **Supply-chain / security risk** *(GATE)* | 0.16 | Pinned deps, no hooks, secrets external, official/first-party source | Unpinned `@latest`, hooks-enabled `.mcp.json`, secrets in tracked files, unverifiable aggregator source | `PLAN.md` §3.7, §10.6; `RESOURCE-INTEGRATION-AUDIT.md` rows 10, 15 |
| C4 | **Maintenance burden** | 0.12 | Zero standing infra; no server to run; no version drift we own | We host/run a service, chase upstream releases, own an auth loop | `PLAN.md` §10.6 SKIP rationale |
| C5 | **Token / context savings** | 0.12 | Materially offloads work off the Claude context (e.g. bulk grunt work to an external worker) | No measurable context/token benefit; net-neutral or additive | `PLAN.md` §10.7(a) |
| C6 | **Redundancy w/ existing capability** | 0.10 | Fills a genuine gap nothing else covers | Duplicates a capability the harness already has (state board, dispatch, dashboard) | `PLAN.md` §10.7; `RESOURCE-INTEGRATION-AUDIT.md` §3 |
| C7 | **Reversibility** | 0.10 | A routing line / role file we can delete in one commit; no data migration | Baked into schemas, tools, or the plugin's install path; costly to unwind | `PLAN.md` §5, §3.4 |

**Normalized score** = Σ(rawᵢ × weightᵢ) / 15 × 100.

### Verdict bands

| Band | Score | Default verdict | Meaning |
|---|---|---|---|
| **A — integrate direct** | ≥ 75 **and** no gate-zero | Build it in | Boundary-safe, in-scope, low-risk, fills a real gap, reversible enough to own |
| **B — keep separate / route** | 45–74 | Vendor-agnostic seam | Useful but should sit behind a routing line or an external-worker role — never hard-wired |
| **C — skip** | < 45 **or** any gate-zero (C1/C3) | Don't integrate | Boundary-crossing, out-of-scope, or unacceptable supply-chain risk |

**Tie-break toward the smaller surface.** When a candidate lands on a band boundary, the
canonical steer (`SCOPE-BOUNDARY.md`, Tavily line) breaks the tie **downward** — prefer B over
A, prefer C over B — unless a cited `PLAN.md` section explicitly promotes it.

---

## 2. Scored analysis table

Raw scores are 0–15 per criterion. **G** marks a gate criterion; a `0` there forces the verdict.

| Candidate | C1 §3.8 (G) | C2 scope | C3 sec (G) | C4 maint | C5 token | C6 redund | C7 revers | **Score** | **Verdict** | One-line rationale (anchored) |
|---|---|---|---|---|---|---|---|---|---|---|
| **Perplexity MCP** | 12 | 3 | 9 | 8 | 9 | 6 | 12 | **~56** | **B** | Research is session-side work, not server work (§3.8 holds since the server only *records* results); but it is **not in `PLAN.md`** and Akash himself scoped the Perplexity/research-routing idea as "separately related from this project" (`RESOURCE-INTEGRATION-AUDIT.md` §2). → one vendor-agnostic research-routing line, same treatment as Tavily; never a build dependency. |
| **Tavily MCP** | 12 | 2 | 9 | 8 | 9 | 5 | 13 | **~54** | **B** | Canonical steer is explicit: **OUT OF SCOPE**, "optional future research connector at most … 1 vendor-agnostic routing line in M3" (`SCOPE-BOUNDARY.md`). Boundary-safe (server records, doesn't research) but zero `PLAN.md` scope. → B by the same routing seam as Perplexity; interchangeable behind it. |
| **Manus (REST API worker)** | 13 | 11 | 8 | 7 | 14 | 11 | 10 | **~72** | **B** | Named in `PLAN.md` §10.7(a) as a `manus-worker` *role* that dispatches grunt work and logs to `PROGRESS.md` — pure §3.8-compatible (session/role dispatches; server only logs). Big C5 (context/token offload "exactly as Akash intends"). Stays B because it's a **role + adapter**, not a server-embedded client; `M6-…SPEC-DRAFT.md` §3 (M6.2) keeps it a role file + `progress_log` bridge, not a new server tool. |
| **Relay.app (webhook orchestration)** | 12 | 11 | 6 | 7 | 8 | 8 | 9 | **~62** | **B** | `PLAN.md` §10.7(b): "Relay.app webhook → `progress_log` ingestion so Relay-orchestrated flows appear on the same board." Ingestion is one-directional into our log (`M6-…SPEC-DRAFT.md` §2.3) — boundary-safe. C3 dinged: today secrets sit inline in Relay's Custom-HTTP URLs (`M6-…SPEC-DRAFT.md` §4) → must stay external, human-rotated. → B: an ingestion bridge, never a server dependency; hard limit stands ("Cowork can't be triggered externally," §10.7). |
| **Generic "direct third-party MCP" pattern** | 8 | 4 | 3 | 5 | 6 | 5 | 6 | **~38** | **C** | The pattern of hard-wiring an arbitrary third-party MCP as a build dependency fails C3 hard: `PLAN.md` §10.6 and `RESOURCE-INTEGRATION-AUDIT.md` rows 10/15 show the standing rule — unverifiable aggregator listings, hooks-enabled `.mcp.json`, unpinned `npx …@latest` are all disqualifiers; §10.6 SKIPs claude-hub / claude-code-webhook wholesale. → **C as a default pattern**; individual MCPs must earn a B/A on their own row, never inherit trust from "it's an MCP." |

*Score figures are the rubric's normalized outputs to the nearest integer; the exact value
matters less than the band and the anchored rationale, which are the load-bearing outputs.*

### Verdict summary

- **Perplexity MCP → B (~56)** — vendor-agnostic research routing line; out of `PLAN.md` scope, self-scoped-out by Akash.
- **Tavily MCP → B (~54)** — the canonical OUT-OF-SCOPE case; 1 routing line in M3, interchangeable with Perplexity.
- **Manus (REST worker) → B (~72)** — a `manus-worker` role + adapter per §10.7(a); highest score, still B (role, not server-embedded).
- **Relay.app → B (~62)** — one-directional `progress_log` ingestion per §10.7(b); secrets stay external.
- **Generic direct-MCP pattern → C (~38)** — default-skip; each MCP must earn its own row, no inherited trust.

**Read across the table:** *nothing* scores into band A. That is the intended result — the
§3.8 boundary plus the canonical steer mean the correct integration surface for every current
candidate is a **seam, a role, or a routing line**, not a server build. The rubric's job going
forward is to catch the day a candidate genuinely *does* clear 75 with no gate-zero.

---

## 3. Incremental analysis — smallest surface that meets the need

The question is never "is integration N good?" in isolation. It is: **given everything already
in the harness, what does adding N *marginally* buy, and at what marginal cost/risk?** The
harness already ships the capabilities that most integrations would otherwise justify:

- a **shared system of record** (`_team/STATE.md` / `PROGRESS.md` / `ROLES.md`, `PLAN.md` §5) —
  which `PLAN.md` §10.7 notes *is* the "task board" the Manus/Relay plan wanted;
- **session-side dispatch** (§3.8 — the hosting Claude dispatches agents);
- an **append-only log + auto-regenerating dashboard** (`PLAN.md` §4, DoD 7).

So each candidate is scored on *marginal* value against that baseline:

| Step (on top of baseline) | Marginal benefit | Marginal cost / risk | Smallest surface that captures the benefit |
|---|---|---|---|
| **+ Research connector (Tavily/Perplexity)** | Fresh external facts flow into session work | Two vendors ≈ same capability (C6 redundancy); each direct build adds an owned dep + auth (C4) | **One vendor-agnostic routing line** (`SCOPE-BOUNDARY.md`): the session calls *a* research tool; the server only logs the result. Adding the *second* vendor after the first is ~0 marginal benefit — the seam already abstracts them. |
| **+ Manus external worker** | Real context/token offload for bulk grunt work (C5=14) — the one candidate with a benefit the baseline can't self-serve | A role file + a one-directional log bridge; **no** new server tool, **no** second system of record (`M6-…SPEC-DRAFT.md` §2.2) | **A `manus-worker` role + `progress_log` ingestion** (§10.7, M6.2/M6.3). This is the largest justified surface — and it's still just a role file plus a bridge script, deletable in a commit. |
| **+ Relay.app orchestration** | External flows appear on the same board without us polling | Secrets currently in a SaaS UI (C3); another external service's uptime | **Webhook → `progress_log` ingestion only** (§10.7(b)). Marginal benefit *over Manus alone* is modest: it routes, it doesn't do new work. Justified only because the infra already exists (`M6-…SPEC-DRAFT.md` §0) — not worth building from zero. |
| **+ Another direct third-party MCP** | Case-by-case | Inherits the §10.6 supply-chain rule; each is a new attack surface + owned dep | **Nothing by default.** The generic pattern is C. A specific MCP must re-run this rubric and clear a band on its own evidence. |

**The through-line.** The marginal-value curve flattens fast. The research connectors are
redundant with each other behind one seam; Relay is largely redundant with Manus + the existing
board. Only the Manus worker adds a benefit the baseline can't produce itself (off-context bulk
work). Therefore the defensible integration set is: **one research routing line, one external-
worker role, one ingestion bridge — all reversible, none a server dependency.** This is exactly
the direction `SCOPE-BOUNDARY.md` and `PLAN.md` §10.7 already point; the rubric just makes the
"stop adding surface" decision legible and repeatable.

---

## 4. How this becomes a runnable eval

The rubric's verdicts reduce to **objective, read-only assertions** an automated check (a new
`evals/` case, or a CI step per `PLAN.md` §10.6(b)) can make against the repo and `PLAN.md`.
Each maps to a rubric criterion so a failure names the criterion it violated.

| # | Assertion (automatable) | Guards | Fails if… |
|---|---|---|---|
| A1 | **No external MCP is a hard build dependency.** Grep `PLAN.md` §7 milestone rows + `server/package.json` for any external-service client listed as required to build/boot. | C2 scope; C6 redundancy | A research/worker MCP appears in a milestone's *Owns/Acceptance* as required-to-build. |
| A2 | **Any research connector sits behind a vendor-agnostic seam, not hard-wired.** Assert that "Tavily"/"Perplexity"/"Manus" appear only as *routing lines / role files / ingestion bridges*, never as a named tool in `PLAN.md` §4's tool inventory. | C1 §3.8; C7 reversibility | A vendor name is baked into a §4 server tool or the plugin's install path. |
| A3 | **No unpinned installs.** Grep repo (esp. `.mcp.json`, plugin manifests, workflows) for `npx …@latest` or version-less package refs. | C3 supply-chain | Any `@latest` / unpinned dep is introduced (`PLAN.md` §10.6; `RESOURCE-INTEGRATION-AUDIT.md` row 15). |
| A4 | **No hooks in any shipped `.mcp.json` / plugin.** Assert plugin is skills-only (`PLAN.md` §3.4, §10.5 row 2) and no `.mcp.json` registers hooks. | C1; C3 | A hooks-enabled `.mcp.json` or a bundled hook appears. |
| A5 | **No secrets in tracked surface.** Grep repo + `_team/**` for keys/tokens; assert any integration's secret lives outside (SaaS UI / `secrets.env` `600`). | C3 (§3.7) | A key/token is committed, or lands in a state file or dispatch prompt (`M6-…SPEC-DRAFT.md` §4). |
| A6 | **No server tool executes an LLM call or spawns an agent.** Static assert over `server/src/**`: no model-SDK import in a §4 tool handler; `manager_tick` returns a *report*, not a dispatch. | C1 §3.8 (GATE) | Any §4 handler runs a model or spawns an agent — the one violation the Executor must reject (`PLAN.md` §3.8). |
| A7 | **External-worker ingestion is one-directional & idempotent.** Given a fixture Notion/webhook row reaching a terminal status, assert exactly one new `PROGRESS.md` line; re-poll adds none. | C1; C7 | A second identical event duplicates the log line (`M6-…SPEC-DRAFT.md` §3, M6.3 acceptance). |

**How a reviewer uses it.** For any *new* candidate integration, run this rubric to produce a
score + band, then confirm A1–A7 still pass with the candidate's proposed surface. If the
candidate can only be made to work by failing one of A2/A3/A4/A5/A6, its real verdict is C —
regardless of how attractive its raw benefit looked. The gate criteria (C1, C3) and their
assertions (A6, A3/A4/A5) are the hard floor; everything else is where judgment lives.

---

*Anchors cited: `SCOPE-BOUNDARY.md` (Tavily OUT-OF-SCOPE line, scanner rule); `PLAN.md` §3.1
(local stdio), §3.4 (skills-only, no bundled hooks), §3.7 (no secrets), §3.8 (no-models/
no-spawn HARD CONSTRAINT), §4 (tool inventory), §5 (state schemas = the board), §7 (milestones),
§10.5 (four-source skill architecture; superpowers hooks refused), §10.6 (ADOPT/SKIP/LATER
verdicts; supply-chain rules), §10.7 (Manus + Relay second automation pathway);
`docs/RESOURCE-INTEGRATION-AUDIT.md` rows 10/11/15 + §2 (Perplexity self-scoped-out) + §3
(no-duplication); `docs/M6-MANUS-RELAY-SPEC-DRAFT.md` §2 (one system of record), §3 (M6.2/M6.3
role + bridge), §4 (human-gate + secrets-external).*
