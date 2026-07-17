#!/usr/bin/env node
/**
 * Multi-Agent MCP server — entry point.
 *
 * Turns a Claude Code project into a coordinated agent team's shared
 * filing system: harness scaffolding, agent lifecycle, role catalog,
 * and (from M2) the state engine and manager loop.
 *
 * Transport: stdio (local, single-user — warehouse Rule 1: the access path
 * is local files, so LOCAL MCP). Logs go to stderr only; stdout is reserved
 * for the JSON-RPC stream.
 *
 * HARD BOUNDARY (PLAN.md §3.8): this server manages, tracks, and serves
 * state. It NEVER runs models and NEVER spawns agents — dispatch belongs
 * to the hosting Claude session.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION } from "./shared.js";
import { registerTeamTools } from "./team.js";
import { registerAgentTools } from "./agents.js";
import { registerRoleTools } from "./roles.js";
import { registerStateTools } from "./state.js";
import { registerDashboardTools } from "./dashboard.js";
async function main() {
    const server = new McpServer({
        name: SERVER_NAME,
        version: SERVER_VERSION,
    });
    registerTeamTools(server);
    registerAgentTools(server);
    registerRoleTools(server);
    registerStateTools(server);
    registerDashboardTools(server);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[${SERVER_NAME}] v${SERVER_VERSION} running on stdio`);
}
main().catch((error) => {
    console.error(`[${SERVER_NAME}] Fatal error:`, error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map