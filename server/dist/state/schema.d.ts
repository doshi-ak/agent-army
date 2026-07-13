/**
 * State-file schema: parsers + serializers for the three `_team/` files
 * (M2-owned, per ./README.md). PLAN.md §5 grammar.
 *
 * Round-trip is the M2 acceptance test: parse(serialize(x)) deep-equals x for
 * every field we own. We deliberately parse a small, controlled YAML subset
 * (scalars, null, empty arrays, and block sequences of flat objects) instead
 * of pulling a YAML dependency — the warehouse rule is no new runtime deps for
 * what we fully control, and we control both sides of this round-trip.
 *
 * HARD BOUNDARY (PLAN.md §3.8): pure data. No model calls, no agent dispatch.
 */
export type Status = "DONE" | "DONE_WITH_CONCERNS" | "NEEDS_CONTEXT" | "BLOCKED" | "IN_PROGRESS" | "IDLE";
export declare const STATUS_VOCAB: readonly Status[];
export interface TeamMember {
    agent: string;
    role: string;
    status: Status;
}
export interface WorkItem {
    task: string;
    owner: string;
    claimed_at: string;
    eta: string;
}
export interface Blocker {
    desc: string;
}
/** The machine-readable mirror carried in STATE.md's YAML frontmatter. */
export interface StateDoc {
    project: string;
    team: TeamMember[];
    active_work: WorkItem[];
    blockers: Blocker[];
    last_manager_tick: string | null;
}
export interface ProgressEntry {
    timestamp: string;
    actor: string;
    event: string;
    outcome: string;
}
export interface RoleRow {
    role: string;
    agentFile: string;
    sourceTemplate: string;
    history: string;
}
/** Split `---\n...\n---\n<body>`; throws if the frontmatter fence is absent. */
export declare function splitFrontmatter(markdown: string): {
    fm: string;
    body: string;
};
/** Parse the controlled YAML subset in STATE.md frontmatter into a StateDoc. */
export declare function parseState(markdown: string): StateDoc;
/** Serialize a StateDoc back to the canonical frontmatter block (no fences). */
export declare function serializeState(doc: StateDoc): string;
/** Render a full STATE.md: frontmatter mirror + human-readable tables, kept in sync. */
export declare function renderStateMd(doc: StateDoc): string;
export declare function parseProgress(markdown: string): ProgressEntry[];
export declare function formatProgress(e: ProgressEntry): string;
/** `| Role | Agent file | Source template | History |` registry rows. */
export declare function parseRoles(markdown: string): RoleRow[];
export interface ManagerReport {
    staleClaims: {
        task: string;
        owner: string;
        eta: string;
    }[];
    idleAgents: string[];
    progressSinceLastTick: number;
    evalGap: string | null;
    recommendations: string[];
}
/**
 * Pure manager-tick computation (no I/O) — the core of the `manager_tick`
 * tool, factored out so it's unit-testable against fixtures. Given the parsed
 * state, progress log, an eval-file count, and the current epoch, returns the
 * recommendations report. Read-only: it decides nothing, it advises.
 */
export declare function computeManagerTick(doc: StateDoc, progress: ProgressEntry[], evalFileCount: number, now: number): ManagerReport;
//# sourceMappingURL=schema.d.ts.map