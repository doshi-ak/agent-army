# Prompt Instructions — Multi-Agent MCP Server Builds in Claude Cowork

**Use with:** the `mcp-builder` skill (code-generation guide; four phases — Research/Plan → Implement → Review/Test → Evaluate). **Purpose:** parallelize an MCP server build across an Agent Team without the teammates stepping on each other, then deploy and connect the result back into Cowork.

Paste this as a project instruction or at the top of a session. Fill the bracketed slots before running.

---

## 0\. Inputs (fill these in)

- **Target service / API:** `[name + docs URL]`  
- **Language:** TypeScript (default — best SDK support) or `[Python]`  
- **Tool scope:** `[list the operations the server must cover]`  
- **Deployment target:** `[where the built server will run — must be publicly reachable for a Cowork connector]`

---

## 1\. Decide whether a team is even warranted (gate before spawning)

Run this check first and state the verdict out loud:

- **Single session** if the server is small (≤ \~6 tools), the work is mostly sequential, or teammates would edit the same files. This is the common case for one straightforward server.  
- **Subagents** (lead delegates, no peer-to-peer) if you want parallel *research only* — e.g. reading the API docs and the MCP spec concurrently — then implement in the main context.  
- **Agent Team** only when the build genuinely decomposes into independent streams that benefit from running at once: multiple servers, or one server whose tool groups are cleanly separable (e.g. `repos_*`, `issues_*`, `actions_*` each owned by a teammate).

An Agent Team uses several times the tokens of a single session (each teammate has its own context window). Three teammates is a reasonable starting point for roughly 15 tasks' worth of work. Scale up only if it's measurably cutting wall-clock time, not just multiplying cost.

If the verdict is "single session" or "subagents," ignore the rest of this and just invoke `mcp-builder` directly.

---

## 2\. Setup / preconditions

- **Enable Agent Teams.** They're experimental and off by default; enable by setting the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` environment variable to `1` — either exported in your shell or via the `env` field in `settings.json` ([Agent Teams docs](https://code.claude.com/docs/en/agent-teams)). This is documented for Claude Code, which shares Cowork's underlying Agent SDK — confirm the exact toggle in the Cowork desktop app, since the surface may differ.  
- **Confirm `mcp-builder` is available** in this session before spawning. Teammates auto-load skills, but verify it resolves.  
- **Note what teammates inherit:** project context (CLAUDE.md / equivalent), MCP servers, and skills load automatically — but **teammates do NOT inherit the lead's conversation history.** Every spawn prompt below must therefore be self-contained.  
- **Respect Cowork's operating constraints:** work inside an allowed folder. Cowork rejects folders outside the home directory, and the folder picker resolves paths with `realpath()` before validating — so symlinks and junctions pointing outside home are rejected too, not a bypass. There is no documented "escape hatch" for arbitrary paths, so **put the working folder somewhere under your home directory** rather than relying on a workaround. The finished connector must point to a **publicly reachable server, not localhost.**

---

## 3\. Lead does Phase 1 BEFORE spawning (shared foundation)

Phase 1 of `mcp-builder` (Deep Research and Planning) is shared context — do it once, as the lead, so teammates don't each re-discover the same facts:

1. Invoke `mcp-builder` and follow Phase 1: study the MCP spec (sitemap → `.md` pages), load the SDK README and the language-specific reference guide, review the target API.  
2. Produce a single **`PLAN.md`** in the working folder containing: the full tool inventory, the agreed naming convention (consistent prefixes, action-oriented names), the chosen transport (streamable HTTP for remote, stdio for local), the shared auth/client approach, and the response-format convention.  
3. **Partition the tools into non-overlapping ownership blocks** — one block per implementation teammate. Record the partition in `PLAN.md`. This file is the coordination surface; teammates read it, claim their block, and never touch another block's files.

Do not spawn until `PLAN.md` exists and the partition is explicit.

---

## 4\. Team topology

Map the team onto the remaining `mcp-builder` phases:

| Role | Owns | mcp-builder phase |
| :---- | :---- | :---- |
| **Lead** (you) | `PLAN.md`, shared infra (API client, error helpers, formatting, pagination), integration, final assembly | 1, then synthesis |
| **Implementer A…N** | one tool block each, in separate files | 2 |
| **Reviewer** | code-quality \+ build/compile pass across all blocks | 3 |
| **Evaluator** | the 10-question eval set | 4 |

Build shared infrastructure (the API client and helpers) in the lead context first, or have one implementer own it explicitly — every tool depends on it, so it must not be edited by two teammates at once.

---

## 5\. Spawn prompts (self-contained — paste the real values in)

**Implementer teammate:**

Invoke the `mcp-builder` skill and follow its Phase 2 implementation guidance for **\[language\]**. Read `PLAN.md` in `[working dir]` for the shared conventions and tool inventory. You own ONLY the **\[block name, e.g. issues\_\*\]** tools listed there — implement them in `[their own file/module]` and do not edit any other block's files or the shared client. For each tool: define the input schema with \[Zod/Pydantic\] incl. constraints and examples, define an output schema / structured content where possible, write actionable error messages, and set the annotation hints (readOnlyHint, destructiveHint, idempotentHint, openWorldHint). Use the shared API client from `[path]`; do not write your own auth. Report the list of tools you completed and any deviations from `PLAN.md`.

**Reviewer teammate:**

Once implementers report done, review all tool modules in `[working dir]` against `mcp-builder` Phase 3: DRY violations, consistent error handling, full type coverage, clear descriptions. Then run the build — `npm run build` (TS) or `python -m compileall .` (Py, compiles the whole tree; bare `py_compile` needs explicit file args) — and the MCP Inspector. Report failures with the exact file and fix needed. Do not rewrite logic yourself; hand issues back to the owning implementer.

**Evaluator teammate:**

Follow `mcp-builder` Phase 4\. Using read-only operations only, generate 10 evaluation questions that are independent, complex (multiple tool calls), realistic, verifiable by string comparison, and stable over time. Verify each answer yourself. Output the XML eval file to `[working dir]/evals.xml`.

---

## 6\. Coordination rules (give these to every teammate)

- `PLAN.md` is the source of truth. If reality diverges from it, report back to the lead rather than silently changing course — the lead updates `PLAN.md` so others see it.  
- One block \= one owner \= its own files. No cross-block edits.  
- Shared infra is read-only to implementers once the lead publishes it.  
- Surface blockers early; don't redo another teammate's work.

---

## 7\. Lead synthesis → deploy → connect back to Cowork

After teammates report:

1. Integrate the blocks, resolve any `PLAN.md` deviations, confirm a clean build and passing evals.  
2. **Deploy the server to a publicly reachable endpoint** (the `mcp-builder` output is server code that must be deployed independently — it is not a runtime by itself; localhost will not work for a Cowork connector).  
3. Add the deployed server as a **custom connector** (a remote MCP server, referenced by its public URL — this is distinct from a Cowork *plugin*, which is a local file bundle whose manifest lives at `.claude-plugin/plugin.json` and needs no deploy step). Once the connector is installed and enabled, its tools appear in the toolkit automatically — no extra skill file is required for basic tool availability. Add a companion skill only if you want to orchestrate multi-step workflows over the new tools.

---

## 8\. Honest caveats

- The Agent Teams enablement detail comes from Claude Code's documentation; Cowork runs on the same SDK but verify the desktop toggle in-app.  
- A team multiplies token cost; for most single MCP servers a single session that just invokes `mcp-builder` is faster and cheaper. Use Section 1's gate honestly.

