#!/usr/bin/env node
/**
 * Agent Army — executable eval harness (Evelyn / Evaluator).
 *
 * Makes the "Verifier" real: drives the ACTUAL compiled MCP server over the
 * real stdio JSON-RPC surface (same path a Claude session uses), runs the
 * EVAL cases from EVALS-DRAFT.md §A + the additions proposed in
 * EVAL-RUBRIC.md §3/§4, and scores the run against EVAL-RUBRIC.md §1.
 *
 * It does NOT touch server/src — it only drives + observes. Each case is
 * isolated: a fresh scratch project + fresh server process, so no case
 * depends on another's state (EVALS-DRAFT §A requirement).
 *
 * Verdicts: PASS / FAIL / BLOCKED (dependency not built — excluded from the
 * Axis-1 denominator, listed separately). Run:
 *   cd server && npm run build        # produces dist/ the harness drives
 *   node ../evals/harness/run-evals.mjs
 *
 * Writes evals/RESULTS.md and prints a summary; exit 1 if any scoreable case FAILs.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..", "..", "server");
const SERVER_ENTRY = path.join(SERVER_DIR, "dist", "index.js");
const RESULTS_MD = path.resolve(__dirname, "..", "RESULTS.md");
// Tools that MUST exist at the current milestone (M1 8 + M2 5 + M4 1). A
// `requires` tool in this set that goes missing is a REGRESSION → FAIL, not
// BLOCKED — BLOCKED is reserved for dependencies this harness genuinely cannot
// observe from the stdio MCP surface.
const EXPECTED_TOOLS = new Set([
  "team_init", "team_status", "agent_create", "agent_delete", "agent_list",
  "agent_assign_role", "role_list", "role_get",
  "state_read", "state_write", "progress_log", "roles_sync", "manager_tick",
  "dashboard_refresh", // M4 — landed a387deb
]);
// Which milestone's block owns each eval (PLAN §7): M1 = server core (team/agent/role),
// M2 = state engine + manager, M3 = plugin, M4 = dashboard.
const MILESTONE = {
  "EVAL-01": "M1", "EVAL-02": "M1", "EVAL-03": "M1", "EVAL-05": "M1", "EVAL-06": "M1",
  "EVAL-08": "M1", "EVAL-12": "M1",
  "EVAL-04": "M2", "EVAL-09": "M2", "EVAL-10": "M2", "EVAL-14": "M2",
  "EVAL-07": "M4", "EVAL-15": "M4", "EVAL-11": "M3", "EVAL-13": "M3",
};

// Resolve the MCP SDK through the package's own exports map (honors any future
// repackaging) rather than a hardcoded dist/esm path.
const require = createRequire(path.join(SERVER_DIR, "package.json"));
const importSdk = (spec) => import(pathToFileURL(require.resolve(spec)).href);
const { Client } = await importSdk("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = await importSdk("@modelcontextprotocol/sdk/client/stdio.js");

if (!fs.existsSync(SERVER_ENTRY)) {
  console.error(`✗ server not built: ${SERVER_ENTRY} missing. Run 'cd server && npm run build' first.`);
  process.exit(2);
}

/** Boot a fresh server+client against a throwaway project dir. */
async function freshProject() {
  const dir = mkdtempSync(path.join(tmpdir(), "agent-army-eval-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_ENTRY],
    cwd: dir,
    stderr: "pipe",
  });
  const client = new Client({ name: "eval-harness", version: "0.0.0" });
  try {
    await client.connect(transport);
    // Drain the server's stderr so a chatty server can't fill the pipe buffer
    // (~64KB) and hang the child. We don't need the content, just the flow.
    transport.stderr?.on("data", () => {});
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw e;
  }
  return {
    dir,
    client,
    async call(name, args = {}) {
      const res = await client.callTool({ name, arguments: args });
      if (res.isError) throw new Error(`tool ${name} error: ${JSON.stringify(res.content)}`);
      return res.structuredContent;
    },
    async close() {
      try { await client.close(); }
      finally { rmSync(dir, { recursive: true, force: true }); }
    },
  };
}

let TOOLSET = null;
async function toolset() {
  if (TOOLSET) return TOOLSET;
  const p = await freshProject();
  try {
    const res = await p.client.listTools();
    TOOLSET = new Set(res.tools.map((t) => t.name));
  } finally {
    await p.close();
  }
  return TOOLSET;
}

/**
 * A case returns nothing on PASS (throws on FAIL). `requires` lists tool names
 * that must exist; if any is missing the case is BLOCKED (milestone not built).
 * `guardrail: true` marks an Axis-2 (non-negotiable) check.
 */
const CASES = [
  {
    id: "EVAL-01", dod: "D1/D5/D6", title: "team_init output set + net-new skill-forge nudge",
    requires: ["team_init", "team_status"],
    async run(p) {
      const data = await p.call("team_init", { projectName: "eval01" });
      assert.equal(data.netNew, true, "net-new dir should report netNew=true");
      assert.ok(typeof data.skillForgeNudge === "string" && data.skillForgeNudge.length > 0,
        "net-new team_init must include a skill-forge nudge (D5)");
      for (const rel of ["_team/", ".claude/agents/", ".mcp.json", "_team/dashboard.html"])
        assert.ok(data.created.some((c) => c.includes(rel.replace(/\/$/, ""))), `team_init should create ${rel}`);
      for (const f of ["_team/STATE.md", "_team/PROGRESS.md", "_team/ROLES.md", ".mcp.json", "_team/dashboard.html"])
        assert.ok(fs.existsSync(path.join(p.dir, f)), `${f} must exist on disk after team_init`);
      const status = await p.call("team_status", {});
      assert.equal(typeof status.state, "object");
    },
    subfindings(p, notes) {
      // D9 sub-check: PLAN §9.5 says team_init should write a scoped .claude/settings.json allowlist.
      const hasSettings = fs.existsSync(path.join(p.dir, ".claude", "settings.json"));
      if (!hasSettings) notes.push("D9 GAP: team_init did NOT write .claude/settings.json (the scoped allowlist per PLAN §9.5) — zero-friction deployment unimplemented in M1/M2.");
    },
  },
  {
    id: "EVAL-02", dod: "D1/D2", title: "agent_list after a create sequence",
    requires: ["team_init", "agent_create", "agent_list"],
    async run(p) {
      await p.call("team_init", { projectName: "eval02" });
      await p.call("agent_create", { name: "agent-x", role: "debugger", taskContext: "t" });
      await p.call("agent_create", { name: "agent-y", role: "code-reviewer", taskContext: "t" });
      const list = await p.call("agent_list", {});
      const arr = list.agents || list.list || [];
      const names = new Set(arr.map((a) => a.name || a.agent));
      assert.ok(names.has("agent-x") && names.has("agent-y"), "agent_list must include X and Y");
      assert.ok(fs.existsSync(path.join(p.dir, ".claude/agents/agent-x.md")), "agent-x.md on disk");
      assert.ok(fs.existsSync(path.join(p.dir, ".claude/agents/agent-y.md")), "agent-y.md on disk");
    },
  },
  {
    id: "EVAL-03", dod: "D2", title: "agent_delete archives, never hard-deletes",
    requires: ["team_init", "agent_create", "agent_delete", "agent_list"],
    async run(p) {
      await p.call("team_init", { projectName: "eval03" });
      await p.call("agent_create", { name: "agent-x", role: "debugger", taskContext: "t" });
      await p.call("agent_delete", { name: "agent-x" });
      assert.ok(!fs.existsSync(path.join(p.dir, ".claude/agents/agent-x.md")), "agent-x.md removed from active path");
      const archived = fs.existsSync(path.join(p.dir, "_team/archive"))
        && fs.readdirSync(path.join(p.dir, "_team/archive")).some((f) => f.startsWith("agent-x-"));
      assert.ok(archived, "a copy of X must exist under _team/archive/ (never hard-deleted)");
      const list = await p.call("agent_list", {});
      const arr = list.agents || list.list || [];
      assert.ok(!arr.some((a) => (a.name || a.agent) === "agent-x"), "X absent from active roster");
    },
  },
  {
    id: "EVAL-04", dod: "D3", title: "manager_tick flags a 2x-past-ETA stale claim",
    requires: ["team_init", "agent_create", "state_write", "manager_tick"],
    async run(p) {
      await p.call("team_init", { projectName: "eval04" });
      await p.call("agent_create", { name: "agent-x", role: "debugger", taskContext: "t" });
      const overdue = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      await p.call("state_write", { op: "claim", task: "overdue-task", owner: "agent-x", eta: overdue });
      const tick = await p.call("manager_tick", {});
      assert.ok(Array.isArray(tick.staleClaims) && tick.staleClaims.some((s) => s.task === "overdue-task"),
        "manager_tick must classify overdue-task as a stale claim");
      assert.ok(tick.recommendations && tick.recommendations.length >= 1, "expected a recommendations report");
    },
  },
  {
    id: "EVAL-05", dod: "D2", title: "ROLES.md records superteam provenance for debugger",
    requires: ["team_init", "agent_create", "role_get"],
    async run(p) {
      await p.call("team_init", { projectName: "eval05" });
      await p.call("agent_create", { name: "agent-x", role: "debugger", taskContext: "t" });
      const roles = fs.readFileSync(path.join(p.dir, "_team/ROLES.md"), "utf8");
      assert.ok(/debugger/.test(roles), "ROLES.md must list the debugger role");
      assert.ok(/agent-x\.md/.test(roles), "ROLES.md must map the role to X's agent file");
      const rg = await p.call("role_get", { role: "debugger" });
      assert.ok(rg, "role_get(debugger) must resolve to a real template");
    },
  },
  {
    id: "EVAL-06", dod: "D2", title: "role_list returns the curated v1 catalog (10), not the full library",
    requires: ["role_list"],
    async run(p) {
      const rl = await p.call("role_list", {});
      const roles = rl.roles || [];
      assert.equal(rl.count ?? roles.length, 10, "curated catalog must be exactly 10 roles (PLAN §6; no 232 bulk)");
      const names = new Set(roles.map((r) => r.role || r.name));
      for (const expected of ["agent-manager", "debugger", "security-auditor", "docs-writer"])
        assert.ok(names.has(expected), `catalog must include ${expected}`);
    },
  },
  {
    id: "EVAL-07", dod: "D7", title: "dashboard auto-regenerates on a state mutation (no explicit refresh)",
    requires: ["team_init", "progress_log", "dashboard_refresh"],
    async run(p) {
      await p.call("team_init", { projectName: "eval07" });
      const dash = path.join(p.dir, "_team", "dashboard.html");
      assert.ok(fs.existsSync(dash), "team_init should seed _team/dashboard.html");
      const before = fs.readFileSync(dash, "utf8");
      // A state mutation WITHOUT calling dashboard_refresh — it must auto-regen (DoD 7).
      await p.call("progress_log", { actor: "agent-x", event: "note", outcome: "eval07-mutation" });
      const after = fs.readFileSync(dash, "utf8");
      assert.notEqual(after, before, "dashboard.html must change after a state mutation, with NO explicit dashboard_refresh call (auto-regen)");
      assert.ok(after.includes("eval07-mutation") || after.length !== before.length,
        "regenerated dashboard should reflect the new state");
    },
  },
  {
    id: "EVAL-15", dod: "D7", title: "dashboard is self-contained (no external network requests)",
    requires: ["team_init", "dashboard_refresh"],
    async run(p) {
      await p.call("team_init", { projectName: "eval15" });
      await p.call("dashboard_refresh", {});
      const html = fs.readFileSync(path.join(p.dir, "_team", "dashboard.html"), "utf8");
      // No external hosts: no CDN scripts/styles, remote fonts, or remote images (M4 acceptance).
      const external = [...html.matchAll(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi)].map((m) => m[0]);
      assert.equal(external.length, 0, `dashboard must be self-contained — found external refs: ${external.slice(0, 3).join(", ")}`);
    },
  },
  {
    id: "EVAL-08", dod: "D2", title: "agent_assign_role updates ROLES.md refinement history",
    requires: ["team_init", "agent_create", "agent_assign_role"],
    async run(p) {
      await p.call("team_init", { projectName: "eval08" });
      await p.call("agent_create", { name: "agent-x", role: "debugger", taskContext: "t" });
      await p.call("agent_assign_role", { name: "agent-x", role: "code-reviewer" });
      const roles = fs.readFileSync(path.join(p.dir, "_team/ROLES.md"), "utf8");
      assert.ok(/code-reviewer/.test(roles), "ROLES.md must reflect the new code-reviewer role for X");
    },
  },
  {
    id: "EVAL-09", dod: "D3", title: "PROGRESS.md is append-only under concurrent writes",
    requires: ["team_init", "progress_log"],
    async run(p) {
      await p.call("team_init", { projectName: "eval09" });
      const before = fs.readFileSync(path.join(p.dir, "_team/PROGRESS.md"), "utf8");
      const N = 5;
      await Promise.all(
        Array.from({ length: N }, (_, i) =>
          p.call("progress_log", { actor: `a${i}`, event: "note", outcome: `concurrent-${i}` })),
      );
      const after = fs.readFileSync(path.join(p.dir, "_team/PROGRESS.md"), "utf8");
      assert.ok(after.startsWith(before),
        "pre-existing PROGRESS.md content must remain an intact PREFIX (append-only — new lines only appended after old, never prepended/reordered)");
      for (let i = 0; i < N; i++)
        assert.ok(after.includes(`concurrent-${i}`), `entry concurrent-${i} must be present (no lost write)`);
    },
  },
  {
    id: "EVAL-10", dod: "D8/§3.8", title: "server/session boundary: compiled server has NO model/spawn/network APIs", guardrail: true,
    requires: ["team_init", "agent_create", "manager_tick"],
    async run(p) {
      // (a) runtime: the report tools return pure structured data (a report, not an action).
      await p.call("team_init", { projectName: "eval10" });
      const a = await p.call("agent_create", { name: "agent-x", role: "debugger", taskContext: "t" });
      const t = await p.call("manager_tick", {});
      assert.equal(typeof a, "object", "agent_create returns structured data");
      assert.ok(Array.isArray(t.recommendations), "manager_tick yields recommendations, does not act");
      // (b) STATIC PROOF (the real guardrail): scan the SHIPPED compiled server for
      // any model/spawn/network API. §3.8 says the server never runs models nor
      // spawns agents — so these must be entirely absent from what actually ships.
      const distDir = path.join(SERVER_DIR, "dist");
      const jsFiles = [];
      (function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const f = path.join(d, e.name);
          if (e.isDirectory()) walk(f);
          else if (e.name.endsWith(".js")) jsFiles.push(f);
        }
      })(distDir);
      const FORBIDDEN = [
        [/\bchild_process\b/, "child_process (spawns processes)"],
        [/\bspawn\s*\(/, "spawn( call"],
        [/\bexecFile|\bexecSync|[^.]\bexec\s*\(/, "exec/execFile (subprocess)"],
        [/@anthropic-ai|@modelcontextprotocol\/sdk\/client|\bopenai\b/i, "an LLM/agent client"],
        [/https?:\/\/api\.|\bfetch\s*\(|node:https?\b|require\(["']https?["']\)/, "an outbound network call"],
      ];
      const hits = [];
      for (const f of jsFiles) {
        const src = fs.readFileSync(f, "utf8");
        for (const [re, label] of FORBIDDEN)
          if (re.test(src)) hits.push(`${path.relative(SERVER_DIR, f)}: ${label}`);
      }
      assert.equal(hits.length, 0, `§3.8 boundary breach — forbidden API in shipped server: ${hits.join("; ")}`);
    },
  },
  {
    id: "EVAL-12", dod: "D6", title: "team_init is idempotent (second run does not duplicate/corrupt)",
    requires: ["team_init"],
    async run(p) {
      await p.call("team_init", { projectName: "eval12" });
      const snap = (f) => fs.readFileSync(path.join(p.dir, f), "utf8");
      const stateBefore = snap("_team/STATE.md");
      const second = await p.call("team_init", { projectName: "eval12" });
      assert.equal(second.netNew, false, "second run must NOT report net-new");
      assert.ok(fs.existsSync(path.join(p.dir, "_team/STATE.md")), "STATE.md still present");
      // idempotent: the harness must not have duplicated the harness dirs.
      const agentsCount = fs.readdirSync(path.join(p.dir, "_team")).length;
      assert.ok(agentsCount >= 3, "_team retains its files, not duplicated");
      assert.ok(stateBefore.includes("## Team"), "STATE.md must have a ## Team section after team_init");
      assert.ok(snap("_team/STATE.md").includes("## Team"), "STATE.md must RETAIN its ## Team section after the idempotent re-run");
    },
  },
  {
    id: "EVAL-14", dod: "D2", title: "roles_sync reconciles ROLES.md against .claude/agents reality",
    requires: ["team_init", "agent_create", "roles_sync"],
    async run(p) {
      await p.call("team_init", { projectName: "eval14" });
      await p.call("agent_create", { name: "agent-x", role: "debugger", taskContext: "t" });
      const sync = await p.call("roles_sync", {});
      assert.ok((sync.agentFiles ?? 0) >= 1, "roles_sync should count the agent file(s)");
      assert.ok((sync.registeredRoles ?? 0) >= 1, "roles_sync should count registered role(s)");
    },
  },
  {
    id: "EVAL-11", dod: "D2/D5", title: "team:skill-forge produces a spec-conformant SKILL.md",
    // skill-forge is a plugin skill, so no server tool will ever satisfy this —
    // it stays permanently gated here and is really scored by M3-04.
    requires: ["skill_forge"],
    async run() { throw new Error("unreachable — gated by requires"); },
  },
  {
    id: "EVAL-13", dod: "D9", title: "D9 negative gate: git-push/network/rm stay gated after team_init",
    requires: ["__not_harnessable__"], // permission gating is a session-layer behavior, not observable from the MCP surface
    async run() { throw new Error("unreachable — gated by requires"); },
  },
];

// ---- run ----
const results = [];
const notes = [];
const available = await toolset();

for (const c of CASES) {
  const missing = (c.requires || []).filter((t) => !available.has(t));
  if (missing.length) {
    const regressed = missing.filter((t) => EXPECTED_TOOLS.has(t));
    if (regressed.length) {
      const detail = `REGRESSION — expected tool(s) missing from the built server: ${regressed.join(", ")}`;
      results.push({ ...c, status: "FAIL", detail });
      console.log(`  ✗ ${c.id} FAIL — ${detail}`);
      continue;
    }
    let reason;
    if (missing.includes("dashboard_refresh")) reason = "M4 (dashboard) not built — no dashboard_refresh tool";
    else if (missing.includes("skill_forge")) reason = "not a server tool by design — team:skill-forge is a plugin skill; scored as M3-04 by run-plugin-evals.mjs";
    else if (missing.includes("__not_harnessable__")) reason = "permission gating is a session-layer behavior, not observable from the MCP tool surface; verify via D9 matrix on Desktop/CLI";
    else reason = `missing tool(s): ${missing.join(", ")}`;
    results.push({ ...c, status: "BLOCKED", detail: reason });
    console.log(`  ⃠ ${c.id} BLOCKED — ${reason}`);
    continue;
  }
  const p = await freshProject();
  try {
    await c.run(p);
    if (c.subfindings) c.subfindings(p, notes);
    results.push({ ...c, status: "PASS", detail: "" });
    console.log(`  ✓ ${c.id} PASS — ${c.title}`);
  } catch (err) {
    results.push({ ...c, status: "FAIL", detail: String(err.message || err) });
    console.log(`  ✗ ${c.id} FAIL — ${c.title}\n      ${err.message || err}`);
  } finally {
    await p.close();
  }
}

// ---- score (EVAL-RUBRIC.md §1) ----
const scoreable = results.filter((r) => r.status !== "BLOCKED");
const passed = scoreable.filter((r) => r.status === "PASS");
const failed = scoreable.filter((r) => r.status === "FAIL");
const blocked = results.filter((r) => r.status === "BLOCKED");
const guardrailBreaches = failed.filter((r) => r.guardrail);
const axis1Rate = scoreable.length ? (passed.length / scoreable.length) : 0;
const axis1Pass = scoreable.length > 0 && failed.length === 0;
const axis2Pass = guardrailBreaches.length === 0;

const stamp = new Date().toISOString();

// Report the build state we actually observed, never a hardcoded claim. The
// previous static line ("M1+M2 tools present; M3/M4 not built") kept asserting
// M3/M4 were unbuilt for every run after they landed — the report card
// contradicted both git and its own scoreboard.
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const gitHead = (() => {
  try {
    return execFileSync("git", ["-C", REPO_ROOT, "log", "--oneline", "-1"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable (not a git checkout)";
  }
})();
const milestoneSurface = [
  `M1/M2 state+team tools: ${[...EXPECTED_TOOLS].filter((t) => t !== "dashboard_refresh" && available.has(t)).length}/13`,
  `M4 dashboard_refresh: ${available.has("dashboard_refresh") ? "present" : "absent"}`,
].join(" · ");

const line = (r) => `| ${r.id} | ${r.dod} | ${r.title} | **${r.status}** | ${r.detail || "—"} |`;
const md = `# Agent Army — Eval Results (executable harness)

> Generated by \`evals/harness/run-evals.mjs\` against the live compiled server
> (real stdio MCP surface). Scored per \`EVAL-RUBRIC.md\` §1. Run: ${stamp}.
> git HEAD at run time: \`${gitHead}\`
> Observed MCP tool surface: ${available.size} tool(s) — ${milestoneSurface}.
> M3 (plugin) is not a server tool surface — it is scored by \`run-plugin-evals.mjs\`.

## Axis 1 — Functional correctness
- Scoreable: ${scoreable.length} · **PASS ${passed.length} / FAIL ${failed.length}** · BLOCKED ${blocked.length} (excluded)
- Rate (of scoreable): **${(axis1Rate * 100).toFixed(0)}%** · Floor = 100% of scoreable → **${axis1Pass ? "MET ✅" : "NOT MET ❌"}**

## Axis 2 — Guardrail integrity (non-negotiable)
- Guardrail breaches: **${guardrailBreaches.length}** → **${axis2Pass ? "MET ✅ (zero breaches)" : "FAIL ❌"}**
- Note: full Axis-2 coverage requires the B-scenario runs (prediction PAPER-mode, LinkedIn/course human-gate), which drive plugin skills end-to-end rather than the stdio tool surface — not yet implemented here.

## Axis 3 — Operational quality (scenarios)
- **Not scored in this pass** — requires the end-to-end B(1)/B(2)/B(3) scenario runs. M3/M4 have landed, so these are no longer milestone-blocked; the scenario harness itself is still unwritten.

## Results
| Eval | DoD | What it checks | Verdict | Detail |
|---|---|---|---|---|
${results.map(line).join("\n")}

## Sub-findings / gaps surfaced this run
${notes.length ? notes.map((n) => `- ${n}`).join("\n") : "- (none)"}

## Run verdict (functional layer)
**${axis1Pass && axis2Pass ? "PASS (functional + guardrail floors met on all scoreable cases)" : "FAIL — see above"}**
BLOCKED cases are not failures — they are checks this harness structurally cannot observe from the stdio MCP surface: plugin-skill behavior (scored by \`run-plugin-evals.mjs\`) or session-layer permission gating (route to the D9 matrix on Desktop/CLI).
`;

fs.writeFileSync(RESULTS_MD, md, "utf8");

// Machine-readable results for the dashboard aggregator.
const RESULTS_DIR = path.resolve(__dirname, "..", "results");
fs.mkdirSync(RESULTS_DIR, { recursive: true });
fs.writeFileSync(path.join(RESULTS_DIR, "functional.json"), JSON.stringify({
  suite: "functional-mcp",
  generatedAt: stamp,
  axis1: { scoreable: scoreable.length, pass: passed.length, fail: failed.length, blocked: blocked.length, floorMet: axis1Pass },
  axis2: { guardrailBreaches: guardrailBreaches.length, floorMet: axis2Pass },
  cases: results.map((r) => ({ id: r.id, dod: r.dod, milestone: MILESTONE[r.id] || "?", title: r.title, status: r.status, detail: r.detail, guardrail: !!r.guardrail })),
  notes,
}, null, 2), "utf8");

console.log(`\n${"=".repeat(60)}`);
console.log(`Axis1 ${passed.length}/${scoreable.length} PASS (${failed.length} fail, ${blocked.length} blocked) · Axis2 ${guardrailBreaches.length} breaches`);
console.log(`Results written: ${RESULTS_MD}`);
if (!axis1Pass || !axis2Pass) process.exit(1);
