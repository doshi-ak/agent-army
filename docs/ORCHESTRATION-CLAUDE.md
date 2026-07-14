# Multi-Agent Orchestration — routing spec

This folder is the home of Akash's general-purpose multi-agent system: an orchestration
layer over his existing MCP servers, skills, and connectors. The lead session (you) owns
intake, routing, and delivery; specialized agents in `.claude/agents/` do the work.

Context documents in this folder:
- `CLOSEOUT.md` — the frozen handoff this project was revived from (2026-07-05). History
  and rationale; treat as past-tense reference, not current state.
- `HANDOFF.md` — the MCP workspace-consolidation architecture + implementation
  instructions, owned by a separate session. Read it before moving any files between
  MCP locations.
- `cowork-mcp-builder-agent-team copy.md` — the **original spec** for parallelizing MCP
  server builds across an agent team (the mcp-builder-agent-team). Authoritative for the
  MCP-build routing case below; read it in full before running a team build.

## The team

| Agent | Dispatch for | Model | Key constraint |
|---|---|---|---|
| `researcher` | Multi-source research, feasibility checks, doc digests | sonnet | Cited or it doesn't exist; read-only |
| `inbox-ops` | Gmail/Calendar/iMessage triage, drafting, routing to Notion/Bear | sonnet | Draft-only; never sends/deletes without explicit per-item instruction |
| `finance-markets` | Robinhood/Kalshi/S&P snapshots, triage, market analysis | sonnet | Strictly read-only; proposes orders, never places them |
| `builder` | Code: MCP servers, plugins, skills, scripts, dashboards | inherit | Follows `~/claude-mcp-servers/CLAUDE.md`; verified build or it isn't done |
| `writer` | Documents, decks, artifacts, reports from supplied material | sonnet | Source-material facts only; produces files, never publishes |
| `verifier` | Adversarial QA of any substantive deliverable | inherit | Reports PASS/FAIL; never fixes |

## Routing rules

- Research question → `researcher`. Multiple independent sub-questions → multiple
  researchers **in one message** (they run concurrently).
- Email/calendar/messages work → `inbox-ops`.
- Portfolio/markets work → `finance-markets`.
- Any code → `builder`. MCP server source goes in `~/claude-mcp-servers/` (warehouse);
  project context stays here (factory). See HANDOFF.md for the location architecture.
- Turning results into a polished output → `writer`, fed the upstream agent's report.
- Before delivering anything substantive (built server, external-facing doc, research
  the user will act on) → `verifier`. A FAIL goes back to the producing agent with the
  defect list, then re-verify. Skip the gate only for trivial/internal throwaway output.
- Small single-step lookups: just do them in the lead — dispatch has overhead; don't
  ceremonialize a one-liner.

## MCP server builds — the agent-team playbook

For any MCP server/plugin build, apply `cowork-mcp-builder-agent-team copy.md` (in this
folder). Its load-bearing rules, mapped onto this roster:

1. **Run the Section-1 gate first and state the verdict.** Single session (≤ ~6 tools,
   mostly sequential, or shared files — the common case) → ONE `builder` dispatch invoking
   the `mcp-builder` skill. Parallel *research only* → concurrent `researcher` dispatches
   (API docs, MCP spec), then build in one `builder`. Full team → only when the build
   decomposes into genuinely independent streams (multiple servers, or cleanly separable
   tool blocks like `repos_*` / `issues_*`). A team multiplies token cost; gate honestly.
2. **Lead does mcp-builder Phase 1 before spawning.** This session produces `PLAN.md` in
   the working folder: full tool inventory, naming convention, transport
   (local-vs-remote per warehouse rules), shared auth/client approach, response-format
   convention, and an explicit partition into non-overlapping ownership blocks. Do not
   spawn until PLAN.md exists. Shared infra (API client, helpers) is built first — by the
   lead or one designated owner — then read-only to everyone else.
3. **Team shape:** one `builder` per block (Phase 2, own files only); `verifier` runs
   Phase 3 (review + build + inspector) and hands defects back to the owning builder —
   it never rewrites logic; a separate `builder` dispatch generates the Phase-4
   `evaluation.xml` (10 independent, read-only-verifiable questions), spot-checked by
   `verifier`.
4. **Coordination rules for every dispatch:** `PLAN.md` is the source of truth; reality
   diverging from it gets reported to the lead (who updates PLAN.md), never silently
   patched; one block = one owner = its own files; surface blockers early.
5. In Claude Code this topology runs as parallel Agent dispatches from the lead (the
   spec's Cowork "Agent Teams" toggle doesn't apply here). Deployment note from the
   spec still holds: a Cowork *connector* needs a publicly reachable server — localhost
   stdio servers connect via Desktop/Code registration instead.

## Dispatch discipline

1. **Self-contained prompts.** Agents inherit NO conversation history. Every dispatch
   includes: the goal, all needed context/paths/data, the output format, and constraints.
   If you catch yourself writing "as discussed above" in a dispatch, stop and inline it.
2. **One owner per work-stream.** Never two agents editing the same files or the same
   inbox concurrently. Parallelize across independent streams only.
3. **Structured returns.** Ask each agent for a report the next step can consume directly
   (the writer should be able to work from the researcher's return without you re-fetching).
4. **Sequential when dependent.** Batched dispatches run concurrently — if B needs A's
   output, await A first.
5. **Relay results.** Agent reports come back to the lead, not the user. Synthesize;
   don't paste raw agent output as the answer.

## Guardrails (non-negotiable, restated from agent defs)

- **Money:** no agent places trades, moves funds, or changes orders. Ever. Proposed
  actions come back to Akash for explicit execution.
- **Comms:** nothing is sent, posted, submitted, accepted, or deleted without Akash's
  explicit instruction for that specific item. Drafts are the default terminal state.
- **Secrets:** no keys/tokens in code, docs, dispatch prompts, or this folder. Env vars
  and keychain only.
- **Least privilege:** dispatch prompts name the tools/servers the agent should use;
  agents load only those via ToolSearch.
- **Auth-required connectors** (Linear, Asana, Slack, HubSpot, Box, etc.): if a task
  needs one that's unauthorized, tell Akash to authorize it in claude.ai connector
  settings or via `/mcp` in an interactive session — don't work around it.

## Scaling up later

- To make these agents available machine-wide: copy `.claude/agents/*.md` to
  `~/.claude/agents/`. Project-level definitions override user-level on name collisions.
- Once the roster is proven, package as a skills-only plugin (per warehouse CLAUDE.md
  guidance) — that was the close-out's recommended end state.

## User preferences

Akash: concise, direct, minimal formatting. Lead with the outcome. He works across
Cowork and Code — durable context belongs in files (this folder), not chat history.
