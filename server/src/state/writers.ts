/**
 * State-file templates and simple writers (M1 stubs).
 *
 * OWNED BY M2 after M1 lands — see ./README.md for the boundary contract.
 * M1 keeps these deliberately dumb: write initial files, append lines.
 * Schema validation, concurrency safety, and reconciliation are M2's job.
 */

import * as fs from "node:fs";
import { nowIso, progressFile, rolesFile, stateFile } from "../shared.js";
import { parseState, renderStateMd, type StateDoc } from "./schema.js";

/** Initial _team/STATE.md — sections per PLAN.md §5, status vocabulary per §10.5. */
export function initialStateMd(projectName: string): string {
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
export function initialProgressMd(): string {
  return `# PROGRESS.md — append-only log

<!-- Audit trail. NEVER edited or reordered, only appended.
     Entry format: - [ISO timestamp] <agent> — <event>: <one-line outcome> -->

- [${nowIso()}] team_init — scaffold: team harness initialized
`;
}

/** Initial _team/ROLES.md — registry per PLAN.md §5. */
export function initialRolesMd(): string {
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
export function appendProgress(
  projectRoot: string,
  actor: string,
  event: string,
  outcome: string,
): boolean {
  const file = progressFile(projectRoot);
  if (!fs.existsSync(file)) return false;
  fs.appendFileSync(file, `- [${nowIso()}] ${actor} — ${event}: ${outcome}\n`, "utf8");
  return true;
}

/** Append a ROLES.md registry row. Best-effort, same contract as appendProgress. */
export function appendRoleRegistryRow(
  projectRoot: string,
  role: string,
  agentFile: string,
  sourceTemplate: string,
  history: string,
): boolean {
  const file = rolesFile(projectRoot);
  if (!fs.existsSync(file)) return false;
  fs.appendFileSync(
    file,
    `| ${role} | ${agentFile} | ${sourceTemplate} | ${history} |\n`,
    "utf8",
  );
  return true;
}

/**
 * STATE.md cross-process safety (non-author verification finding, 2026-07-18):
 * every Claude session spawns its own server process on the same project dir,
 * and a demonstrated two-process race lost team rows (18/20) and produced one
 * torn read (in-place writeFileSync truncation). Two remedies, shared by every
 * STATE.md writer (these helpers AND state.ts's state_write):
 *  - withStateLock: mkdir-based cross-process mutex around read-modify-write
 *    (same pattern as evals/harness/run-all.mjs; stale locks stolen after 10s).
 *  - atomicWriteState: write temp + renameSync so readers never see a
 *    half-written file.
 */
const sleepMs = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

export function withStateLock<T>(root: string, fn: () => T): T {
  const lock = stateFile(root) + ".lock";
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch {
      const age = Date.now() - (fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? 0);
      if (age > 10_000) {
        try { fs.rmSync(lock, { recursive: true, force: true }); } catch { /* raced another stealer */ }
        continue;
      }
      if (Date.now() > deadline) throw new Error(`STATE.md lock held too long: ${lock}`);
      sleepMs(15);
    }
  }
  try {
    return fn();
  } finally {
    try { fs.rmSync(lock, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

export function atomicWriteState(file: string, data: string): void {
  const tmp = `${file}.tmp.${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, data, "utf8");
  fs.renameSync(tmp, file);
}

/**
 * Keep STATE.md's Team table in sync with agent lifecycle events. Added
 * 2026-07-17 (Evaluator finding, B-scenario evals): agent_create/delete/
 * assign_role wrote .claude/agents/ + ROLES.md + PROGRESS.md but never STATE's
 * Team table, so the roster a non-technical user reads first was always empty.
 * Reuses the M2 schema round-trip; declared lane-exception on BOARD, Executor
 * may overrule.
 */
export function upsertTeamMember(root: string, agent: string, role: string, status?: string): void {
  withStateLock(root, () => {
    const file = stateFile(root);
    const doc = parseState(fs.readFileSync(file, "utf8"));
    const existing = doc.team.find((t) => t.agent === agent);
    if (existing) {
      existing.role = role || existing.role;
      if (status) existing.status = status as typeof existing.status;
    } else {
      doc.team.push({ agent, role, status: (status ?? "IDLE") as StateDoc["team"][number]["status"] });
    }
    atomicWriteState(file, renderStateMd(doc));
  });
}

export function removeTeamMember(root: string, agent: string): void {
  withStateLock(root, () => {
    const file = stateFile(root);
    const doc = parseState(fs.readFileSync(file, "utf8"));
    doc.team = doc.team.filter((t) => t.agent !== agent);
    atomicWriteState(file, renderStateMd(doc));
  });
}
