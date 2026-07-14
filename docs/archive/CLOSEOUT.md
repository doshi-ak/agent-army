# CLOSEOUT & HANDOFF — Multi-Agent MCP Build Exploration

> **Purpose:** This is a self-contained handoff document. It captures a Claude Cowork session so the work can be picked back up cold — specifically, so it can be **migrated into a Claude Code session**. Everything needed to resume lives in this file. If you are reading this to revive the project, start at [§12 How to Revive](#12-how-to-revive-in-claude-code) and paste the block in [§13](#13-paste-ready-revival-prompt).

- **Document created:** 2026-07-05
- **Source interface:** Claude Cowork (desktop, research-preview)
- **Target interface:** Claude Code
- **Status:** **CLOSED WITH OPEN ITEMS** — planning/research stage; no code written yet, key direction decision still pending
- **Working / connected folder:** `/Users/doshi/claude-mcp-servers` (a.k.a. `~/mcp-servers`)
- **User:** Akash (`4t8c26bxkk@privaterelay.appleid.com`)

---

## 1. Executive Summary

The session began as an MCP-server build (`/mcp-builder` skill) driven by an uploaded guide on **parallelizing MCP builds with an Agent Team**. Over the course of the conversation the goal was **re-scoped twice**:

1. Started as "build one MCP server, possibly with a Full Agent Team."
2. A candidate target — **ChatGPT Atlas** — was investigated and found **not viable as an MCP wrap target** (no public API, no AppleScript, it is itself an MCP *client*).
3. The user then clarified their **actual** goal: a **general-purpose multi-agent *system*** that can tackle varied tasks across their existing MCP servers, skills, connectors, and apps — i.e. an **orchestration layer**, not a single MCP server.

**No code, artifacts, or scheduled tasks were produced.** The concrete outputs so far are decisions, research findings, and a recommended build shape (agent definitions + orchestration spec, optionally packaged as a plugin). The single open decision is **which deliverable form to build**.

---

## 2. Contextual Information

### 2.1 Environment at time of session
| Item | Value |
|---|---|
| Date | 2026-07-05 (Sunday) |
| Interface | Claude Cowork (research preview; built on Claude Code / Claude Agent SDK) |
| Model | Claude Opus 4.8 (`claude-opus-4-8`) |
| Connected folder | `/Users/doshi/claude-mcp-servers` → maps to `~/mcp-servers` |
| Sandbox mount (bash) | `/sessions/<id>/mnt/claude-mcp-servers/` |
| User preference | Concise, direct, minimal formatting |

### 2.2 Persistent project rules (from repo `CLAUDE.md`)
The repo's `CLAUDE.md` is a standing rule block for `~/mcp-servers/`. Its load-bearing rules:

- **Rule 1 — Local vs Remote (run FIRST):**
  - Local access path (local files/DB, AppleScript/JXA/EventKit, macOS `x-callback-url`/custom URL scheme, local sockets, OS-only APIs → a third party *cannot* query it server-side) → **LOCAL MCP over stdio**.
  - Cloud/HTTP API queryable server-side with a credential (`https://api.*`, REST/GraphQL, SaaS) → **REMOTE MCP over Streamable HTTP**.
- **Rule 2 — TypeScript SDK gotchas:** custom tool-result interfaces MUST include `[key: string]: unknown;` (SDK `CallToolResult` has a string index signature) or `tsc` fails; register tools with a **ZodRawShape** (`{ field: zodType }`) not `z.object().strict()/.refine()` — do strict/cross-field validation inside the handler.
- **Rule 3 — Verify before done:** `npm install && npm run build` must pass **on the target platform** (node_modules are platform-specific — esbuild/tsx native binaries won't cross macOS↔Linux); boot server, confirm it lists tools. Current Notion API header: `Notion-Version: 2026-03-11`.
- **Plugins vs servers:** an MCP *server* = the tools; a Cowork *plugin* = skills (+ optional bundled server). Prefer **skills-only plugins** that reuse a separately-connected server (bundling a local stdio server can trip plugin validation).

### 2.3 Auto-memory carried into session
- `mcp-local-vs-remote-rule` — mirror of Rule 1 above.
- `mcp-sdk-concurrent-tool-calls` — the SDK runs batched tool calls concurrently; sequence dependent calls in tests, fail-fast on errors in stateful servers.

---

## 3. Completed Work & Deliverables

| # | Deliverable | Type | Location / State |
|---|---|---|---|
| 1 | Loaded `mcp-builder` skill & reviewed its 4-phase workflow | Process | n/a (in-session) |
| 2 | Requirements gathering (target / approach / language) | Decision | See §4 |
| 3 | Inventory of existing MCP servers in `~/mcp-servers` | Research | See §7.1 |
| 4 | Research on ChatGPT Atlas as an MCP target | Research | See §5 |
| 5 | Local-vs-remote classification for the Atlas idea | Decision | Local stdio (CDP) — see §5.3 |
| 6 | Re-scope to a general multi-agent system + explanation of deliverable forms | Decision/Doc | See §6 |
| 7 | **This CLOSEOUT/handoff document** | Doc | `/Users/doshi/claude-mcp-servers/CLOSEOUT.md` |

**No source code, no compiled server, no plugin, no artifact, and no scheduled task were created in this session.**

---

## 4. Decisions Made (with rationale)

| Decision | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** | Best SDK support; repo default per `CLAUDE.md`; models generate TS well. |
| Build approach (initial) | Full Agent Team (requested) | User's uploaded guide favored parallelizing across teammates. |
| Build approach (revised) | **Single session** for any concrete server; **agent definitions + orchestration spec** for the real goal | Atlas server would be ~8 tools sharing one client → team not warranted (guide's Section 1 gate). General multi-agent system is orchestration, not one server. |
| Target service | Undecided → Atlas proposed → **Atlas rejected as wrap target** | See §5. |
| **Real goal (clarified)** | **General multi-agent orchestration system across existing tools** | User: "multi-agent system that can tackle a variety of tasks across different MCP-servers, skills, connectors, and applications." |
| Recommended deliverable | **Agent definitions + short orchestration spec first; package as a plugin later** | Working system now without premature packaging overhead. |

---

## 5. ChatGPT Atlas Investigation (research findings)

### 5.1 What Atlas is
OpenAI's **Chromium-based AI browser**, launched 2025-10-21, macOS-first (Windows/iOS/Android later). ChatGPT is embedded via a sidebar assistant; paid "agent mode" can act on pages.

### 5.2 Why it is **not** a viable MCP wrap target
| Blocker | Detail | Consequence |
|---|---|---|
| No public API | OpenAI has not shipped a developer API, agent hooks, or URL scheme for controlling Atlas. | Cannot build a **remote** MCP wrapping a cloud API. |
| No AppleScript | Atlas reportedly exposes **no AppleScript dictionary** (unlike Safari/Chrome). | The local-automation path used by the Bear / Notion-Calendar servers does not apply. |
| Atlas is an MCP **client** | You connect MCP servers *into* Atlas (e.g. Apify, Bright Data); it does not expose tools to wrap. | "MCP server for Atlas" is a category error for the common case. |
| Internal control locked down | Only internal channel is **Mojo IPC**, restricted to `*.openai.com` / `*.chatgpt.com` origins. | No third-party programmatic surface. |

### 5.3 The only realistic build (if pursued)
A **LOCAL stdio MCP** that drives Atlas over the **Chrome DevTools Protocol (CDP)** — launch Atlas with `--remote-debugging-port=9222`, then control tabs / navigation / page text / DOM / screenshots. CDP is a localhost socket → a third party can't reach it server-side → **local stdio per `CLAUDE.md` Rule 1**. Caveats: ~8 tools (too small for a team); heavily overlaps the existing **Claude-in-Chrome** tooling; and **it is UNVERIFIED that Atlas honors `--remote-debugging-port`**.

### 5.4 Sources
- OpenAI — Introducing ChatGPT Atlas: https://openai.com/index/introducing-chatgpt-atlas/
- OpenAI — Building ChatGPT Atlas (OWL architecture): https://openai.com/index/building-chatgpt-atlas/
- Wikipedia — ChatGPT Atlas: https://en.wikipedia.org/wiki/ChatGPT_Atlas
- Hacktron AI — Pwning OpenAI Atlas Through Exposed Browser Internals (Mojo IPC detail): https://www.hacktron.ai/blog/hacking-openai-atlas-browser/
- Apify — Use Apify MCP servers inside ChatGPT Atlas (Atlas as MCP client): https://blog.apify.com/apify-mcp-chatgpt-atlas/
- Michael Tsai — ChatGPT Atlas (no AppleScript / Chromium notes): https://mjtsai.com/blog/2025/10/22/chatgpt-atlas/

---

## 6. The Re-Scoped Goal — General Multi-Agent System

**Key clarification from the user:** a multi-agent system does **not** require a specific application and does **not** require building a new MCP server. It is an **orchestration layer** over tools already connected. The lead agent inherits every connected MCP server, skill, and connector, and fans work out to specialized teammates/subagents, each scoped to the subset of tools its task needs.

### 6.1 Deliverable forms explained (lightest → most packaged)
| Form | What it is | Pros | Cons |
|---|---|---|---|
| **Orchestration spec / `CLAUDE.md`** | Written playbook the lead reads each session (roles, routing, coordination rules). | Fast; no code; shapes behavior. | Guidance only; nothing runs autonomously; lives in one folder. |
| **Specialized agent definitions** | Reusable subagent "roles" (Researcher, Inbox-ops, Finance, Writer), each a file with description + allowed tools + model. | The actual multi-agent core; parallelizable; each agent sees only relevant tools (cleaner/cheaper). | Needs a spec to know *when* to dispatch them. |
| **Cowork/Code plugin** | Installable bundle (`.plugin`) of skills + agent defs + connector config. | Portable/shareable across sessions & machines. | More upfront work; skills-only is cleanest (per `CLAUDE.md`). |

### 6.2 Recommended shape
**Agent definitions + a short orchestration spec** (the working system), packaged into a **plugin** only once proven. These stack: agent defs = the workers; `CLAUDE.md` = routing rules; plugin = portable wrapper.

### 6.3 Suggested candidate agent roles (proposed, not yet built)
- **Researcher** — web search/fetch + docs/notes connectors; produces cited briefs.
- **Inbox & comms ops** — Gmail/Slack/Calendar triage; routes items into Notion/Linear/Asana.
- **Finance & markets** — Robinhood/Kalshi/S&P data; portfolio snapshots.
- **Build & automate** — code, MCP-server/plugin builds, scheduled tasks, dashboards.

*(User selected primary use-cases via multi-select but the answer set was not captured before the re-scope; confirm on revival — see §9 Pending.)*

---

## 7. Plugins, Skills, Connectors, MCPs & APIs

> Reproduction note: none of these were *created* this session. This is an inventory of what was **present/available**, so the environment can be understood and rebuilt. Items marked **auth-required** were reported by the runtime as needing OAuth before use.

### 7.1 Existing MCP servers in `~/mcp-servers` (the user's own builds)
| Server | Folder | Local/Remote | Access path | Notes |
|---|---|---|---|---|
| Bear | `bear-mcp-server/` | **Local (stdio)** | Local Bear SQLite DB + x-callback-url | Has `dist/`, `test/`, `evaluation/`; packaged as `bear.mcpb`. |
| Notion Calendar | `notion-calendar-mcp-server/` | **Local (stdio)** | `cron://` x-callback-url + macOS EventKit | No Notion Calendar cloud API exists. Has `evaluation.xml`. |
| Notion | `notion-mcp-server/` | **Remote (HTTP)** | `https://api.notion.com/v1` (bearer) | Header `Notion-Version: 2026-03-11`. Has `evaluation.xml`. |
| Robinhood | `robinhood-mcp-server/` | **Remote (HTTP)** | Cloud HTTP API | Has `dist/`, `evaluation.xml`. |
| (support) | `notion-calendar/` | — | — | `README.md` + `skills/` (skills-only companion). |
| (build) | `.bear-mcpb-build/`, `bear.mcpb` | — | — | MCPB build artifacts. |

### 7.2 Cowork plugins observed as connected/available
`bear-notes`, `kalshi-cowork`, `robinhood-cowork`, `productivity` (asana, atlassian, clickup, linear, monday, notion, slack), `sp-global`, `data` (amplitude, bigquery, hex, definite, snowflake, databricks…), `design` (gmail, gcal, figma), `finance`, `legal` (box, docusign, egnyte), `product-management` (intercom, pendo, figma), `sales` (apollo, clay, close, fireflies, hubspot, outreach, similarweb, zoominfo), `desktop-commander`, `cowork-plugin-management`, `vpai`.

### 7.3 Skills referenced/loaded
- **`mcp-builder`** (loaded) — 4-phase MCP build guide: Phase 1 Research/Plan → Phase 2 Implement → Phase 3 Review/Test → Phase 4 Evaluate (10-question XML eval set). Base dir: `.../skills/mcp-builder`.
- **`close-out-project`** (loaded — produced this doc).
- Output-format skills available: `docx`, `pdf`, `pptx`, `xlsx`, `canvas-design`, `theme-factory`, `web-artifacts-builder`.

### 7.4 Connectors / tool servers observed
Gmail, Google Calendar, Notion (cloud), Box/Drive file MCP, Canva, Gamma, Word (By Anthropic), iMessage (Read/Send), Claude-in-Chrome, computer-use, MacOS-MCP, Kalshi, Robinhood, Bear, Desktop Commander.

### 7.5 Kalshi MCP (bundled by `kalshi-cowork` plugin)
- **Tool namespace:** `mcp__plugin_kalshi-cowork_kalshi__*`
- **Representative tools:** `kalshi_get_balance`, `kalshi_get_positions`, `kalshi_get_orders`, `kalshi_get_fills`, `kalshi_get_settlements`, `kalshi_get_markets`, `kalshi_get_market`, `kalshi_get_market_orderbook`, `kalshi_get_market_candlesticks`, `kalshi_get_events`, `kalshi_get_event`, `kalshi_get_series`, `kalshi_get_trades`, `kalshi_get_milestones`, `kalshi_create_order`, `kalshi_amend_order`, `kalshi_cancel_order`, `kalshi_decrease_order`, `kalshi_batch_create_orders`, `kalshi_batch_cancel_orders`, `kalshi_request` (raw), plus CFB index tools.
- **API base URL (Kalshi Trade API v2):** `https://api.elections.kalshi.com/trade-api/v2` (confirm against the plugin's server config).
- **Auth:** API key ID + RSA private-key request signing (Kalshi API-key scheme). **Not configured in this session.** Read-only vs trade-enabled is a connector setting — the `kalshi-trade` skill only places/cancels on explicit confirmation.
- **Version:** **UNKNOWN** — not surfaced in-session. Verify from the plugin manifest / `package.json`. See §9 Pending.

---

## 8. Errors / Defects

### 8.1 Encountered
| ID | Description | Severity |
|---|---|---|
| E1 | ChatGPT Atlas has no public API / no AppleScript / is an MCP client → cannot be wrapped as a normal MCP target. | Blocker (for that target) |
| E2 | Full Agent Team was requested but is not warranted for the realistic Atlas server (~8 tools, shared client). | Design mismatch |
| E3 | Numerous plugin MCP servers reported **auth-required** (OAuth) and could not be used in this non-interactive session (asana, atlassian, clickup, linear, monday, slack, hubspot, box, docusign, spglobal, etc.). | Env limitation |
| E4 | Several MCP servers **disconnected mid-session** (Claude-in-Chrome, Macos, desktop-commander, productivity:*). Some later reconnected. | Transient runtime |
| E5 | User's selected primary use-cases (multi-select) were not captured before the re-scope. | Info gap |

### 8.2 Resolved
| ID | Resolution |
|---|---|
| E1 | Reframed: identified CDP-based **local stdio** as the only viable path *if* Atlas is pursued, and surfaced the blocker to the user before any code. |
| E2 | Applied the guide's Section 1 gate → recommended single-session, and pivoted to the correct abstraction (agent system, not one server). |
| E4 | No action needed for this doc-writing task; scheduled-tasks and artifacts tools were reachable and used successfully. |

### 8.3 Pending (not yet resolved)
| ID | Open item | Needed to close |
|---|---|---|
| P1 | **Direction decision** — which deliverable form to build (agent defs + spec vs plugin). | User confirmation. |
| P2 | Atlas CDP feasibility — does Atlas honor `--remote-debugging-port`? | Only relevant if Atlas path is chosen; verify empirically. |
| P3 | Kalshi MCP / Claude Code / dependency **versions** unknown. | Run `claude --version`; read `package.json` / plugin manifests. |
| P4 | Auth-required connectors not authorized. | Authorize via claude.ai connector settings or `claude mcp` / `/mcp` in an interactive session. |
| P5 | Primary use-case set for the agent system not captured. | Re-ask on revival (§6.3). |

---

## 9. Clarifications Requested by the Task (answered honestly)

1. **Plugins/skills/connectors used:** Skills actually invoked: `mcp-builder`, `close-out-project`. Tools actually called: `WebSearch`, workspace `bash` (dir inventory), `list_scheduled_tasks`, `list_artifacts`. Everything else in §7 was *available*, not *used*. No connector performed a data operation for the build.
2. **Versions (Kalshi MCP / Claude Code / libs):** **Not determined in-session — UNKNOWN.** Do not assume. Verify from `claude --version` and the relevant `package.json` / plugin manifest before relying on any behavior.
3. **API endpoint configs:** No API endpoint was configured. ChatGPT Atlas exposes none. Kalshi base URL/auth scheme noted in §7.5 but was not wired up. The user's existing servers' endpoints are summarized in §7.1.
4. **Custom MCP definitions/extensions created:** **None.**

---

## 10. Code Snippets & Configuration (reference scaffolding — none of this was written yet)

> These are **starter templates** consistent with the repo's `CLAUDE.md` rules, provided so the build can begin immediately in Claude Code. They are illustrative, not tested.

### 10.1 Specialized agent definition (Claude Code `.claude/agents/researcher.md`)
```markdown
---
name: researcher
description: Fan-out web + connector research; verify claims; return a cited brief. Use for any multi-source research question.
tools: WebSearch, WebFetch, Read, Grep, Glob
model: sonnet
---
You are a research specialist. Given a question:
1. Decompose into sub-questions.
2. Search/fetch multiple independent sources.
3. Cross-check conflicting claims; prefer primary sources.
4. Return a concise, cited summary — never assert an unsourced fact.
Do not edit files. Report findings only.
```

### 10.2 Orchestration spec (append to repo `CLAUDE.md` or a routing section)
```markdown
## Multi-agent routing
- Research task  -> dispatch `researcher` (parallelize N sub-questions).
- Inbox/comms    -> dispatch `inbox-ops` (Gmail/Slack/Calendar; route to Notion/Linear/Asana).
- Finance/markets-> dispatch `finance` (Robinhood/Kalshi/S&P; read-only unless confirmed).
- Build/automate -> main context or `builder`; follow ~/mcp-servers/CLAUDE.md rules.
Rules: one owner per work-stream; teammates do NOT inherit conversation history —
every dispatch prompt must be self-contained.
```

### 10.3 Minimal TypeScript **local stdio** MCP server (if the Atlas-via-CDP path is chosen)
```typescript
// src/index.ts  — respects CLAUDE.md Rule 1 (local socket -> stdio) & Rule 2 (index signature; ZodRawShape)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

interface ToolResult { [key: string]: unknown; content: { type: "text"; text: string }[]; }

const server = new McpServer({ name: "atlas-cdp", version: "0.1.0" });

// Register with a ZodRawShape ({ field: zodType }), NOT z.object().strict()
server.registerTool(
  "atlas_list_tabs",
  {
    description: "List open tabs in ChatGPT Atlas via Chrome DevTools Protocol.",
    inputSchema: {},                 // ZodRawShape
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async (): Promise<ToolResult> => {
    // Precondition: Atlas launched with --remote-debugging-port=9222 (UNVERIFIED it supports this)
    const res = await fetch("http://127.0.0.1:9222/json");
    const tabs = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(tabs, null, 2) }] };
  }
);

await server.connect(new StdioServerTransport());
```

### 10.4 Local stdio server registration (Claude Code `.mcp.json` / `claude mcp add`)
```json
{
  "mcpServers": {
    "atlas-cdp": {
      "command": "node",
      "args": ["/Users/doshi/claude-mcp-servers/atlas-cdp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 10.5 Build & verify (per CLAUDE.md Rule 3 — run on the target platform)
```bash
cd ~/mcp-servers/atlas-cdp
npm install && npm run build          # tsc must pass
npx @modelcontextprotocol/inspector node dist/index.js   # confirm it lists its tools
```

---

## 11. Security & Safety Notes (to prevent vulnerabilities / runtime errors)

- **Least privilege per agent:** scope each agent definition's `tools:` to only what its role needs (avoids an over-permissioned agent misusing finance/comms tools).
- **Finance guardrail:** never auto-place trades or move money. Kalshi/Robinhood order tools must require explicit user confirmation; keep connectors read-only unless deliberately enabled.
- **No secrets in code or this doc:** Kalshi uses an API-key ID + RSA private key; store via env/OS keychain, never in repo. This file intentionally contains no tokens.
- **Platform-specific `node_modules`:** do not copy `node_modules`/`dist` between macOS and Linux — rebuild on target (esbuild/tsx native binaries). Relevant when migrating to a Code session on a different host.
- **Local vs remote correctness:** a mis-classified server (e.g. shipping a localhost-only CDP server as a "remote" connector) will fail at runtime — a Cowork connector must be publicly reachable; CDP/localhost cannot be a remote connector.
- **Link safety:** treat links in emails/messages as suspicious; verify full URLs before navigating.

---

## 12. How to Revive (in Claude Code)

1. Open the repo `~/mcp-servers` in Claude Code (it auto-loads `CLAUDE.md`).
2. Either reference this file in your prompt or `@import`/append it into `CLAUDE.md` so it loads each session (Code does **not** auto-read `CLOSEOUT.md`).
3. Answer the **open decision** first: which deliverable form (§6.2 recommends agent defs + spec).
4. If agent defs: create `.claude/agents/*.md` for the roles in §6.3; add the routing block from §10.2.
5. Resolve pending items P3–P5 (versions, auth, use-cases) as needed.
6. Only pursue the Atlas-CDP server (§10.3) if the user explicitly wants it *and* P2 is verified.

**First concrete action to resume:** confirm the deliverable form (P1), then scaffold `.claude/agents/researcher.md` from §10.1.

---

## 13. Paste-Ready Revival Prompt

```
You are resuming a project from a handoff document (CLOSEOUT.md, closed 2026-07-05).
Read CLOSEOUT.md in full first. It describes a re-scoped goal: build a GENERAL
MULTI-AGENT SYSTEM (orchestration over existing MCP servers/skills/connectors),
NOT a single MCP server, and NOT anything tied to ChatGPT Atlas (which was
investigated and rejected as a wrap target — see §5).

Before doing any work, confirm with me:
1. Which deliverable form to build — recommended: specialized agent definitions +
   a short orchestration spec, packaged as a plugin only once proven (§6.2).
2. Which primary use-cases matter most (§6.3): research, inbox/comms ops,
   finance/markets, build/automate.
3. Whether anything has changed since 2026-07-05.

Then follow ~/mcp-servers/CLAUDE.md rules (local-vs-remote, TS SDK gotchas,
build-verify) for any server code. Do not resurrect the Atlas path unless I ask.
```

---

## 14. Cleanup Audit

| Leftover | Belongs to this project? | Action |
|---|---|---|
| Scheduled tasks (30 present) | **No** — all pre-existing (homestead, 1040-X, Kalshi weekly, briefings, etc.) | **Keep all.** None created here. |
| Artifacts (13 present) | **No** — all pre-existing (Asia itinerary, prediction dashboards, money tracker, etc.) | **Keep all.** None created here. |
| Files | Only this `CLOSEOUT.md` | Keep. |

No deletions, disables, or archives required — this exploration created no leftovers.

---

## 15. Assumptions (inferred, not confirmed)

1. The migration target is a Claude Code session **in the `~/mcp-servers` repo** (inferred from the connected folder + repo `CLAUDE.md`).
2. `CLOSEOUT.md` was placed at the repo root; adjust if the multi-agent work should live elsewhere.
3. Kalshi base URL `https://api.elections.kalshi.com/trade-api/v2` and API-key/RSA-signing auth are Kalshi's standard scheme; the **actual** plugin config was not inspected.
4. Versions (Kalshi MCP, Claude Code, Node, `@modelcontextprotocol/sdk`) are **UNKNOWN**; every version reference is a placeholder to verify.
5. The code in §10 is **untested scaffolding** consistent with repo rules, not delivered/working code.
6. The user's multi-select primary use-cases defaulted to the four proposed roles; treat §6.3 as provisional until reconfirmed.
7. "Full Agent Team" remains the user's stated preference in principle, but is recommended **against** for the current (small/undecided) scope.
8. No connector data operations were assumed successful, since most required un-completed OAuth.

---

## 16. Verification Checklist

- [x] **Context** — environment, repo rules, memory captured (§2).
- [x] **Completed work** — enumerated with locations/state (§3).
- [x] **Deliverables** — listed; honestly noted that no code/artifacts were produced (§3).
- [x] **Errors encountered** — §8.1.
- [x] **Errors resolved** — §8.2.
- [x] **Errors pending** — §8.3 (P1–P5).
- [x] **Plugins** — inventory + roles (§7.2, §7.3).
- [x] **Skills** — loaded vs available (§7.3).
- [x] **Connectors** — inventory + auth status (§7.4, P4).
- [x] **MCPs** — existing repo servers + local/remote classification (§7.1); Kalshi detail (§7.5).
- [x] **APIs** — Atlas (none), Kalshi (base URL/auth), Notion header (§5, §7.5, §2.2).
- [x] **Code snippets / config / usage** — agent def, orchestration spec, TS server, `.mcp.json`, build cmds (§10).
- [x] **Assumptions** — §15.
- [x] **Revival path** — §12 + paste-ready prompt §13.
- [ ] **Direction decision (P1)** — OPEN; owner: user.
- [ ] **Versions (P3)** — OPEN; verify in Code session.
- [ ] **Connector auth (P4)** — OPEN; authorize interactively.

---
*End of CLOSEOUT.md — self-contained handoff, generated 2026-07-05.*
