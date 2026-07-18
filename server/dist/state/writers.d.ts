/**
 * State-file templates and simple writers (M1 stubs).
 *
 * OWNED BY M2 after M1 lands — see ./README.md for the boundary contract.
 * M1 keeps these deliberately dumb: write initial files, append lines.
 * Schema validation, concurrency safety, and reconciliation are M2's job.
 */
/** Initial _team/STATE.md — sections per PLAN.md §5, status vocabulary per §10.5. */
export declare function initialStateMd(projectName: string): string;
/** Initial _team/PROGRESS.md — append-only audit trail per PLAN.md §5. */
export declare function initialProgressMd(): string;
/** Initial _team/ROLES.md — registry per PLAN.md §5. */
export declare function initialRolesMd(): string;
/**
 * Append a PROGRESS.md entry. Best-effort: returns false (instead of
 * throwing) when the harness file is missing, so lifecycle tools can
 * surface a warning without failing the primary operation.
 */
export declare function appendProgress(projectRoot: string, actor: string, event: string, outcome: string): boolean;
/** Append a ROLES.md registry row. Best-effort, same contract as appendProgress. */
export declare function appendRoleRegistryRow(projectRoot: string, role: string, agentFile: string, sourceTemplate: string, history: string): boolean;
export declare function withStateLock<T>(root: string, fn: () => T): T;
export declare function atomicWriteState(file: string, data: string): void;
/**
 * Keep STATE.md's Team table in sync with agent lifecycle events. Added
 * 2026-07-17 (Evaluator finding, B-scenario evals): agent_create/delete/
 * assign_role wrote .claude/agents/ + ROLES.md + PROGRESS.md but never STATE's
 * Team table, so the roster a non-technical user reads first was always empty.
 * Reuses the M2 schema round-trip; declared lane-exception on BOARD, Executor
 * may overrule.
 */
export declare function upsertTeamMember(root: string, agent: string, role: string, status?: string): void;
export declare function removeTeamMember(root: string, agent: string): void;
//# sourceMappingURL=writers.d.ts.map