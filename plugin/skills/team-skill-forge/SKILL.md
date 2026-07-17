---
name: team-skill-forge
description: Synthesize a new, project-specific Agent Skill from this project's own artifacts (docs, runbooks, schemas, git history) — never from generic knowledge. Use when team-init's net-new nudge fires, when team-new-agent hits a role with no catalog or library match, or when the user says "build a skill for X" or "team:skill-forge".
---

# team-skill-forge

Implements the DoD-5 nudge and the three-tier role-creation path's tier 3 (PLAN.md §6, §9.5,
§10.5). The one rule that makes this skill different from just writing documentation:
**every skill it produces is synthesized from artifacts that already exist in this project.**
A skill built from generic LLM knowledge about "how debugging usually works" is the anti-pattern
agentskills.io explicitly names — skip it and inventory the real project instead.

## When this fires

- `team-init` returned a `skillForgeNudge` (net-new environment).
- `team-new-agent` reached tier 3: no catalog role, no library template fits.
- Direct ask: "build a skill for X."

## Authoring workflow (agentskills.io spec, adopted near-verbatim per PLAN.md §10.5)

1. **Inventory.** Read the project's actual artifacts and recurring workflows worth encoding:
   docs, runbooks, schemas, scripts, CI configs, `git log` for repeated fix patterns. Name the
   specific files you're drawing from — a skill with no traceable source is the thing to avoid.
2. **Scaffold.** Create `.claude/skills/<skill-name>/SKILL.md` where:
   - `name` (frontmatter) **exactly matches the directory name** — lowercase letters and
     hyphens only, max 64 chars.
   - `description` states both **what** the skill does and **when** to use it, max 1024 chars.
     This is the only field Claude sees before deciding to invoke the skill — make it concrete
     and triggerable, not generic ("handles X" is worse than "use when the user asks to Y or Z").
3. **Keep it lean.** Body under 500 lines / ~5k tokens. Move bulk reference material (schemas,
   long command references, exhaustive option lists) into `references/` files linked from the
   skill body — progressive disclosure, not one giant file.
4. **Gotchas section.** Every skill gets one, even if thin at first. This is the primary
   iteration lever — as the skill gets used and something surprising happens, that becomes a
   Gotchas entry, not a silent mental note.
5. **Calibrate prescriptiveness to task fragility.** A fragile multi-step operation (exact
   deploy sequence, a schema migration) gets exact commands in order. A flexible task (code
   review approach, research strategy) gets principles and judgment calls, not a rigid script.

## RED → GREEN → REFACTOR loop (adapted from obra/superpowers, MIT — concept only, no code
imported; see `THIRD_PARTY_NOTICES.md`)

Skill-authoring benefits from the same discipline as test-driven code, applied to behavior
instead of assertions:

1. **RED** — before writing the skill, pick (or construct) one concrete scenario it must handle
   correctly. Run that scenario through Claude *without* the skill and confirm it actually goes
   wrong or is ambiguous (if Claude already handles it fine unprompted, you may not need a
   skill at all — check this before investing in one).
2. **GREEN** — write the minimal SKILL.md that makes that scenario reliably correct. Don't
   pad it with anticipated-but-unexercised cases yet.
3. **REFACTOR** — once it's reliably correct, tighten the wording, fold in a second real
   scenario if you have one, and move anything bulky into `references/`. Re-run the original
   scenario after every edit — refactoring a skill that silently breaks its own test case is
   the failure mode this loop exists to catch.

## Status vocabulary note

If the new skill's domain involves any kind of subagent dispatch status reporting, use this
project's standard vocabulary (`DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED |
IN_PROGRESS | IDLE`, adapted from obra/superpowers) rather than inventing a new one — consistency
across every skill in this harness matters more than a locally "nicer" wording.

## Gotchas

- Don't build a skill preemptively for a workflow that's only happened once. "Recurring" is the
  bar — a one-off doesn't earn a skill, it earns a PROGRESS.md entry.
- If the nudge fired from `team-init` and the user declines, don't re-offer every session —
  respect the decision; the nudge is advisory, not a checklist item to nag about.
- A skill whose `description` doesn't state a clear trigger condition will either never fire or
  fire on everything. Test the description mentally against 2-3 phrasings a user might actually
  say.

## Verification before claiming done

Re-run the RED scenario from step 1 of the loop with the finished skill in place and confirm it
now produces the correct behavior — that is the actual "done" signal, not "the file looks
complete."
