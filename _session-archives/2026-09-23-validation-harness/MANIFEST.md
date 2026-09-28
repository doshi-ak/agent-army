# Agent-Army Validation — Session Archive
**Project:** AGENT-ARMY-MGMT · **Archived:** 2026-09-23 · **Source session:** agent-army-validation-harness-build

This is the complete, self-contained record of the session that turned your rough validation spec
into an executable testing harness for the `troubleshoot` skill. If this session gets deleted, a
fresh one pointed at this folder has everything it needs to pick up cold. Nothing here depends on
the original session still being alive.

## What's in here
- `deliverables/` — the full harness and its docs, exactly as built (18 files).
  - `README.md`, `SPEC.md`, `CAPABILITY-ALIGNMENT.md`, `PROMPT.md`
  - `harness/` — orchestrator, preflight, sandbox builder, per-case runner, evaluator, gate,
    report builder, case generator, and the machine-readable `conditions.json` / `criteria.json`
    / `cases.json` (the generated 65-case matrix) + `schemas/diagnostic_report.schema.json`
- `attachments/` — the original spec you provided (`TITLE_Rough_Validation___Testing_Spec...md`).
- `transcript/` — the full verbatim session transcript (840K) + the session journal.
  Integrity verified: archived transcript SHA-256 is byte-identical to source.

---

## State of the work (read this before doing anything with it)

**Definition of Done is NOT met.** DoD = all 65 cases (13 conditions × 5 criteria) PASS against the
*real* troubleshoot skill. That run has not happened. The harness itself is built and structurally
sound; the real-skill run is the pending piece.

**Honest discrepancy flag:** the session's own mid-run summary claimed a mock run scored 29/65 and
seeded a `regression-ledger.json`. Those run artifacts do **not** exist on disk — they were written
to an ephemeral sandbox that didn't persist (or were overstated). What's real and archived is: the
18 source files, the spec, the transcript. Treat "29/65 mock pass" as unverified until re-run.

**Known defect in the deliverable:** `deliverables/harness/{lib,schemas}` is a stray directory
literally named `{lib,schemas}` — a brace-expansion bug from a `mkdir` that ran without bash brace
expansion. It's empty. Before the real run, confirm whether the harness actually needs a real
`harness/lib/` dir (and that `schemas/` — which exists correctly — is the only one required).

## The one load-bearing next action
Run the harness against the real skill. Cheapest first test:
```bash
GUARDED_PATHS="$HOME/.claude/settings.json:$HOME/.claude.json" \
SANDBOX_ROOT=.sandbox-truthseeker \
bash harness/run_all.sh --condition C08
```
C08 is the cheapest meaningful case: passing it requires actually fetching live docs for the
`asyncRewake` misconfiguration. If that passes, run the full matrix.

## Operational warnings (these will bite otherwise)
- **Do not run all 5 sessions on the default sandbox at once.** `build_sandbox.sh` starts with
  `rm -rf` on `./.sandbox`. Concurrent runs clobber each other. Give every session its own
  `SANDBOX_ROOT` (e.g. `.sandbox-wilbet`, `.sandbox-evelyn`).
- **Narrow `GUARDED_PATHS` for criterion T5.** The sessions ping each other through the shared
  folder and churn `~/.claude` constantly, so a wide guarded-path check will false-fail on drift
  that has nothing to do with the skill. Guard the config files only (as in the command above).

## Capability corrections carried out of this session (verified against live Claude Code docs)
- `asyncRewake` is a **field** on a command hook (`{"type":"command","command":"./wake.sh","asyncRewake":true}`),
  **not** a hook event. Configured as an event it silently never fires.
- Agent teams: native but experimental (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). `TeamCreate`/
  `TeamDelete` no longer exist. Hard limits: no nested teams, no in-process teammate session
  resumption, no background subagents spawned by teammates. The fleet is one level deep.
- The human-approval gate is **platform-enforced**: a teammate cannot approve permission prompts on
  your behalf; relayed approval is treated as untrusted in auto mode.
- M6 credentials have a path: **Workload Identity Federation** — GitHub OIDC token exchanged for a
  short-lived Anthropic token, no static `ANTHROPIC_API_KEY`. Needs admin on the Anthropic org.
- Minimum GitHub Actions workflow permissions are `contents: write`, `pull-requests: write`,
  `issues: write` — **not** `write-all`.

## Still open / unsettled
- **Scheduler truth:** you said a cronjob forces the inter-session pings; the earlier diff-check
  logged cron as dead (launchd doing the real work). Settle with `crontab -l` and
  `launchctl list | grep -i claude`. Note: cron can only write files into the shared folder — it
  cannot wake a live session mid-turn. If pings truly land in-session, the waker is a `FileChanged`
  hook, a `SessionStart` `watchPaths`, or `asyncRewake` — find which is actually wired.
- **Your blockers to clear personally:** run `/install-github-app`; provision M6 creds (WIF above).
- Evelyn's capability-class evals for the full vision scope are a separate effort, bounded by the
  agent-teams limits above.
