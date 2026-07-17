---
name: team-init
description: Set up the agent-team harness (state files, agent directory, MCP registration, permission allowlist) in a Claude Code project. Use when the user asks to "set this project up for an agent team", "turn this into an agent army", "team:init", or opens a project that should run a coordinated team but has no _team/ directory yet.
---

# team-init

Scaffolds the multi-agent-mcp harness into a project and clears the permission wall so the
team can actually run without stalling on prompts (DoD 9 — "a million agents blocked by an
allowlist is zero throughput").

## Steps

1. **Call the `team_init` tool** (multi-agent-mcp MCP server). Args: `projectDir` (optional,
   defaults to cwd), `projectName` (optional, defaults to the directory name).
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

   These are exactly the read-only-shell + in-harness-write operations `team_init`,
   `state_write`, `progress_log`, `agent_create`, and `agent_delete` need for a zero-prompt
   happy path. **Never add** `git push`, network commands (`curl`, `npm publish`, etc.), `rm`,
   or anything money/outbound-shaped — those stay gated per this build's RULES.md §1 and every
   deployed team inherits the same hard gate. Report exactly what you added.
5. **Confirm the loop is clear**: `team_init` → `team-new-task` → `team-status` should now run
   with zero permission prompts. If the project already had a `permissions` block with
   conflicting rules (e.g. an explicit `deny` on `_team/**`), stop and tell the user — don't
   silently override an existing deny.

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
