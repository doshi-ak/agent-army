# multi-agent-mcp

Turn any Claude Code project into a coordinated team of autonomous agents with
persistent file-based state, an agent-manager maintenance loop, a monitoring
dashboard, and a non-technical onboarding guide.

**Authoritative spec:** `PLAN.md` in
`/Users/doshi/Claude/Code/MCP-Builder/Multi-Agent Orchestration/` (the factory).
This repo is the product; the spec, coordination state, and milestone tracking
live there. Reality diverging from PLAN.md gets reported to the Architect, never
silently patched.

## Layout

- `server/` — the MCP server (TypeScript, stdio). Manages files and state ONLY:
  it never runs models and never spawns agents (PLAN.md §3.8, hard constraint).
  `server/roles/` is the pre-built specialties catalog (see
  `THIRD_PARTY_NOTICES.md` for upstream attribution).
- `plugin/` — skills-only Claude Code plugin (M3; scaffold only for now).
- `docs/` — guide + verification matrix (M5).
- `evals/` — evaluation cases (M2/M5).

## Status

M1 (server core) complete: `team_init`, `team_status`, `agent_create`,
`agent_delete`, `agent_list`, `agent_assign_role`, `role_list`, `role_get`.
M2 owns `server/src/state/` next (see that directory's README).

## Build & run

```bash
cd server
npm install
npm run build
node dist/index.js   # stdio MCP server
```

`server/dist/` is committed so `.mcp.json` registrations (and Code Web clones)
work without a build step. Rebuild and re-commit dist when `src/` changes.
