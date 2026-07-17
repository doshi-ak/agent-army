/**
 * agent_create / agent_delete / agent_list / agent_assign_role (M1 block).
 *
 * These tools write and manage `.claude/agents/*.md` definition FILES only.
 * Per PLAN.md §3.8 (hard constraint): the server never runs models and never
 * spawns agents — dispatch is the hosting Claude session's job.
 *
 * Deletion policy: agents are archived to `_team/archive/`, never hard-deleted.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  agentsDir,
  archiveDir,
  fileStamp,
  guarded,
  nowIso,
  ok,
  parseFrontmatter,
  progressFile,
  requireHarness,
  resolveProjectDir,
  ToolError,
  validateName,
  type ToolResult,
} from "./shared.js";
import { loadRoleTemplate, type RoleTemplate } from "./roles.js";
import { appendProgress, appendRoleRegistryRow, upsertTeamMember, removeTeamMember } from "./state/writers.js";
import { refreshDashboard } from "./dashboard/render.js";

const ASSIGNMENT_HEADER = "## Current assignment";

const projectDirArg = z
  .string()
  .optional()
  .describe(
    "Absolute path to the project root. Defaults to the server's working directory (the project that registered this server in .mcp.json).",
  );

/** Render an agent definition file from a role template. */
function renderAgentFile(
  name: string,
  template: RoleTemplate,
  assignment: string,
): string {
  const fmLines = [
    `name: ${name}`,
    `description: "${template.description.replace(/"/g, "'")}"`,
    ...(template.tools ? [`tools: ${template.tools}`] : []),
    `model: ${template.model}`,
    `role: ${template.role}`,
    `role_template: server/roles/${template.role}.md`,
    `provenance: ${template.provenance}`,
    `created: ${nowIso()}`,
  ];
  return `---\n${fmLines.join("\n")}\n---\n\n${template.body.trim()}\n\n${ASSIGNMENT_HEADER}\n\n${assignment.trim() || "(none — awaiting dispatch)"}\n`;
}

/** Pull the "## Current assignment" section out of an existing agent file. */
function extractAssignment(body: string): string {
  const idx = body.indexOf(ASSIGNMENT_HEADER);
  if (idx === -1) return "";
  const rest = body.slice(idx + ASSIGNMENT_HEADER.length);
  const next = rest.search(/\n## /);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function agentFilePath(root: string, name: string): string {
  return path.join(agentsDir(root), `${name}.md`);
}

/**
 * Archive an agent file into _team/archive/ (never hard-delete). Archive
 * filenames must never collide either — same-second archives of the same
 * agent get a numeric suffix rather than overwriting the earlier archive.
 */
function archiveAgentFile(root: string, name: string, reason: string): string {
  const src = agentFilePath(root, name);
  fs.mkdirSync(archiveDir(root), { recursive: true });
  const base = path.join(archiveDir(root), `${name}-${fileStamp()}`);
  let dest = `${base}.md`;
  for (let n = 2; fs.existsSync(dest); n++) dest = `${base}-${n}.md`;
  const original = fs.readFileSync(src, "utf8");
  fs.writeFileSync(dest, `<!-- archived ${nowIso()} — ${reason} -->\n${original}`, "utf8");
  fs.rmSync(src);
  return dest;
}

export function registerAgentTools(server: McpServer): void {
  server.registerTool(
    "agent_create",
    {
      title: "Create agent from role template",
      description: `Write a new agent definition file at .claude/agents/<name>.md from a catalog role template, optionally seeded with task context.

This only creates the definition FILE — it does not spawn or run anything (the hosting Claude session dispatches agents itself).

Args:
  - name (string, required): new agent's name, lowercase-hyphens, 2-64 chars (e.g. 'api-debugger'). Must not already exist.
  - role (string, required): catalog role, e.g. 'debugger'. See role_list.
  - taskContext (string, optional): the agent's current assignment, written into a '## Current assignment' section (e.g. 'Own the flaky checkout tests in tests/e2e/').
  - projectDir (string, optional): absolute project root; defaults to the server's cwd.

Requires a _team/ harness (run team_init first). Logs the creation to _team/PROGRESS.md and registers the role in _team/ROLES.md.

Example:
  - Use when: "staff a security auditor on this repo" -> agent_create(name: 'sec-auditor', role: 'security-auditor').
  - Don't use when: changing an existing agent's role (use agent_assign_role).`,
      inputSchema: {
        name: z
          .string()
          .describe("New agent name, lowercase-hyphens, e.g. 'api-debugger'."),
        role: z.string().describe("Catalog role name, e.g. 'debugger'. See role_list."),
        taskContext: z
          .string()
          .optional()
          .describe("Optional current-assignment text for the new agent."),
        projectDir: projectDirArg,
      },
      outputSchema: {
        name: z.string(),
        role: z.string(),
        file: z.string(),
        provenance: z.string(),
        logged: z.boolean(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args: {
      name: string;
      role: string;
      taskContext?: string;
      projectDir?: string;
    }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        const name = validateName(args.name, "agent");
        const template = loadRoleTemplate(args.role);
        const file = agentFilePath(root, name);
        if (fs.existsSync(file)) {
          throw new ToolError(
            `Agent '${name}' already exists at ${file}. Pick a different name, or use agent_assign_role to re-role it.`,
          );
        }
        fs.mkdirSync(agentsDir(root), { recursive: true });
        fs.writeFileSync(file, renderAgentFile(name, template, args.taskContext ?? ""), "utf8");
        const logged =
          appendProgress(root, name, "agent_create", `created with role '${template.role}'`) &&
          appendRoleRegistryRow(
            root,
            template.role,
            `.claude/agents/${name}.md`,
            `server/roles/${template.role}.md (${template.provenance})`,
            `${nowIso()}: created`,
          );
        upsertTeamMember(root, name, template.role, "IDLE");
        refreshDashboard(root, Date.now());
        return ok(`Agent '${name}' created with role '${template.role}'.`, {
          name,
          role: template.role,
          file,
          provenance: template.provenance,
          logged,
        });
      }),
  );

  server.registerTool(
    "agent_delete",
    {
      title: "Retire agent (archive)",
      description: `Retire an agent: its definition file is MOVED to _team/archive/<name>-<timestamp>.md. Nothing is ever hard-deleted.

Args:
  - name (string, required): existing agent name (see agent_list).
  - reason (string, optional): one line recorded in the archive header and PROGRESS.md (e.g. 'block M1 complete').
  - projectDir (string, optional): absolute project root; defaults to the server's cwd.

Example:
  - Use when: "retire the docs agent, that work stream is done".`,
      inputSchema: {
        name: z.string().describe("Existing agent name to retire."),
        reason: z.string().optional().describe("Why the agent is being retired."),
        projectDir: projectDirArg,
      },
      outputSchema: {
        name: z.string(),
        archivedTo: z.string(),
        logged: z.boolean(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args: {
      name: string;
      reason?: string;
      projectDir?: string;
    }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        const name = validateName(args.name, "agent");
        if (!fs.existsSync(agentFilePath(root, name))) {
          throw new ToolError(
            `No agent named '${name}' in ${agentsDir(root)}. Use agent_list to see active agents (it may already be archived).`,
          );
        }
        const reason = args.reason ?? "retired via agent_delete";
        const archivedTo = archiveAgentFile(root, name, reason);
        const logged = appendProgress(root, name, "agent_delete", reason);
        removeTeamMember(root, name);
        refreshDashboard(root, Date.now());
        return ok(`Agent '${name}' archived (never hard-deleted).`, {
          name,
          archivedTo,
          logged,
        });
      }),
  );

  server.registerTool(
    "agent_list",
    {
      title: "List agents",
      description: `Enumerate active agents in .claude/agents/ with their roles and last activity, plus a count of archived agents.

Args:
  - projectDir (string, optional): absolute project root; defaults to the server's cwd.

Last activity = the most recent _team/PROGRESS.md entry naming the agent (falls back to the definition file's mtime).

Example:
  - Use when: "who's on the team right now?"`,
      inputSchema: { projectDir: projectDirArg },
      outputSchema: {
        agents: z.array(
          z.object({
            name: z.string(),
            role: z.string(),
            model: z.string(),
            file: z.string(),
            lastActivity: z.string(),
          }),
        ),
        count: z.number(),
        archivedCount: z.number(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: { projectDir?: string }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        const dir = agentsDir(root);
        const progress = fs.existsSync(progressFile(root))
          ? fs.readFileSync(progressFile(root), "utf8")
          : "";
        const agents = (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
          .filter((f) => f.endsWith(".md"))
          .sort()
          .map((f) => {
            const file = path.join(dir, f);
            const name = f.replace(/\.md$/, "");
            const { fm } = parseFrontmatter(fs.readFileSync(file, "utf8"));
            // Last PROGRESS.md entry mentioning this agent, else file mtime.
            const mentions = progress
              .split("\n")
              .filter((l) => l.startsWith("- [") && l.includes(` ${name} `));
            const lastActivity =
              mentions.length > 0
                ? (mentions[mentions.length - 1].match(/^- \[([^\]]+)\]/)?.[1] ??
                  fs.statSync(file).mtime.toISOString())
                : fs.statSync(file).mtime.toISOString();
            return {
              name,
              role: fm.role ?? "(unknown)",
              model: fm.model ?? "inherit",
              file,
              lastActivity,
            };
          });
        const archived = fs.existsSync(archiveDir(root))
          ? fs.readdirSync(archiveDir(root)).filter((f) => f.endsWith(".md")).length
          : 0;
        return ok(`${agents.length} active agent(s), ${archived} archived.`, {
          agents,
          count: agents.length,
          archivedCount: archived,
        });
      }),
  );

  server.registerTool(
    "agent_assign_role",
    {
      title: "Re-role agent",
      description: `Re-role an existing agent from the specialties catalog. The old definition is archived to _team/archive/ first, then the file is regenerated from the new role's template. The agent's '## Current assignment' section is preserved.

Args:
  - name (string, required): existing agent name (see agent_list).
  - role (string, required): new catalog role, e.g. 'performance-engineer'. See role_list.
  - projectDir (string, optional): absolute project root; defaults to the server's cwd.

Example:
  - Use when: "make the debugger a performance engineer now that the crash is fixed".
  - Don't use when: the agent doesn't exist yet (use agent_create).`,
      inputSchema: {
        name: z.string().describe("Existing agent name to re-role."),
        role: z.string().describe("New catalog role name. See role_list."),
        projectDir: projectDirArg,
      },
      outputSchema: {
        name: z.string(),
        previousRole: z.string(),
        role: z.string(),
        file: z.string(),
        archivedPrevious: z.string(),
        logged: z.boolean(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args: {
      name: string;
      role: string;
      projectDir?: string;
    }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        const name = validateName(args.name, "agent");
        const file = agentFilePath(root, name);
        if (!fs.existsSync(file)) {
          throw new ToolError(
            `No agent named '${name}' in ${agentsDir(root)}. Use agent_create to staff one, or agent_list to see who exists.`,
          );
        }
        const template = loadRoleTemplate(args.role);
        const existing = fs.readFileSync(file, "utf8");
        const { fm, body } = parseFrontmatter(existing);
        const previousRole = fm.role ?? "(unknown)";
        const assignment = extractAssignment(body);
        const archivedPrevious = archiveAgentFile(
          root,
          name,
          `re-role ${previousRole} -> ${template.role}`,
        );
        fs.writeFileSync(file, renderAgentFile(name, template, assignment), "utf8");
        const logged =
          appendProgress(
            root,
            name,
            "agent_assign_role",
            `re-roled from '${previousRole}' to '${template.role}'`,
          ) &&
          appendRoleRegistryRow(
            root,
            template.role,
            `.claude/agents/${name}.md`,
            `server/roles/${template.role}.md (${template.provenance})`,
            `${nowIso()}: reassigned from ${previousRole}`,
          );
        upsertTeamMember(root, name, template.role);
        refreshDashboard(root, Date.now());
        return ok(`Agent '${name}' re-roled: ${previousRole} -> ${template.role}.`, {
          name,
          previousRole,
          role: template.role,
          file,
          archivedPrevious,
          logged,
        });
      }),
  );
}
