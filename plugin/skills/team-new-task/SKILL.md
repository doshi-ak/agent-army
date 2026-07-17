---
name: team-new-task
description: Claim a new active-work item on the team's shared STATE.md, owned by a named agent, optionally with an ETA. Use when the user says "assign X to work on Y", "new task for the team", "team:new-task", or when staffing an agent that needs a claimed piece of work rather than an ambient role.
---

# team-new-task

Adds one row to `_team/STATE.md`'s Active Work table and logs the claim to
`_team/PROGRESS.md` — both in one atomic call.

## Steps

1. Confirm the harness exists (`team_status`; if it errors, route to `team-init` first).
2. Confirm the owning agent exists (`agent_list`). If not, route to `team-new-agent` first —
   don't claim work for an agent that isn't staffed.
3. Call **`state_write`** with `op: "claim"`, `task` (short, specific — this becomes the audit
   trail's anchor string), `owner` (the agent name), and `eta` (ISO-8601, optional — open-ended
   if omitted). This call also appends a `claim` entry to PROGRESS.md automatically; don't call
   `progress_log` separately for the claim itself.
4. Report the updated Active Work table back to the user.

## Gotchas

- `task` strings are matched literally by `state_write(op: "complete")` later — pick something
  specific enough to be unambiguous ("fix flaky checkout test in tests/e2e/checkout.spec.ts",
  not "fix bug").
- One work-stream = one owner (PLAN.md §9 process rule 1). Don't claim the same task string for
  two different agents; if two agents genuinely need to split a task, create two distinct task
  strings.
- `eta` is a decision point for `manager_tick`'s stale-claim detection — set a real one when you
  have a reasonable estimate; leaving it open-ended is fine but the tick will never flag it as
  stale even if it sits for weeks.

## Verification before claiming done

Re-run `state_read` (or `team_status`) and confirm the new row appears in Active Work with the
expected owner and eta before telling the user it's claimed.
