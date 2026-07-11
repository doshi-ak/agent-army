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
//# sourceMappingURL=writers.d.ts.map