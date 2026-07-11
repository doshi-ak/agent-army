/**
 * M2 — state engine tools: progress_log, state_read, roles_sync, manager_tick.
 * PLAN.md §4 tool inventory + §7 M2 block. Registered by index.ts.
 *
 * HARD BOUNDARY (PLAN.md §3.8): this module reads and writes FILES only. It
 * never runs a model and never dispatches an agent. `manager_tick` returns
 * *recommendations*; the hosting agent-manager decides and acts.
 */
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { ok, guarded, resolveProjectDir, requireHarness, stateFile, progressFile, rolesFile, agentsDir, nowIso, } from "./shared.js";
import { parseState, parseProgress, parseRoles, } from "./state/schema.js";
import { appendProgress } from "./state/writers.js";
const projectDirArg = z
    .string()
    .optional()
    .describe("Absolute project root; defaults to the server's cwd.");
/** Ordinal for stale-claim detection: how far past ETA counts as "stale". */
function isStale(etaIso, now) {
    if (!etaIso)
        return false;
    const eta = Date.parse(etaIso);
    return Number.isFinite(eta) && now > eta;
}
export function registerStateTools(server) {
    // ---------------------------------------------------------- progress_log
    server.registerTool("progress_log", {
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
    }, async (args) => guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        appendProgress(root, args.actor, args.event, args.outcome);
        const entries = parseProgress(fs.readFileSync(progressFile(root), "utf8"));
        const entry = `- [${nowIso()}] ${args.actor} — ${args.event}: ${args.outcome}`;
        return ok(`Logged to PROGRESS.md (${entries.length} entries total).`, {
            projectDir: root,
            entry,
            totalEntries: entries.length,
        });
    }));
    // ------------------------------------------------------------ state_read
    server.registerTool("state_read", {
        title: "Read STATE.md (structured)",
        description: `Parse _team/STATE.md into a structured snapshot: team members (agent/role/status), active work (task/owner/claimed_at/eta), blockers, and the last manager tick. Read-only. Use before claiming work or to feed the dashboard.`,
        inputSchema: { projectDir: projectDirArg },
        outputSchema: {
            projectDir: z.string(),
            project: z.string(),
            team: z.array(z.object({ agent: z.string(), role: z.string(), status: z.string() })),
            activeWork: z.array(z.object({
                task: z.string(),
                owner: z.string(),
                claimed_at: z.string(),
                eta: z.string(),
            })),
            blockers: z.array(z.object({ desc: z.string() })),
            lastManagerTick: z.string().nullable(),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async (args) => guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        const doc = parseState(fs.readFileSync(stateFile(root), "utf8"));
        return ok(`STATE.md for ${doc.project}: ${doc.team.length} agent(s), ${doc.active_work.length} active, ${doc.blockers.length} blocker(s).`, {
            projectDir: root,
            project: doc.project,
            team: doc.team,
            activeWork: doc.active_work,
            blockers: doc.blockers,
            lastManagerTick: doc.last_manager_tick,
        });
    }));
    // ------------------------------------------------------------ roles_sync
    server.registerTool("roles_sync", {
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
    }, async (args) => guarded(async () => {
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
        return ok(inSync
            ? `ROLES.md in sync: ${rows.length} role(s) ↔ ${files.length} agent file(s).`
            : `ROLES.md drift: ${orphanRows.length} orphan row(s), ${unregisteredFiles.length} unregistered file(s).`, {
            projectDir: root,
            registeredRoles: rows.length,
            agentFiles: files.length,
            orphanRows,
            unregisteredFiles,
            inSync,
        });
    }));
    // ----------------------------------------------------------- manager_tick
    server.registerTool("manager_tick", {
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
    }, async (args) => guarded(async () => {
        const root = resolveProjectDir(args.projectDir);
        requireHarness(root);
        const doc = parseState(fs.readFileSync(stateFile(root), "utf8"));
        const progress = parseProgress(fs.readFileSync(progressFile(root), "utf8"));
        const now = Date.now();
        const staleClaims = doc.active_work
            .filter((w) => isStale(w.eta, now))
            .map((w) => ({ task: w.task, owner: w.owner, eta: w.eta }));
        const idleAgents = doc.team.filter((t) => t.status === "IDLE").map((t) => t.agent);
        const lastTick = doc.last_manager_tick ? Date.parse(doc.last_manager_tick) : NaN;
        const progressSinceLastTick = Number.isFinite(lastTick)
            ? progress.filter((e) => Date.parse(e.timestamp) > lastTick).length
            : progress.length;
        // Eval-coverage heuristic: evals/ should hold ≥1 case file.
        const evalsDir = path.join(root, "evals");
        const evalFiles = fs.existsSync(evalsDir)
            ? fs.readdirSync(evalsDir).filter((f) => /\.(md|xml|json|ya?ml)$/.test(f))
            : [];
        const evalGap = evalFiles.length === 0
            ? "No eval cases found in evals/ — generate at least one acceptance case per active work item."
            : null;
        const recommendations = [];
        for (const s of staleClaims) {
            recommendations.push(`Stale claim: "${s.task}" (owner ${s.owner}) is past its ETA ${s.eta} — reassign, extend, or mark blocked.`);
        }
        for (const a of idleAgents) {
            recommendations.push(`Idle agent "${a}" — assign from the active queue or retire.`);
        }
        if (evalGap)
            recommendations.push(evalGap);
        if (recommendations.length === 0) {
            recommendations.push("No action needed: no stale claims, no idle agents, eval coverage present.");
        }
        return ok(`manager_tick: ${staleClaims.length} stale, ${idleAgents.length} idle, ${progressSinceLastTick} progress entr(y/ies) since last tick.`, {
            projectDir: root,
            staleClaims,
            idleAgents,
            progressSinceLastTick,
            evalGap,
            recommendations,
        });
    }));
}
//# sourceMappingURL=state.js.map