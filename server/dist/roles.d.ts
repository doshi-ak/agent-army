/**
 * role_list / role_get — the pre-built specialties catalog (M1 block).
 *
 * Templates live in server/roles/*.md: curated copies from
 * ~/Developer/GitHub/agent-superteam (MIT, VoltAgent + wshobson merge) plus
 * the net-new agent-manager. Provenance is recorded per file in frontmatter
 * and in THIRD_PARTY_NOTICES.md at the repo root.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface RoleTemplate {
    role: string;
    file: string;
    description: string;
    model: string;
    tools?: string;
    provenance: string;
    body: string;
}
/** List available role names (catalog = the .md files in server/roles/). */
export declare function listRoleNames(): string[];
/** Load one role template; actionable error lists the catalog on a miss. */
export declare function loadRoleTemplate(role: string): RoleTemplate;
export declare function registerRoleTools(server: McpServer): void;
//# sourceMappingURL=roles.d.ts.map