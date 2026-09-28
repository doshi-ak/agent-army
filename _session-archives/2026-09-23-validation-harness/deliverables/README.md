# Agent-Army Troubleshoot Skill — Validation & Testing Package

The rough spec, turned into something a Claude Code agent executes end to end.

**13 audit conditions × 5 testing criteria = 65 cases, 65 auditable artifacts.** The Definition of Done is 65/65. The Hard Rule is enforced by the gate: one failing cell queues all five of that condition's cases for re-run, not just the one that failed.

## Start here

1. `PROMPT.md` — the single block to paste into Claude Code. That is the whole operating procedure.
2. `SPEC.md` — the executable spec: conditions, criteria, evidence contract, artifacts, failure semantics.
3. `CAPABILITY-ALIGNMENT.md` — where the rough spec's assumptions met current Claude Code documentation, verified 21 July 2026. Read this before changing anything; it corrects a hook that does not exist and documents three hard limits on the fleet vision.

## Files

```
SPEC.md                     the executable specification
CAPABILITY-ALIGNMENT.md     verified reality check against live docs
PROMPT.md                   the one paste-in prompt
harness/
  run_all.sh                orchestrator: preflight -> sandbox -> 65 cases -> report -> gate
  preflight.sh              verifies binaries, CLI flags, skill, auth, harness files
  build_sandbox.sh          builds the hermetic sandbox and all 13 fixtures
  run_case.sh               executes one case, captures every artifact
  evaluate.py               assertion engine; writes the per-case result artifact
  gate.py                   Definition-of-Done gate + Hard Rule re-run queue
  build_report.py           65 artifacts -> REPORT.md, report.html, results.json
  fs_manifest.py            portable containment manifests for criterion T5
  gen_cases.py              expands conditions x criteria into cases.json
  conditions.json           the 13 conditions, as data
  criteria.json             the 5 criteria, as data
  cases.json                the generated 65-case matrix
  contract.md               harness contract appended to every run's system prompt
  schemas/
    diagnostic_report.schema.json   the typed answer every run must return
```

Everything under `.sandbox/` is generated. Delete it and re-run; nothing is lost.

## Quick check

```bash
bash harness/preflight.sh              # verifies the whole toolchain, names what is missing
bash harness/run_all.sh --dry-run      # lists all 65 cases, no model calls
```

## Two things worth knowing before you run it

**The harness does not trust self-reports it can check.** `memory_files_written` is verified against disk. Tool-call conformance is read from the streamed transcript. A claimed diff with no diff step in `diagnostics_attempted` fails. A harness error is recorded as a failure, never a silent pass.

**C12's fixture contains no signal on purpose.** It is the only case where asking the user is correct, and it is how a skill that gates questions properly is told apart from one that simply never asks.
