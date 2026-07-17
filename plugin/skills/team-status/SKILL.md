---
name: team-status
description: Read the full team snapshot — active agents, roles, active work, blockers, and recent progress. Use at session start, before claiming work, or when the user asks "where does the team stand?", "who's on the team", or "team:status".
---

# team-status

Read-only. One call, one structured snapshot — this is the tool to reach for before doing
almost anything else in a staffed project.

## Steps

1. Call **`team_status`** (optionally with `progressTailLines` to see more/less of the recent
   audit log than the default 10).
2. If it errors with "no team harness," route to `team-init` — don't try to work around a
   missing harness by reading raw files or guessing state.
3. Summarize for the user in plain language: who's on the team and their status, what's
   actively claimed and by whom (flag anything close to or past its ETA yourself, even before
   `manager_tick` runs), and any open blockers.
4. If `_team/dashboard.html` exists, mention it as a visual alternative — note that until M4
   ships, it's a static seed page, not a live-refreshing dashboard.

## Gotchas

- `team_status` parses STATE.md/ROLES.md into structured fields — trust its parse over reading
  the markdown files yourself; hand-parsing risks drifting from the schema in
  `server/src/state/schema.ts`.
- This tool never mutates anything. If the user actually wants something changed (claim work,
  clear a blocker, retire an agent), route to the matching skill — don't try to satisfy a
  write request through `team-status`.

## Verification before claiming done

None needed — this is a read; there's nothing to verify beyond "the call succeeded and the
summary matches what it returned."
