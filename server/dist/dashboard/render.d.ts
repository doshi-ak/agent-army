/**
 * Dashboard rendering (M4 block, PLAN.md §4/§7, DoD 7).
 *
 * Self-contained HTML, no external requests (no CDN CSS/JS, no remote fonts/
 * images — everything inline). Reads the same M2-owned schema module
 * team_status already reads (the one sanctioned cross-block seam); never
 * hand-parses the state files itself.
 *
 * HARD BOUNDARY (PLAN.md §3.8): pure read + render. No model calls, no agent
 * dispatch, no writes outside `_team/dashboard.html`.
 */
/** Render `_team/dashboard.html` content from the current on-disk state. Pure function of the files' contents + `now`. */
export declare function renderDashboardHtml(root: string, now: number): string;
/** Regenerate `_team/dashboard.html` on disk. Returns the file path written. */
export declare function refreshDashboard(root: string, now: number): string;
//# sourceMappingURL=render.d.ts.map