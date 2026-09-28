#!/usr/bin/env python3
"""Expand conditions.json x criteria.json into the 65-case matrix (cases.json).

Every cell is fully resolved here: thresholds, prompts, tool allowlists and
artifact paths are baked in so the runner never has to infer anything.
Regenerate with:  python3 harness/gen_cases.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    with open(os.path.join(HERE, name)) as fh:
        return json.load(fh)


def resolve_assertions(cond, crit):
    """Turn assertion names into concrete, threshold-bearing assertion objects."""
    out = []
    for name in crit["assertions"]:
        a = {"name": name}
        if name == "all_required_findings_present":
            a["findings"] = cond["required_findings"]
        elif name == "both_runs_pass_required_findings":
            a["findings"] = cond["required_findings"]
        elif name == "required_fields_present":
            a["fields"] = cond["required_fields"]
        elif name == "coverage_score_is_100":
            a["threshold"] = 100
            a["findings"] = cond["required_findings"]
        elif name == "every_finding_has_evidence_pointer":
            a["min_items"] = cond["min_evidence_items"]
        elif name == "no_forbidden_behavior":
            a["forbidden"] = cond["forbidden_behaviors"]
        elif name == "within_max_turns":
            a["max_turns"] = cond["max_turns"]
        elif name == "all_tool_calls_within_allowlist":
            a["allowlist"] = cond["allowed_tools"]
        elif name == "root_cause_matches_ground_truth":
            a["ground_truth_key"] = cond["id"]
        elif name == "no_ledger_defect_reintroduced":
            a["ledger"] = "ledger/regression-ledger.json"
        # Condition-specific extra thresholds ride along on the relevant assertion.
        for extra in ("min_sources", "min_config_paths", "min_search_locations",
                      "min_diff_findings", "min_inventory_items", "min_env_findings",
                      "min_diagnostics_before_asking", "required_stages",
                      "required_memory_files", "questions_must_be_closed"):
            if extra in cond and name in ("schema_valid", "required_fields_present",
                                          "all_required_findings_present"):
                a[extra] = cond[extra]
        out.append(a)
    return out


def main():
    conditions = load("conditions.json")["conditions"]
    criteria = load("criteria.json")["criteria"]
    cases = []
    for cond in conditions:
        for crit in criteria:
            cid = f"{cond['id']}-{crit['id']}"
            probe = cond["probe"]
            if crit["id"] == "T3" and "second_pass_probe" in cond:
                second = cond["second_pass_probe"]
            else:
                second = probe
            cases.append({
                "case_id": cid,
                "condition_id": cond["id"],
                "criterion_id": crit["id"],
                "title": f"{cond['title']} :: {crit['title']}",
                "condition_statement": cond["statement"],
                "criterion_intent": crit["intent"],
                "fixture": cond["fixture"],
                "probe": probe,
                "second_probe": second,
                "run_mode": crit["run_mode"],
                "runs": crit["runs"],
                "permission_mode": crit.get("permission_mode", "dontAsk"),
                "max_turns": cond["max_turns"],
                "allowed_tools": cond["allowed_tools"],
                "assertions": resolve_assertions(cond, crit),
                "artifact": f"results/{cid}/{crit['artifact']}",
                "transcript": f"results/{cid}/transcript.jsonl",
                "fs_manifest_before": f"results/{cid}/fs-before.sha",
                "fs_manifest_after": f"results/{cid}/fs-after.sha",
            })

    assert len(cases) == 65, f"expected 65 cases, generated {len(cases)}"
    payload = {
        "matrix": {"conditions": len(conditions), "criteria": len(criteria),
                   "total_cases": len(cases)},
        "definition_of_done": "All 65 cases PASS. Any FAIL triggers the Hard Rule: "
                              "re-architect the impacted condition and re-run that "
                              "condition against all five criteria.",
        "cases": cases,
    }
    with open(os.path.join(HERE, "cases.json"), "w") as fh:
        json.dump(payload, fh, indent=2)
    print(f"wrote cases.json: {len(cases)} cases "
          f"({len(conditions)} conditions x {len(criteria)} criteria)")


if __name__ == "__main__":
    main()
