/**
 * team_init / team_status (M1 block).
 *
 * team_init scaffolds the team harness into a project; team_status reads it
 * back as a structured snapshot. Per PLAN.md §3.8: files and state only —
 * no model execution, no agent spawning.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  agentsDir,
  archiveDir,
  guarded,
  ok,
  parseFrontmatter,
  progressFile,
  resolveProjectDir,
  rolesFile,
  serverEntryPath,
  stateFile,
  teamDir,
  ToolError,
  type ToolResult,
} from "./shared.js";
import {
  initialProgressMd,
  initialRolesMd,
  initialStateMd,
} from "./state/writers.js";
import { refreshDashboard } from "./dashboard/render.js";
// team_status parses STATE.md/ROLES.md into structured fields instead of
// returning raw markdown (M2 handoff contract) — the one sanctioned seam
// where this M1-owned file reads M2's schema module.
import { parseState, parseRoles } from "./state/schema.js";

const CLAUDE_MD_START = "<!-- multi-agent-mcp:routing:start -->";
const CLAUDE_MD_END = "<!-- multi-agent-mcp:routing:end -->";

/** Routing block appended to the project's CLAUDE.md (idempotent via markers). */
function routingBlock(): string {
  return `${CLAUDE_MD_START}
## Agent team (multi-agent-mcp)

This project runs a coordinated agent team. Ground rules for every session:

- Team state lives in \`_team/\` (STATE.md = current truth, PROGRESS.md =
  append-only audit log, ROLES.md = role registry). Read STATE.md before
  claiming work; log claims/completions/blockers to PROGRESS.md.
- Staff and manage the team through the \`multi-agent-mcp\` server tools
  (team_status, agent_create, agent_delete, agent_assign_role, role_list).
  The server manages files/state only — dispatch agents from THIS session
  via its own Agent mechanism.
- One work-stream = one owner = its own files. Never two agents writing the
  same files concurrently.
- Guardrails: no money movement, no outbound comms, no secrets in code or
  state files. Proposed actions of that kind come back to the human.
${CLAUDE_MD_END}
`;
}


/**
 * Skill-forge nudge for net-new environments (DoD 5), conformant to the
 * agentskills.io authoring workflow per PLAN.md §10.5: skills are synthesized
 * from the project's own artifacts, never from generic knowledge.
 */
function skillForgeNudgeText(projectDir: string): string {
  return (
    `Net-new environment detected (${projectDir} has no .claude/skills/ and no _team/ harness). ` +
    `Strongly consider building project-specific Agent Skills before staffing the team, synthesized from THIS project's own artifacts — its docs, runbooks, schemas, scripts, and git history — never from generic LLM knowledge. ` +
    `Authoring workflow (agentskills.io spec): ` +
    `(1) Inventory the project's artifacts and recurring workflows worth encoding. ` +
    `(2) For each, create .claude/skills/<skill-name>/SKILL.md where frontmatter 'name' exactly matches the directory name (lowercase letters and hyphens, max 64 chars) and 'description' states both WHAT the skill does and WHEN to use it (max 1024 chars). ` +
    `(3) Keep the SKILL.md body under 500 lines; move bulk reference material into references/ files linked from the skill (progressive disclosure). ` +
    `(4) Add a Gotchas section and grow it as pitfalls surface — it is the primary iteration lever. ` +
    `(5) Calibrate prescriptiveness to task fragility: fragile multi-step operations get exact commands; flexible tasks get principles. ` +
    `The team:skill-forge plugin skill (M3) automates this workflow once installed.`
  );
}

/** Read + merge .mcp.json, registering this server under 'multi-agent-mcp'. */
function ensureMcpJson(root: string): "created" | "updated" | "skipped" {
  const file = path.join(root, ".mcp.json");
  const entry = { command: "node", args: [serverEntryPath()] };
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify({ mcpServers: { "multi-agent-mcp": entry } }, null, 2) + "\n",
      "utf8",
    );
    return "created";
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    throw new ToolError(
      `${file} exists but is not valid JSON. Fix or remove it, then re-run team_init.`,
    );
  }
  const servers = (parsed.mcpServers ?? {}) as Record<string, unknown>;
  if (servers["multi-agent-mcp"]) return "skipped"; // already registered; don't clobber user edits
  servers["multi-agent-mcp"] = entry;
  parsed.mcpServers = servers;
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  return "updated";
}

/** Ensure the CLAUDE.md routing block exists (marker-idempotent). */
function ensureClaudeMdBlock(root: string): "created" | "appended" | "skipped" {
  const file = path.join(root, "CLAUDE.md");
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# CLAUDE.md\n\n${routingBlock()}`, "utf8");
    return "created";
  }
  const existing = fs.readFileSync(file, "utf8");
  if (existing.includes(CLAUDE_MD_START)) return "skipped";
  fs.writeFileSync(file, `${existing.trimEnd()}\n\n${routingBlock()}`, "utf8");
  return "appended";
}

export function registerTeamTools(server: McpServer): void {
  server.registerTool(
    "team_init",
    {
      title: "Initialize team harness",
      description: `Scaffold the multi-agent team harness into a project. Idempotent: existing files are never overwritten; re-running fills in only what's missing.

Creates:
  - .claude/agents/ (agent definitions live here)
  - _team/STATE.md, _team/PROGRESS.md, _team/ROLES.md (state files, PLAN schemas)
  - _team/archive/ (retired agents land here — nothing is hard-deleted)
  - _team/dashboard.html (self-contained, auto-regenerated on every state-mutating tool call)
  - .mcp.json entry registering this server via node + absolute repo path (merged non-destructively if the file exists)
  - CLAUDE.md routing block (marker-delimited, appended once)

Args:
  - projectDir (string, optional): absolute path to the project root (e.g. '/Users/you/myproject'). Defaults to the server's working directory.
  - projectName (string, optional): display name used in the state files; defaults to the directory basename.

If the project is a net-new environment (no .claude/skills/ AND no _team/), the result includes 'skillForgeNudge': a suggestion to synthesize project-specific Agent Skills from the project's own artifacts (agentskills.io workflow).

Example:
  - Use when: "set this project up for an agent team" or after cloning a repo that should run one.`,
      inputSchema: {
        projectDir: z
          .string()
          .optional()
          .describe("Absolute project root; defaults to the server's cwd."),
        projectName: z
          .string()
          .optional()
          .describe("Display name for state files; defaults to the dir basename."),
      },
      outputSchema: {
        projectDir: z.string(),
        created: z.array(z.string()),
        skipped: z.array(z.string()),
        netNew: z.boolean(),
        skillForgeNudge: z.string().optional(),
        serverEntry: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: { projectDir?: string; projectName?: string }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        const projectName = args.projectName ?? path.basename(root);
        // Net-new detection BEFORE scaffolding (DoD 5).
        const netNew =
          !fs.existsSync(path.join(root, ".claude", "skills")) &&
          !fs.existsSync(teamDir(root));

        const created: string[] = [];
        const skipped: string[] = [];
        const track = (rel: string, made: boolean): void => {
          (made ? created : skipped).push(rel);
        };

        // Directories.
        for (const [rel, dir] of [
          [".claude/agents/", agentsDir(root)],
          ["_team/", teamDir(root)],
          ["_team/archive/", archiveDir(root)],
        ] as const) {
          const existed = fs.existsSync(dir);
          fs.mkdirSync(dir, { recursive: true });
          track(rel, !existed);
        }

        // State files (never overwritten — idempotency).
        const files: Array<[string, string, () => string]> = [
          ["_team/STATE.md", stateFile(root), () => initialStateMd(projectName)],
          ["_team/PROGRESS.md", progressFile(root), () => initialProgressMd()],
          ["_team/ROLES.md", rolesFile(root), () => initialRolesMd()],
        ];
        for (const [rel, file, render] of files) {
          if (fs.existsSync(file)) {
            skipped.push(rel);
          } else {
            fs.writeFileSync(file, render(), "utf8");
            created.push(rel);
          }
        }

        // .mcp.json registration + CLAUDE.md routing block.
        const mcpResult = ensureMcpJson(root);
        track(`.mcp.json (${mcpResult})`, mcpResult !== "skipped");
        const claudeMdResult = ensureClaudeMdBlock(root);
        track(`CLAUDE.md routing block (${claudeMdResult})`, claudeMdResult !== "skipped");

        // Dashboard is a DERIVED artifact, not source-of-truth state — unlike
        // STATE/PROGRESS/ROLES it is regenerated every call (DoD 7), not
        // skip-if-exists. M4: server/src/dashboard/render.ts.
        refreshDashboard(root, Date.now());
        created.push("_team/dashboard.html (regenerated)");

        const data: Record<string, unknown> = {
          projectDir: root,
          created,
          skipped,
          netNew,
          serverEntry: serverEntryPath(),
          ...(netNew ? { skillForgeNudge: skillForgeNudgeText(root) } : {}),
        };
        return ok(
          `Team harness ${created.length > 0 ? "initialized" : "already present"} in ${root} (${created.length} created, ${skipped.length} already existed).`,
          data,
        );
      }),
  );

  server.registerTool(
    "team_status",
    {
      title: "Team status snapshot",
      description: `Read the full team harness into one structured snapshot: active agents (with roles and last activity), archived count, the tail of the PROGRESS.md audit log, and STATE.md / ROLES.md parsed into structured fields (not raw markdown).

Args:
  - projectDir (string, optional): absolute project root; defaults to the server's cwd.
  - progressTailLines (number, optional, 1-100, default 10): how many recent PROGRESS.md entries to include.

Errors with a pointer to team_init if the harness is missing.

Example:
  - Use when: "where does the team stand?" at session start, or before claiming work.`,
      inputSchema: {
        projectDir: z
          .string()
          .optional()
          .describe("Absolute project root; defaults to the server's cwd."),
        progressTailLines: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Recent PROGRESS.md entries to include (default 10)."),
      },
      outputSchema: {
        projectDir: z.string(),
        initialized: z.boolean(),
        missing: z.array(z.string()),
        agents: z.array(
          z.object({
            name: z.string(),
            role: z.string(),
            model: z.string(),
          }),
        ),
        agentCount: z.number(),
        archivedCount: z.number(),
        progressTail: z.array(z.string()),
        state: z
          .object({
            project: z.string(),
            team: z.array(z.object({ agent: z.string(), role: z.string(), status: z.string() })),
            activeWork: z.array(
              z.object({
                task: z.string(),
                owner: z.string(),
                claimed_at: z.string(),
                eta: z.string(),
              }),
            ),
            blockers: z.array(z.object({ desc: z.string() })),
            lastManagerTick: z.string().nullable(),
          })
          .nullable(),
        roles: z.array(
          z.object({
            role: z.string(),
            agentFile: z.string(),
            sourceTemplate: z.string(),
            history: z.string(),
          }),
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: {
      projectDir?: string;
      progressTailLines?: number;
    }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        const expected: Array<[string, string]> = [
          ["_team/STATE.md", stateFile(root)],
          ["_team/PROGRESS.md", progressFile(root)],
          ["_team/ROLES.md", rolesFile(root)],
          [".claude/agents/", agentsDir(root)],
        ];
        const missing = expected.filter(([, p]) => !fs.existsSync(p)).map(([rel]) => rel);
        if (missing.length === expected.length) {
          throw new ToolError(
            `No team harness in ${root} (missing ${missing.join(", ")}). Run team_init on this project first.`,
          );
        }

        const agents = (fs.existsSync(agentsDir(root)) ? fs.readdirSync(agentsDir(root)) : [])
          .filter((f) => f.endsWith(".md"))
          .sort()
          .map((f) => {
            const { fm } = parseFrontmatter(
              fs.readFileSync(path.join(agentsDir(root), f), "utf8"),
            );
            return {
              name: f.replace(/\.md$/, ""),
              role: fm.role ?? "(unknown)",
              model: fm.model ?? "inherit",
            };
          });

        const tailN = args.progressTailLines ?? 10;
        const progressTail = fs.existsSync(progressFile(root))
          ? fs
              .readFileSync(progressFile(root), "utf8")
              .split("\n")
              .filter((l) => l.startsWith("- ["))
              .slice(-tailN)
          : [];

        const archivedCount = fs.existsSync(archiveDir(root))
          ? fs.readdirSync(archiveDir(root)).filter((f) => f.endsWith(".md")).length
          : 0;

        const stateDoc = fs.existsSync(stateFile(root))
          ? parseState(fs.readFileSync(stateFile(root), "utf8"))
          : null;
        const rolesRows = fs.existsSync(rolesFile(root))
          ? parseRoles(fs.readFileSync(rolesFile(root), "utf8"))
          : [];

        const data = {
          projectDir: root,
          initialized: missing.length === 0,
          missing,
          agents,
          agentCount: agents.length,
          archivedCount,
          progressTail,
          state: stateDoc
            ? {
                project: stateDoc.project,
                team: stateDoc.team,
                activeWork: stateDoc.active_work,
                blockers: stateDoc.blockers,
                lastManagerTick: stateDoc.last_manager_tick,
              }
            : null,
          roles: rolesRows,
        };
        return ok(
          `Team in ${root}: ${agents.length} active agent(s), ${archivedCount} archived${missing.length > 0 ? `; MISSING: ${missing.join(", ")} (re-run team_init)` : ""}.`,
          data,
        );
      }),
  );
}
