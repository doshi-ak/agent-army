# Role catalog — pointer, not a duplicate

This directory intentionally holds no role files. The 10-role specialties catalog has
exactly one canonical copy: **`server/roles/*.md`** (source of truth, consumed at runtime
by the `role_list` / `role_get` / `agent_create` / `agent_assign_role` MCP tools).

**`../agents/*.md`** in this plugin is a build-time bundled copy of the same 10 files,
in native Claude Code subagent format — so the specialists are usable via the Agent tool
the moment this plugin installs, even before `team_init` runs or the MCP server is wired
up. That is a deliberate second *format* (bundled subagents vs. server-managed templates),
not a second *source* — both trace back to `server/roles/`.

A third literal copy here would create exactly the drift risk this build's owner has
flagged repeatedly ("similar files, silently different"). If `server/roles/` changes,
re-sync `../agents/` from it (`cp server/roles/*.md plugin/agents/`) rather than edit
either copy independently.

Skills that need role-catalog data (`team-new-agent`, `team-assign-role`, `team-status`)
call the `role_list` / `role_get` MCP tools directly — they don't read this directory.
