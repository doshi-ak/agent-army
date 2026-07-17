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

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { guarded, ok, requireHarness, resolveProjectDir, type ToolResult } from "./shared.js";
import { refreshDashboard } from "./dashboard/render.js";

const projectDirArg = z
  .string()
  .optional()
  .describe("Absolute project root; defaults to the server's cwd.");

export function registerDashboardTools(server: McpServer): void {
  server.registerTool(
    "dashboard_refresh",
    {
      title: "Regenerate the team dashboard",
      description: `Regenerate _team/dashboard.html from the current STATE.md/PROGRESS.md/ROLES.md. Self-contained HTML — no external requests (no CDN CSS/JS, no remote assets). Every state-mutating tool (team_init, agent_create, agent_delete, agent_assign_role, state_write, progress_log) already calls this internally, so the dashboard is normally always current; call it directly only if you suspect drift or want to force a re-render (e.g. after a manual file edit).

Args:
  - projectDir (string, optional): absolute project root; defaults to the server's cwd.

Example:
  - Use when: "refresh the dashboard" or as the last step of a team-manager tick.`,
      inputSchema: { projectDir: projectDirArg },
      outputSchema: {
        projectDir: z.string(),
        file: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: { projectDir?: string }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        const file = refreshDashboard(root, Date.now());
        return ok(`Dashboard refreshed: ${file}`, { projectDir: root, file });
      }),
  );
}
