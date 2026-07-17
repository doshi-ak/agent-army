---
name: team-assign-role
description: Re-role an existing agent from the specialties catalog, preserving its name and current assignment. Use when the user says "make the debugger a performance engineer now", "reassign X's role", or "team:assign-role".
---

# team-assign-role

Regenerates `.claude/agents/<name>.md` from a new role template while keeping the agent's name
and its `## Current assignment` section intact. The previous definition is archived first
(nothing is overwritten in place without a backup).

## Steps

1. Confirm the agent exists (`agent_list`) — this is re-roling, not creation; if the agent
   doesn't exist yet, route to `team-new-agent` instead.
2. Confirm the new role is valid (`role_list`; use the same three-tier sourcing as
   `team-new-agent` if the desired role isn't in the catalog yet).
3. Call **`agent_assign_role`** with `name` and the new `role`.
4. Report the previous role, new role, and the archive path of the old definition.

## Gotchas

- This is `destructiveHint: true` on the server side — the old definition file is gone from
  its original path (archived, not deleted, but the agent's live file changes underneath it).
  If another agent or process was mid-task referencing the old definition, this is a real
  discontinuity; check `state_read` for active claims by this agent before re-roling mid-task.
- `roles_sync` afterward is a cheap sanity check if you're re-roling several agents in a row —
  it reports any ROLES.md drift against the real `.claude/agents/` files.

## Verification before claiming done

Re-run `agent_list` (or `role_get` on the new role) and confirm the agent now shows the new
role before telling the user the reassignment is done.
