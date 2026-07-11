/**
 * agent_create / agent_delete / agent_list / agent_assign_role (M1 block).
 *
 * These tools write and manage `.claude/agents/*.md` definition FILES only.
 * Per PLAN.md §3.8 (hard constraint): the server never runs models and never
 * spawns agents — dispatch is the hosting Claude session's job.
 *
 * Deletion policy: agents are archived to `_team/archive/`, never hard-deleted.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare function registerAgentTools(server: McpServer): void;
//# sourceMappingURL=agents.d.ts.map