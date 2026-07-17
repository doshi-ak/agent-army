---
name: team-new-agent
description: Staff a new agent on the team from the role catalog, optionally seeded with a task assignment. Use when the user says "staff a debugger", "add a security auditor to the team", "team:new-agent", or needs a new specialist added to .claude/agents/.
---

# team-new-agent

Writes a new `.claude/agents/<name>.md` definition file from a role template. This only
creates the definition file — the hosting Claude session dispatches the agent itself via its
own Agent tool; this skill and the server never spawn or run anything (PLAN.md §3.8, hard
boundary — never violate it, including implicitly by suggesting "I'll go run it now").

## Role sourcing — three tiers, in order (PLAN.md §6)

1. **Catalog role** (covers most needs): run `role_list` to see the 10 pre-built specialties
   (`agent-manager`, `debugger`, `systems-architect`, `regression-test-engineer`,
   `ci-cd-engineer`, `forward-deployed-engineer`, `code-reviewer`, `security-auditor`,
   `docs-writer`, `performance-engineer`). If one fits, use it directly.
2. **Library pull**: if the catalog doesn't fit but the project has access to the wider
   agent-army specialist library (`agents/` at the repo root — 223 curated community agents
   across 9 domains), a matching template can be promoted into the project's own role catalog.
   This is a project-level decision, not something this skill does silently — surface the
   candidate template to the user, and if they confirm, add it as a new file under
   `server/roles/` (or the project's equivalent role-templates directory) with a `provenance:`
   frontmatter line recording where it came from, before calling `agent_create`.
3. **Truly novel role**: nothing in the catalog or the library fits (e.g. a domain-specific
   specialist like "social-media-strategist" or "prediction-council-analyst"). Route to
   **`team-skill-forge`** — novel roles are synthesized from the project's own artifacts, never
   invented from generic knowledge.

## Steps (once a role is chosen)

1. Confirm the harness exists (`team_status`; if it errors, route to `team-init` first).
2. Pick a `name`: lowercase-hyphens, 2-64 chars, must not already exist (`agent_list` to check).
3. Call **`agent_create`** with `name`, `role`, and optionally `taskContext` (a one-line current
   assignment — prefer using `team-new-task` afterward for anything substantial instead of
   cramming it into `taskContext`).
4. Report the created file path and the role's provenance line back to the user.

## Gotchas

- `agent_create` fails loudly if `name` already exists — that's correct; use `team-assign-role`
  to re-role an existing agent instead of trying to recreate it.
- Don't dispatch the agent as part of this skill. Creating the definition file and dispatching
  it via the Agent tool are two separate, explicit steps — conflating them is exactly the
  server/session boundary violation PLAN.md §3.8 exists to prevent.

## Verification before claiming done

Re-run `agent_list` and confirm the new agent appears with the expected role before telling the
user staffing is complete.
