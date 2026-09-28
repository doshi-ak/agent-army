# The one prompt to paste

Open Claude Code in the folder containing this package and paste the block below. It runs the whole thing end to end and holds the agent to the Hard Rule.

---

```
Execute the validation matrix in SPEC.md end to end. You own it until the
Definition of Done is met.

1. Read SPEC.md and CAPABILITY-ALIGNMENT.md before touching anything. The
   alignment doc corrects several assumptions in the original rough spec —
   respect the corrections, do not reintroduce them.

2. Run: bash harness/preflight.sh
   Fix every FAIL it reports before proceeding. If the skill under test does not
   exist at ~/.claude/skills/troubleshoot, stop and tell me — do not stub it,
   and do not point SKILL_UNDER_TEST at something that only looks like it.

3. Run: bash harness/run_all.sh
   This builds the sandbox, executes all 65 cases, evaluates each one, writes the
   report and runs the Definition-of-Done gate.

4. If the gate exits non-zero, apply the Hard Rule. For every condition with a
   failing cell:
     a. Read the failing assertion details in .sandbox/results/gate.json.
        Diagnose whether the failure is in the skill, the fixture, or the
        assertion. Say which, with evidence.
     b. If the skill is at fault, re-architect the skill to satisfy the
        condition. Do not weaken the assertion to make it pass, and do not edit
        ledger/ground_truth.json to match a wrong answer.
     c. Re-run all five criteria for that condition:
        bash harness/run_all.sh --condition <ID> --skip-preflight
     d. Append the closed defect to ledger/regression-ledger.json with a
        detector name, so the matrix gets stricter rather than staying flat.
   Repeat until the gate exits zero.

5. Stop and report to me — do not keep looping — if any of these happen:
     - the same condition fails three times in a row
     - total measured run cost passes $40
     - a fix would require changing an assertion, a fixture's ground truth, or
       the Definition of Done itself

6. When the gate exits zero, give me: the matrix summary from
   .sandbox/results/REPORT.md, the total cost, the count of ledger entries
   added, and any condition that passed only marginally and would be worth
   hardening.

Rules for the whole run: never mark a case passed by editing its artifact.
Never claim a check ran that did not run. Any claim about Claude Code behaviour
must come from documentation you fetched during this run, cited with the date.
```

---

## If you want to see it move before committing spend

```
bash harness/run_all.sh --dry-run          # lists all 65 cases, zero model calls
bash harness/run_all.sh --condition C08    # one condition, five cases
```

`C08` is the cheapest meaningful smoke test: its fixture contains the real `asyncRewake` misconfiguration, so a skill that passes it has demonstrably checked live documentation rather than answering from memory.

## Cost shape

Each case is one bounded `claude -p` invocation capped at 25–35 turns; T3 runs twice. That is 78 invocations for a full matrix. Every envelope reports `total_cost_usd`, the per-case artifact records it, and the report totals it — so after your first full run you have a real number rather than an estimate, and `--resume` means a re-run only pays for the cells that were not already green.
