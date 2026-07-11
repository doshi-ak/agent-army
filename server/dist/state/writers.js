/**
 * State-file templates and simple writers (M1 stubs).
 *
 * OWNED BY M2 after M1 lands — see ./README.md for the boundary contract.
 * M1 keeps these deliberately dumb: write initial files, append lines.
 * Schema validation, concurrency safety, and reconciliation are M2's job.
 */
import * as fs from "node:fs";
import { nowIso, progressFile, rolesFile } from "../shared.js";
/** Initial _team/STATE.md — sections per PLAN.md §5, status vocabulary per §10.5. */
export function initialStateMd(projectName) {
    return `---
# Machine-readable mirror of the tables below (M2's state_write maintains this).
project: ${projectName}
team: []
active_work: []
blockers: []
last_manager_tick: null
---

# STATE.md — current truth for ${projectName}

<!-- Maintained by the multi-agent-mcp server tools. Status vocabulary:
     DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED | IN_PROGRESS | IDLE -->

## Team

| Agent | Role | Status |
|---|---|---|

## Active Work

| Task | Owner | Claimed at | ETA |
|---|---|---|---|

## Blockers

(none)

## Last Manager Tick

(never run)
`;
}
/** Initial _team/PROGRESS.md — append-only audit trail per PLAN.md §5. */
export function initialProgressMd() {
    return `# PROGRESS.md — append-only log

<!-- Audit trail. NEVER edited or reordered, only appended.
     Entry format: - [ISO timestamp] <agent> — <event>: <one-line outcome> -->

- [${nowIso()}] team_init — scaffold: team harness initialized
`;
}
/** Initial _team/ROLES.md — registry per PLAN.md §5. */
export function initialRolesMd() {
    return `# ROLES.md — role registry

<!-- Registry of role assignments. Rows are appended by agent_create /
     agent_assign_role; M2's roles_sync reconciles this table against
     .claude/agents/ reality. -->

| Role | Agent file | Source template | History |
|---|---|---|---|
`;
}
/**
 * Append a PROGRESS.md entry. Best-effort: returns false (instead of
 * throwing) when the harness file is missing, so lifecycle tools can
 * surface a warning without failing the primary operation.
 */
export function appendProgress(projectRoot, actor, event, outcome) {
    const file = progressFile(projectRoot);
    if (!fs.existsSync(file))
        return false;
    fs.appendFileSync(file, `- [${nowIso()}] ${actor} — ${event}: ${outcome}\n`, "utf8");
    return true;
}
/** Append a ROLES.md registry row. Best-effort, same contract as appendProgress. */
export function appendRoleRegistryRow(projectRoot, role, agentFile, sourceTemplate, history) {
    const file = rolesFile(projectRoot);
    if (!fs.existsSync(file))
        return false;
    fs.appendFileSync(file, `| ${role} | ${agentFile} | ${sourceTemplate} | ${history} |\n`, "utf8");
    return true;
}
//# sourceMappingURL=writers.js.map