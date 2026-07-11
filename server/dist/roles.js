/**
 * role_list / role_get — the pre-built specialties catalog (M1 block).
 *
 * Templates live in server/roles/*.md: curated copies from
 * ~/Developer/GitHub/agent-superteam (MIT, VoltAgent + wshobson merge) plus
 * the net-new agent-manager. Provenance is recorded per file in frontmatter
 * and in THIRD_PARTY_NOTICES.md at the repo root.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { guarded, ok, parseFrontmatter, roleTemplatesDir, ToolError, validateName, } from "./shared.js";
/** List available role names (catalog = the .md files in server/roles/). */
export function listRoleNames() {
    const dir = roleTemplatesDir();
    if (!fs.existsSync(dir)) {
        throw new ToolError(`Role catalog directory missing: ${dir}. The server install is incomplete — rebuild the multi-agent-mcp repo.`);
    }
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""))
        .sort();
}
/** Load one role template; actionable error lists the catalog on a miss. */
export function loadRoleTemplate(role) {
    validateName(role, "role");
    const file = path.join(roleTemplatesDir(), `${role}.md`);
    if (!fs.existsSync(file)) {
        throw new ToolError(`Unknown role '${role}'. Available roles: ${listRoleNames().join(", ")}. Use role_list for descriptions.`);
    }
    const raw = fs.readFileSync(file, "utf8");
    const { fm, body } = parseFrontmatter(raw);
    return {
        role,
        file,
        description: fm.description ?? "(no description)",
        model: fm.model ?? "inherit",
        tools: fm.tools,
        provenance: fm.provenance ?? "(unrecorded)",
        body,
    };
}
export function registerRoleTools(server) {
    server.registerTool("role_list", {
        title: "List role catalog",
        description: `Browse the pre-built agent specialties catalog shipped with multi-agent-mcp.

Returns every role available to agent_create / agent_assign_role, with a one-line description, the model it targets, and upstream provenance.

Args: none.

Example:
  - Use when: "what kinds of agents can I staff?" or before choosing a role for agent_create.`,
        inputSchema: {},
        outputSchema: {
            roles: z.array(z.object({
                role: z.string(),
                description: z.string(),
                model: z.string(),
                provenance: z.string(),
            })),
            count: z.number(),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async () => guarded(async () => {
        const roles = listRoleNames().map((name) => {
            const t = loadRoleTemplate(name);
            return {
                role: t.role,
                description: t.description,
                model: t.model,
                provenance: t.provenance,
            };
        });
        return ok(`${roles.length} roles in the catalog.`, { roles, count: roles.length });
    }));
    server.registerTool("role_get", {
        title: "Get role template",
        description: `Fetch one role template from the specialties catalog, including its full definition body.

Args:
  - role (string, required): catalog role name, lowercase-hyphens (e.g. 'debugger', 'agent-manager'). Use role_list to see all options.

Returns the template's description, target model, provenance, and full markdown body (the system prompt an agent created from this role will carry).

Example:
  - Use when: inspecting what the 'security-auditor' role actually instructs before staffing one.`,
        inputSchema: {
            role: z
                .string()
                .describe("Catalog role name, e.g. 'debugger'. See role_list."),
        },
        outputSchema: {
            role: z.string(),
            description: z.string(),
            model: z.string(),
            tools: z.string().optional(),
            provenance: z.string(),
            body: z.string(),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async (args) => guarded(async () => {
        const t = loadRoleTemplate(args.role);
        return ok(`Role '${t.role}' (${t.model}) — ${t.description}`, {
            role: t.role,
            description: t.description,
            model: t.model,
            ...(t.tools !== undefined ? { tools: t.tools } : {}),
            provenance: t.provenance,
            body: t.body,
        });
    }));
}
//# sourceMappingURL=roles.js.map