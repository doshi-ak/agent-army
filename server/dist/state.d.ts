/**
 * M2 — state engine tools: progress_log, state_read, roles_sync, manager_tick.
 * PLAN.md §4 tool inventory + §7 M2 block. Registered by index.ts.
 *
 * HARD BOUNDARY (PLAN.md §3.8): this module reads and writes FILES only. It
 * never runs a model and never dispatches an agent. `manager_tick` returns
 * *recommendations*; the hosting agent-manager decides and acts.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare function registerStateTools(server: McpServer): void;
//# sourceMappingURL=state.d.ts.map