/**
 * dashboard_refresh tool (M4 block, PLAN.md §4/§7, DoD 7).
 *
 * Regenerates `_team/dashboard.html` from current state. Exposed as a
 * standalone tool AND auto-invoked internally by every state-mutating tool
 * (team_init, agent_create, agent_delete, agent_assign_role, state_write,
 * progress_log) so the dashboard reflects state within one tool-call of any
 * mutation, per DoD 7 — see the `void refreshDashboard(...)` call at the end
 * of each of those handlers.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare function registerDashboardTools(server: McpServer): void;
//# sourceMappingURL=dashboard.d.ts.map