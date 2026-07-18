/**
 * M2 — state engine tools: progress_log, state_read, roles_sync, manager_tick.
 * PLAN.md §4 tool inventory + §7 M2 block. Registered by index.ts.
 *
 * HARD BOUNDARY (PLAN.md §3.8): this module reads and writes FILES only. It
 * never runs a model and never dispatches an agent. `manager_tick` returns
 * *recommendations*; the hosting agent-manager decides and acts.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  type ToolResult,
  ok,
  guarded,
  ToolError,
  resolveProjectDir,
  requireHarness,
  stateFile,
  progressFile,
  rolesFile,
  agentsDir,
  nowIso,
} from "./shared.js";
import {
  type Status,
  parseState,
  parseProgress,
  parseRoles,
  renderStateMd,
  computeManagerTick,
} from "./state/schema.js";
import { appendProgress, withStateLock, atomicWriteState } from "./state/writers.js";
import { refreshDashboard } from "./dashboard/render.js";

const projectDirArg = z
  .string()
  .optional()
  .describe("Absolute project root; defaults to the server's cwd.");

export function registerStateTools(server: McpServer): void {
  // ---------------------------------------------------------- progress_log
  server.registerTool(
    "progress_log",
    {
      title: "Append a PROGRESS.md entry",
      description: `Append one timestamped, append-only entry to _team/PROGRESS.md — the audit trail. Entries are never edited or reordered. Concurrency-safe (atomic append), so parallel agents can log without clobbering each other.

Args:
  - projectDir (string, optional): absolute project root; defaults to cwd.
  - actor (string): who is logging (agent/role name, e.g. "builder").
  - event (string): short event verb, e.g. "claim", "done", "blocked".
  - outcome (string): one-line result.

Example: log a claim before starting work, and a done/blocked entry after.`,
      inputSchema: {
        projectDir: projectDirArg,
        actor: z.string().min(1).describe("Who is logging (agent/role name)."),
        event: z.string().min(1).describe('Event verb, e.g. "claim" | "done" | "blocked".'),
        outcome: z.string().min(1).describe("One-line outcome."),
      },
      outputSchema: {
        projectDir: z.string(),
        entry: z.string(),
        totalEntries: z.number(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args: {
      projectDir?: string;
      actor: string;
      event: string;
      outcome: string;
    }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        appendProgress(root, args.actor, args.event, args.outcome);
        const entries = parseProgress(fs.readFileSync(progressFile(root), "utf8"));
        const entry = `- [${nowIso()}] ${args.actor} — ${args.event}: ${args.outcome}`;
        refreshDashboard(root, Date.now());
        return ok(`Logged to PROGRESS.md (${entries.length} entries total).`, {
          projectDir: root,
          entry,
          totalEntries: entries.length,
        });
      }),
  );

  // ------------------------------------------------------------ state_read
  server.registerTool(
    "state_read",
    {
      title: "Read STATE.md (structured)",
      description: `Parse _team/STATE.md into a structured snapshot: team members (agent/role/status), active work (task/owner/claimed_at/eta), blockers, and the last manager tick. Read-only. Use before claiming work or to feed the dashboard.`,
      inputSchema: { projectDir: projectDirArg },
      outputSchema: {
        projectDir: z.string(),
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
        requireHarness(root);
        const doc = parseState(fs.readFileSync(stateFile(root), "utf8"));
        return ok(
          `STATE.md for ${doc.project}: ${doc.team.length} agent(s), ${doc.active_work.length} active, ${doc.blockers.length} blocker(s).`,
          {
            projectDir: root,
            project: doc.project,
            team: doc.team,
            activeWork: doc.active_work,
            blockers: doc.blockers,
            lastManagerTick: doc.last_manager_tick,
          },
        );
      }),
  );

  // ------------------------------------------------------------ roles_sync
  server.registerTool(
    "roles_sync",
    {
      title: "Reconcile ROLES.md against .claude/agents/",
      description: `Compare the ROLES.md registry against the real agent files in .claude/agents/. Reports drift: registry rows whose agent file is missing (orphans), and agent files with no registry row (unregistered). Read-only report — the agent-manager decides what to fix.`,
      inputSchema: { projectDir: projectDirArg },
      outputSchema: {
        projectDir: z.string(),
        registeredRoles: z.number(),
        agentFiles: z.number(),
        orphanRows: z.array(z.string()),
        unregisteredFiles: z.array(z.string()),
        inSync: z.boolean(),
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
        requireHarness(root);
        const rows = parseRoles(fs.readFileSync(rolesFile(root), "utf8"));
        const dir = agentsDir(root);
        const files = fs.existsSync(dir)
          ? fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
          : [];
        const fileSet = new Set(files);
        const rowFiles = new Set(rows.map((r) => r.agentFile));
        const orphanRows = rows
          .filter((r) => r.agentFile && !fileSet.has(path.basename(r.agentFile)))
          .map((r) => `${r.role} → ${r.agentFile}`);
        const unregisteredFiles = files.filter((f) => !rowFiles.has(f) && !rowFiles.has(`.claude/agents/${f}`));
        const inSync = orphanRows.length === 0 && unregisteredFiles.length === 0;
        return ok(
          inSync
            ? `ROLES.md in sync: ${rows.length} role(s) ↔ ${files.length} agent file(s).`
            : `ROLES.md drift: ${orphanRows.length} orphan row(s), ${unregisteredFiles.length} unregistered file(s).`,
          {
            projectDir: root,
            registeredRoles: rows.length,
            agentFiles: files.length,
            orphanRows,
            unregisteredFiles,
            inSync,
          },
        );
      }),
  );

  // ----------------------------------------------------------- manager_tick
  server.registerTool(
    "manager_tick",
    {
      title: "Manager iteration pass (recommendations)",
      description: `The iteration engine. Reads STATE.md + PROGRESS.md + evals/ and returns a recommendations report: stale claims (work past its ETA), idle agents, progress since the last tick, and eval-coverage gaps. READ-ONLY — it never edits state or dispatches anyone. The agent-manager reviews the report and applies accepted recommendations (which then land in PROGRESS.md with sources).`,
      inputSchema: { projectDir: projectDirArg },
      outputSchema: {
        projectDir: z.string(),
        staleClaims: z.array(z.object({ task: z.string(), owner: z.string(), eta: z.string() })),
        idleAgents: z.array(z.string()),
        progressSinceLastTick: z.number(),
        evalGap: z.string().nullable(),
        recommendations: z.array(z.string()),
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
        requireHarness(root);
        const doc = parseState(fs.readFileSync(stateFile(root), "utf8"));
        const progress = parseProgress(fs.readFileSync(progressFile(root), "utf8"));

        const evalsDir = path.join(root, "evals");
        const evalFileCount = fs.existsSync(evalsDir)
          ? fs.readdirSync(evalsDir).filter((f) => /\.(md|xml|json|ya?ml)$/.test(f)).length
          : 0;

        const report = computeManagerTick(doc, progress, evalFileCount, Date.now());
        return ok(
          `manager_tick: ${report.staleClaims.length} stale, ${report.idleAgents.length} idle, ${report.progressSinceLastTick} progress entr(y/ies) since last tick.`,
          { projectDir: root, ...report },
        );
      }),
  );

  // ------------------------------------------------------------ state_write
  server.registerTool(
    "state_write",
    {
      title: "Structured update to STATE.md",
      description: `Apply one structured, schema-validated mutation to _team/STATE.md and re-render it (frontmatter mirror + human tables stay in sync). Ops:
  - upsert_agent: add/update a team member's status (needs agent, status; optional role).
  - claim: add an active-work item (needs task, owner; optional eta) — also logs "claim" to PROGRESS.md.
  - complete: remove an active-work item by task (needs task) — also logs "done".
  - set_blockers: replace the blocker list (blockers: string[]).
  - record_tick: stamp last_manager_tick = now (the agent-manager calls this after acting on a manager_tick report).`,
      inputSchema: {
        projectDir: projectDirArg,
        op: z
          .enum(["upsert_agent", "claim", "complete", "set_blockers", "record_tick"])
          .describe("The mutation to apply."),
        agent: z.string().optional(),
        role: z.string().optional(),
        status: z
          .enum(["DONE", "DONE_WITH_CONCERNS", "NEEDS_CONTEXT", "BLOCKED", "IN_PROGRESS", "IDLE"])
          .optional(),
        task: z.string().optional(),
        owner: z.string().optional(),
        eta: z.string().optional().describe("ISO-8601 ETA for a claim; omit for open-ended."),
        blockers: z.array(z.string()).optional(),
      },
      outputSchema: {
        projectDir: z.string(),
        op: z.string(),
        team: z.array(z.object({ agent: z.string(), role: z.string(), status: z.string() })),
        activeWork: z.array(
          z.object({ task: z.string(), owner: z.string(), claimed_at: z.string(), eta: z.string() }),
        ),
        blockers: z.array(z.object({ desc: z.string() })),
        lastManagerTick: z.string().nullable(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args: {
      projectDir?: string;
      op: "upsert_agent" | "claim" | "complete" | "set_blockers" | "record_tick";
      agent?: string;
      role?: string;
      status?: Status;
      task?: string;
      owner?: string;
      eta?: string;
      blockers?: string[];
    }): Promise<ToolResult> =>
      guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        // Cross-process mutex + atomic rename (2026-07-18 verification finding):
        // concurrent sessions each run their own server process on this dir —
        // an unlocked read-modify-write demonstrably lost updates and tore reads.
        return withStateLock(root, () => {
        const doc = parseState(fs.readFileSync(stateFile(root), "utf8"));

        switch (args.op) {
          case "upsert_agent": {
            if (!args.agent || !args.status) {
              throw new ToolError("op 'upsert_agent' requires 'agent' and 'status'.");
            }
            const existing = doc.team.find((t) => t.agent === args.agent);
            if (existing) {
              existing.status = args.status;
              if (args.role) existing.role = args.role;
            } else {
              doc.team.push({ agent: args.agent, role: args.role ?? "", status: args.status });
            }
            break;
          }
          case "claim": {
            if (!args.task || !args.owner) {
              throw new ToolError("op 'claim' requires 'task' and 'owner'.");
            }
            doc.active_work.push({
              task: args.task,
              owner: args.owner,
              claimed_at: nowIso(),
              eta: args.eta ?? "",
            });
            appendProgress(root, args.owner, "claim", args.task);
            break;
          }
          case "complete": {
            if (!args.task) throw new ToolError("op 'complete' requires 'task'.");
            const before = doc.active_work.length;
            doc.active_work = doc.active_work.filter((w) => w.task !== args.task);
            if (doc.active_work.length === before) {
              throw new ToolError(`No active-work item matching task '${args.task}'.`);
            }
            appendProgress(root, args.owner ?? "unknown", "done", args.task);
            break;
          }
          case "set_blockers": {
            doc.blockers = (args.blockers ?? []).map((desc) => ({ desc }));
            break;
          }
          case "record_tick": {
            doc.last_manager_tick = nowIso();
            break;
          }
        }

        atomicWriteState(stateFile(root), renderStateMd(doc));
        refreshDashboard(root, Date.now());
        return ok(`state_write(${args.op}) applied to STATE.md.`, {
          projectDir: root,
          op: args.op,
          team: doc.team,
          activeWork: doc.active_work,
          blockers: doc.blockers,
          lastManagerTick: doc.last_manager_tick,
        });
        });
      }),
  );
}
