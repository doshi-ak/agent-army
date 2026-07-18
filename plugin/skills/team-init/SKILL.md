---
name: team-init
description: Set up the agent-team harness (state files, agent directory, MCP registration, permission allowlist) in a Claude Code project. Use when the user asks to "set this project up for an agent team", "turn this into an agent army", "team:init", or opens a project that should run a coordinated team but has no _team/ directory yet.
---

# team-init

Scaffolds the multi-agent-mcp harness into a project and clears the permission wall so the
team can actually run without stalling on prompts (DoD 9 — "a million agents blocked by an
allowlist is zero throughput").

## Steps

0. **STEP 0 — make the server reachable BEFORE the first tool call (net-new bootstrap).**
   The `team_init` tool lives *on* the `multi-agent-mcp` server, so on a brand-new project where
   `.mcp.json` doesn't register that server yet, step 1 has nothing to call — a chicken-and-egg
   the SL-7 regression guard exists to catch. Resolve it first:
   - Read `.mcp.json` in the target project. If it already registers `multi-agent-mcp` under
     `mcpServers`, the server is reachable — skip to step 1.
   - If not (net-new), **write the registration yourself** so the server connects. Locate the
     installed agent-army server entry — `server/dist/index.js` inside the cloned `agent-army`
     repo (default `~/Developer/GitHub/agent-army/server/dist/index.js`; use the actual clone
     path on this machine). Create/merge `.mcp.json` with **exactly** the shape the server uses,
     so a later `team_init` call sees it as already-present (idempotent), never a conflict:
     ```json
     { "mcpServers": { "multi-agent-mcp": { "command": "node", "args": ["<abs path>/server/dist/index.js"] } } }
     ```
   - Tell the user the MCP server list must reload for the new registration to take effect
     (reopen the project or reload MCP servers), **then** proceed to step 1. Do not call
     `team_init` before `.mcp.json` registers the server — it will fail as an unknown tool.

1. **Call the `team_init` tool** (multi-agent-mcp MCP server). Args: `projectDir` (optional,
   defaults to cwd), `projectName` (optional, defaults to the directory name). On net-new this
   runs *after* STEP 0; `team_init`'s own `.mcp.json` write is then a no-op ("skipped"), which
   is correct — STEP 0 already wrote the identical entry.
2. **Report what happened** in plain language: which files were created vs. already present
   (`team_init` is idempotent — re-running never overwrites).
3. **If the result includes `skillForgeNudge`** (net-new environment: no `.claude/skills/`
   and no `_team/` existed before this run), surface it to the user verbatim as a
   *recommendation*, not an automatic action. Building project-specific skills is valuable but
   optional and can take real time — let the user decide whether to invoke `team-skill-forge`
   now or later.
4. **Write the D9 permission allowlist.** Read `.claude/settings.json` in the target project
   (create it as `{}` if absent). Merge the following into its `permissions.allow` array
   idempotently (don't duplicate entries that already exist, don't touch any other key):

   ```json
   [
     "mcp__multi-agent-mcp",
     "mcp__multi-agent-mcp__team_init",
     "mcp__multi-agent-mcp__team_status",
     "mcp__multi-agent-mcp__agent_create",
     "mcp__multi-agent-mcp__agent_delete",
     "mcp__multi-agent-mcp__agent_list",
     "mcp__multi-agent-mcp__agent_assign_role",
     "mcp__multi-agent-mcp__role_list",
     "mcp__multi-agent-mcp__role_get",
     "mcp__multi-agent-mcp__state_read",
     "mcp__multi-agent-mcp__state_write",
     "mcp__multi-agent-mcp__progress_log",
     "mcp__multi-agent-mcp__roles_sync",
     "mcp__multi-agent-mcp__manager_tick",
     "mcp__multi-agent-mcp__dashboard_refresh",
     "Write(_team/**)",
     "Write(.claude/agents/**)",
     "Bash(ls:*)",
     "Bash(pwd)",
     "Bash(cat:*)",
     "Bash(find:*)",
     "Bash(grep:*)",
     "Bash(git status:*)",
     "Bash(git log:*)",
     "Bash(git diff:*)"
   ]
   ```

   The `mcp__multi-agent-mcp` entry allowlists the team server's own tools — without it
   every `team_*`/`agent_*`/`state_*` call still prompts, which defeats the point (found
   by session-layer eval SL-5). This is safe because the compiled server has no
   model/spawn/network APIs (guardrail EVAL-10) and none of the RULES.md §1 gated
   operations are reachable through its tools.

   These are exactly the read-only-shell + in-harness-write operations `team_init`,
   `state_write`, `progress_log`, `agent_create`, and `agent_delete` need for a zero-prompt
   happy path. **Never add** `git push`, network commands (`curl`, `npm publish`, etc.), `rm`,
   or anything money/outbound-shaped — those stay gated per this build's RULES.md §1 and every
   deployed team inherits the same hard gate. Report exactly what you added.
5. **Confirm the loop is clear**: `team_init` → `team-new-task` → `team-status` should now run
   with zero permission prompts. If the project already had a `permissions` block with
   conflicting rules (e.g. an explicit `deny` on `_team/**`), stop and tell the user — don't
   silently override an existing deny.
6. **Tell the user about the two one-time approvals** (found by session-layer eval SL-3/SL-5 —
   these are platform behavior, not bugs, and they only happen once per project):
   - **Workspace trust dialog**: in a brand-new project folder, Claude Code ignores
     `.claude/settings.json` allowlists until the user accepts the trust dialog on first
     interactive use. If the team tools still prompt after this setup, that's why.
   - **The settings write itself**: Claude Code protects `.claude/settings.json`, so step 4's
     write asks for one approval. After these two clicks, the team loop is zero-prompt.

## Gotchas

- `team_init` never overwrites existing state files — if `_team/STATE.md` already exists with
  content, re-running is a no-op for it. That's correct; don't "fix" it by deleting and
  recreating.
- The skill-forge nudge is advisory. Don't auto-invoke `team-skill-forge` — ask first.
- If `.mcp.json` already had a *different* server registered under the key `multi-agent-mcp`,
  `team_init` reports `.mcp.json (skipped)` rather than clobbering it. Flag this to the user;
  it usually means a stale or manual registration needs a look.

## Verification before claiming done

Re-run `team_status` after `team_init` and confirm it no longer errors with "no team harness" —
that's the actual signal the harness is live, not just that `team_init` returned success text.
