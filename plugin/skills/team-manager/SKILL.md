---
name: team-manager
description: Run one manager-tick maintenance pass over the team — surface stale claims, roster drift, and eval gaps, then apply accepted hygiene fixes. Use on a cadence (session start, after milestones), when the user says "run the manager", "team:manager", or when team state looks stale.
---

# team-manager

Runs the DoD-3 iteration engine: `manager_tick` reads state and returns a **read-only**
recommendations report; this skill (acting as the agent-manager) triages it and applies only
the accepted hygiene fixes. It never touches another agent's actual work product — see
`server/roles/agent-manager.md` for the full role contract this skill implements.

## Steps

1. Call **`manager_tick`**. It returns: stale claims (past ETA), idle agents, progress deltas
   since the last tick, an eval-coverage gap note, and a list of recommendations. This call
   changes nothing by itself.
2. **Triage** the report into:
   - State hygiene you can apply now (see step 3).
   - Role refinements worth proposing — surface these, don't auto-apply prompt edits to an
     agent's definition file without confirmation.
   - Eval gaps — note them; filling them is Architect/Evaluator lane (`evals/`), not this
     skill's job to author unilaterally.
   - Anything ambiguous or destructive-looking — route to the user, stop there for that item.
3. **Apply accepted hygiene** via the server tools, never by hand-editing state files:
   - Stale claim past ETA with no recent PROGRESS entry → ask the owner's status; if genuinely
     stale, either extend the ETA (no direct tool — re-claim isn't idempotent, so just log the
     decision via `progress_log`) or `state_write(op: "complete")` if abandoned, with a note.
   - Roster drift → `roles_sync` reports it; fix by re-running `agent_create` /
     `agent_assign_role` / `agent_delete` as appropriate to the drift, never by editing
     ROLES.md text directly.
   - Confirmed the tick is handled → `state_write(op: "record_tick")` to stamp
     `last_manager_tick`.
4. Log the tick itself: `progress_log(actor: "agent-manager", event: "manager_tick", outcome:
   "<top finding, one line>")`.
5. **Dashboard refresh.** Call **`dashboard_refresh`** as the last step. In practice it's
   usually a no-op by the time you reach it — every state-mutating tool this skill calls
   (`state_write`, `progress_log`, `agent_create`/`agent_delete`/`agent_assign_role` via other
   skills) already regenerates `_team/dashboard.html` internally (DoD 7: reflects state within
   one tool-call of any mutation). Call it explicitly anyway so the tick report can confirm the
   dashboard is current, and as a safety net if state was ever hand-edited outside the tools.

## Hard rules (carried from `server/roles/agent-manager.md`)

- Maintenance only — another agent's code, docs, or research is out of bounds even when you
  can see the fix. Report it, don't touch it.
- `manager_tick` output is a set of proposals, not a work order. Anything destructive or
  producer-facing needs explicit acceptance before you act.
- PROGRESS.md is append-only — never edit or reorder existing entries.
- Status vocabulary is exactly: `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED |
  IN_PROGRESS | IDLE`. Normalize drifting labels to these when you touch STATE.md.

## Verification before claiming done

Re-run `manager_tick` after applying fixes and confirm the specific items you addressed no
longer appear in its report (or, for eval gaps you only routed rather than fixed, confirm they
were reported to the right owner, not silently dropped).
