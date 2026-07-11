# server/src/state/ — MODULE BOUNDARY NOTE

**Status: M1 stub. This module is OWNED BY M2 (state engine block) per PLAN.md §7.**

What lives here in M1 (built by the M1 owner as simple writers only):

- `writers.ts` — initial-file templates for `_team/STATE.md`, `_team/PROGRESS.md`,
  `_team/ROLES.md` (used by `team_init`), plus best-effort append helpers used by
  the `agent_*` tools to log lifecycle events.

What M2 adds (and may freely rewrite in this directory):

- Schema validators for the three state files per PLAN.md §5 (STATE.md YAML
  frontmatter mirror; PROGRESS.md append-only entry grammar; ROLES.md registry rows).
- `state_write` (schema-validated structured update), `progress_log` (append-only,
  concurrency-safe), `roles_sync` (reconcile ROLES.md against `.claude/agents/`),
  `manager_tick` (read-only recommendations report).
- Fixtures and round-trip tests.

Contract for M2: the M1 tools call only `initialStateMd`, `initialProgressMd`,
`initialRolesMd`, `appendProgress`, and `appendRoleRegistryRow`. Keep those five
exports (signatures may gain optional params) and everything else is yours.
No other M1 file writes to `_team/*.md` directly.
