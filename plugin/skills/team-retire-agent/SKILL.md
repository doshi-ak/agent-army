---
name: team-retire-agent
description: Retire an agent from the team — archives its definition file, never hard-deletes. Use when the user says "retire the docs agent", "that work stream is done, remove the agent", or "team:retire-agent".
---

# team-retire-agent

Archives `.claude/agents/<name>.md` to `_team/archive/<name>-<timestamp>.md`. Nothing this
skill ever does is a hard delete — that is a repo-wide guarantee (PLAN.md §4), not a
per-call option.

## Steps

1. Confirm the agent exists (`agent_list`).
2. Call **`agent_delete`** with `name` and a `reason` (one line — this is written into the
   archive header and PROGRESS.md, so make it useful for someone reading the audit trail
   later: "block M1 complete", "role superseded by X", "task cancelled", etc.).
3. Report the archive path back to the user.

## Gotchas

- If the agent still owns active-work claims in STATE.md, resolve those first
  (`state_write(op: "complete")` or reassign) — retiring the agent doesn't touch Active Work
  rows, so an orphaned claim pointing at an archived agent is a `roles_sync` / `manager_tick`
  flag waiting to happen. Check before you retire, not after.
- Retiring is not the same as re-roling. If the intent is "this agent should do something
  different now," use `team-assign-role` instead — it preserves the agent's name and current
  assignment.

## Verification before claiming done

Re-run `agent_list` and confirm the agent no longer appears in the active list before telling
the user it's retired.
