#!/usr/bin/env python3
"""Definition-of-Done gate and Hard Rule enforcement.

  python3 gate.py <sandbox-root>

Definition of Done: all 65 cases PASS.
Hard Rule: any failure means the impacted condition is re-architected and re-run
against all five criteria. This script computes the re-run queue: for every
condition with at least one failing cell, all five of its cases are queued, not
just the ones that failed.

Exit 0 when the Definition of Done is met, 1 when it is not, 2 on harness error.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    sandbox = sys.argv[1]
    cases = json.load(open(os.path.join(HERE, "cases.json")))["cases"]

    rows, missing = [], []
    for c in cases:
        p = os.path.join(sandbox, c["artifact"])
        if not os.path.exists(p):
            missing.append(c["case_id"])
            rows.append({"case_id": c["case_id"], "condition_id": c["condition_id"],
                         "criterion_id": c["criterion_id"], "verdict": "NOT_RUN",
                         "failed_assertions": ["artifact missing; case did not produce a result"]})
            continue
        art = json.load(open(p))
        rows.append({
            "case_id": c["case_id"], "condition_id": c["condition_id"],
            "criterion_id": c["criterion_id"], "verdict": art["verdict"],
            "failed_assertions": [f"{a['assertion']}: {a['detail']}"
                                  for a in art["assertions"] if not a["passed"]],
        })

    passed = [r for r in rows if r["verdict"] == "PASS"]
    failed = [r for r in rows if r["verdict"] != "PASS"]
    impacted = sorted({r["condition_id"] for r in failed})

    rerun_queue = [c["case_id"] for c in cases if c["condition_id"] in impacted]

    summary = {
        "total_cases": len(cases),
        "passed": len(passed),
        "failed": len(failed),
        "not_run": len(missing),
        "definition_of_done_met": len(failed) == 0 and len(cases) == 65,
        "impacted_conditions": impacted,
        "hard_rule_rerun_queue": rerun_queue,
        "rerun_queue_size": len(rerun_queue),
        "rows": rows,
    }

    os.makedirs(os.path.join(sandbox, "results"), exist_ok=True)
    with open(os.path.join(sandbox, "results", "gate.json"), "w") as fh:
        json.dump(summary, fh, indent=2)
    with open(os.path.join(sandbox, "results", "rerun-queue.txt"), "w") as fh:
        fh.write("\n".join(rerun_queue) + ("\n" if rerun_queue else ""))

    print(f"gate: {len(passed)}/{len(cases)} PASS, {len(failed)} FAIL, {len(missing)} NOT_RUN")
    if summary["definition_of_done_met"]:
        print("gate: DEFINITION OF DONE MET - 65/65 with auditable artifacts")
        sys.exit(0)

    print(f"gate: HARD RULE ENGAGED - conditions impacted: {', '.join(impacted) or 'none'}")
    print(f"gate: re-architect those conditions, then re-run {len(rerun_queue)} cases:")
    print("      bash harness/run_all.sh --only $(tr '\\n' ',' < "
          f"{os.path.join(sandbox, 'results', 'rerun-queue.txt')})")
    for r in failed[:10]:
        print(f"  {r['case_id']} {r['verdict']}: {r['failed_assertions'][:1]}")
    if len(failed) > 10:
        print(f"  ... and {len(failed) - 10} more (see results/gate.json)")
    sys.exit(1)


if __name__ == "__main__":
    main()
