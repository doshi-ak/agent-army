# Quickstart — a day in the life of an Agent Army team

One page. If you've already read `GUIDE.md`, this is the cheat-sheet version — the exact
sentences you say, in the order a real day actually goes.

## Morning: set up the team

You've cloned `agent-army` and installed the plugin once (see `GUIDE.md` §2 if not yet). Open
the project you want a team in and say:

> **"Set up an agent team in this project"**

That's `team-init`. It scaffolds `_team/STATE.md` / `PROGRESS.md` / `ROLES.md`, registers the
server in `.mcp.json`, and writes the zero-prompt permission allowlist — you should see zero
permission prompts on everything below. If this is a brand-new project, it may also offer to
build a project-specific skill (`team-skill-forge`) — that's optional, say yes or "later."

## Staff the team

> **"Staff a debugger"** · **"Add a security auditor to the team"**

That's `team-new-agent`. Pick from the 10 curated roles or the wider 232-role library. Each
agent gets a file in `.claude/agents/` and a row in `_team/ROLES.md` with its provenance.

Wrong role for the job?

> **"Make the debugger a performance engineer now"**

That's `team-assign-role` — re-roles in place, keeps the name and current work.

## Give the team work

> **"Assign the debugger to fix the login timeout bug"**

That's `team-new-task` — claims a row in `_team/STATE.md`'s Active Work table, owner + ETA if
you gave one. This is the shared to-do list every agent (and you) can read.

## Check on things anytime

> **"How's the team doing?"** · **"Where does the team stand?"**

That's `team-status` — the full snapshot: who's staffed, what's active, what's blocked, recent
progress. Or just open `_team/dashboard.html` in a browser; it regenerates itself on every
change, so it's never stale.

## Keep it healthy

> **"Run team maintenance"** · **"Run the manager"**

That's `team-manager` — one pass of the iteration engine: flags stale claims, roster drift
(an agent file that doesn't match `ROLES.md`), and eval gaps, then applies the safe hygiene
fixes. Run it at session start or after a milestone; nothing is auto-killed without you.

## Wrap a work stream

> **"That work stream is done, remove the agent"** · **"Retire the docs agent"**

That's `team-retire-agent` — archives the definition file (`_team/archive/`), never
hard-deletes. The history stays.

## The one thing that always stops for you

Nothing here ever sends an email, posts anywhere, spends money, or reaches outside this
project's files without you approving that specific action — that's not a missing feature,
it's the design (`GUIDE.md` §8). If a task needs one of those, the team stops and tells you
instead of guessing.

## If something's stuck

> **"An agent seems stuck."** → say **"run team maintenance"** — the manager flags it and
> tells you why.
>
> **Permission prompts didn't disappear?** Two one-time platform approvals are normal on a
> brand-new project — the workspace-trust dialog and the settings-file write itself. After
> those two clicks, the loop is zero-prompt (`GUIDE.md` §2, troubleshooting).

---

*Full detail, architecture, and the honest verified-vs-pending status live in `GUIDE.md`.
This page is the muscle-memory version once you've read that once.*
