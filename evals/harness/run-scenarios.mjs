#!/usr/bin/env node
/**
 * Agent Army — B-scenario use-case evals (Evelyn / Evaluator). Axis 3 of
 * EVAL-RUBRIC §1, scenarios defined in EVAL-RUBRIC §4 + EVALS-DRAFT §B.
 *
 * Drives the REAL compiled server over stdio through the workflow shape of the
 * three sample use-cases (_coordination/SAMPLE-USE-CASE/):
 *   B1 — prediction-market lab, PAPER mode (PLAN §8 flagship regression)
 *   B2 — LinkedIn content engine (outbound gate per post)
 *   B3 — online-course launch (money + outbound + founder-decision gates)
 *
 * Deterministic tool-layer runs: no LLM dispatch, no network. What the LLM
 * layer would author is simulated with fixture content; what this PROVES is the
 * harness contract non-technical users depend on — state fidelity, audit
 * trail, human gates that nothing crosses silently, manager-loop signal, and a
 * truthful dashboard. Scored per dimension (25/20/25/20/10), floor >=80 with no
 * dimension <60. Writes evals/results/scenarios.json. Exit 1 on any FAIL.
 */
import * as fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..", "..", "server");
const SERVER_ENTRY = path.join(SERVER_DIR, "dist", "index.js");
const OUT = path.resolve(__dirname, "..", "results", "scenarios.json");

const require = createRequire(path.join(SERVER_DIR, "package.json"));
const importSdk = (spec) => import(pathToFileURL(require.resolve(spec)).href);
const { Client } = await importSdk("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = await importSdk("@modelcontextprotocol/sdk/client/stdio.js");

if (!fs.existsSync(SERVER_ENTRY)) {
  console.error(`✗ server not built: ${SERVER_ENTRY} missing. Run 'cd server && npm run build' first.`);
  process.exit(2);
}

async function freshProject() {
  const dir = mkdtempSync(path.join(tmpdir(), "agent-army-scenario-"));
  const transport = new StdioClientTransport({ command: process.execPath, args: [SERVER_ENTRY], cwd: dir, stderr: "pipe" });
  const client = new Client({ name: "scenario-harness", version: "0.0.0" });
  try {
    await client.connect(transport);
    transport.stderr?.on("data", () => {});
  } catch (e) { rmSync(dir, { recursive: true, force: true }); throw e; }
  return {
    dir, client,
    async call(name, args = {}) {
      const res = await client.callTool({ name, arguments: args });
      if (res.isError) throw new Error(`tool ${name} error: ${JSON.stringify(res.content).slice(0, 300)}`);
      return res.structuredContent;
    },
    read(rel) { try { return fs.readFileSync(path.join(dir, rel), "utf8"); } catch { return ""; } },
    async close() { try { await client.close(); } finally { rmSync(dir, { recursive: true, force: true }); } },
  };
}

/** Dimension scorer: checks are [label, boolean]; score = 100 * passed/total. */
function scoreDims(dims) {
  const scored = dims.map(({ name, weight, checks }) => {
    const passed = checks.filter(([, ok]) => ok).length;
    const score = checks.length ? Math.round((passed / checks.length) * 100) : 0;
    return { name, weight, score, checks: checks.map(([label, ok]) => ({ label, ok })) };
  });
  const weighted = Math.round(scored.reduce((s, d) => s + d.score * d.weight, 0) / 100);
  const floorBreach = scored.filter((d) => d.score < 60).map((d) => d.name);
  const status = weighted >= 80 && floorBreach.length === 0 ? "PASS" : "FAIL";
  return { weighted, dims: scored, floorBreach, status };
}

const GATE = "AWAITING APPROVAL";
const results = [];

/* ───────────────────────── B1 — prediction lab (PAPER) ───────────────────────── */
async function b1() {
  const p = await freshProject();
  try {
    await p.call("team_init", { projectName: "prediction-lab" });
    await p.call("agent_create", { name: "resolution-auditor", role: "security-auditor", taskContext: "audit settlement wording of candidate markets" });
    await p.call("agent_create", { name: "quant-analyst", role: "performance-engineer", taskContext: "EV/edge math on candidate markets" });
    await p.call("agent_create", { name: "risk-manager", role: "agent-manager", taskContext: "portfolio exposure + hard-stop rules" });

    const task = "PAPER: research KXCPI-26JUL — recommendation with sources, no execution";
    await p.call("state_write", { op: "claim", task, owner: "quant-analyst" });
    await p.call("progress_log", { actor: "quant-analyst", event: "recommendation", outcome: "PAPER: KXCPI-26JUL YES p_true=0.48 vs market 0.42, edge 6pts pre-fee — sources: arxiv.org/abs/2604.14199; docs.kalshi.com/quick_start" });
    await p.call("progress_log", { actor: "resolution-auditor", event: "recommendation-audit", outcome: "PAPER: settlement wording unambiguous (BLS CPI print, source pinned) — sources: kalshi rulebook KXCPI-26JUL" });
    await p.call("state_write", { op: "set_blockers", blockers: [
      `${GATE} (money gate): any PAPER→LIVE switch — Akash only`,
      `${GATE} (execution gate): PAPER ledger order KXCPI-26JUL YES 100@0.42 — human must approve before any live analog`,
    ] });
    await p.call("state_write", { op: "complete", task });

    // Plant a 2x-past-ETA stale claim, then run the manager loop.
    const past = new Date(Date.now() - 3 * 3600e3).toISOString();
    const eta = new Date(Date.now() - 90 * 60e3).toISOString();
    await p.call("state_write", { op: "claim", task: "stale probe: abandoned scan", owner: "resolution-auditor", eta });
    // claimed_at is server-stamped; a 90-min-past ETA alone is >2x past for a short claim window.
    const tick = await p.call("manager_tick", {});
    const findings = JSON.stringify(tick ?? {});
    await p.call("state_write", { op: "record_tick" });

    const state = p.read("_team/STATE.md"), progress = p.read("_team/PROGRESS.md"), dash = p.read("_team/dashboard.html");
    const recLines = progress.split("\n").filter((l) => /\u2014 recommendation(?:-audit)?:/.test(l));

    return scoreDims([
      { name: "State fidelity", weight: 25, checks: [
        ["all 3 council agents in Team table", ["resolution-auditor", "quant-analyst", "risk-manager"].every((a) => state.includes(a))],
        ["completed research task no longer in Active Work", !state.split("## Blockers")[0].split("## Active Work")[1]?.includes("research KXCPI-26JUL")],
        ["planted stale claim present in Active Work", state.includes("stale probe: abandoned scan")],
        ["last_manager_tick stamped", /last_manager_tick: "20/.test(state)],
      ] },
      { name: "Audit completeness", weight: 20, checks: [
        ["claim + done trail in PROGRESS", progress.includes("claim") && progress.includes("done")],
        ["both recommendations logged", recLines.length >= 2],
        ["every recommendation carries sources", recLines.every((l) => l.includes("sources:"))],
        ["entries attributed + ISO-timestamped", /- \[20\d\d-\d\d-\d\dT[^\]]+\] quant-analyst — recommendation/.test(progress)],
      ] },
      { name: "Human-gate hygiene", weight: 25, checks: [
        ["money gate rests in Blockers", state.includes("money gate") && state.includes(GATE)],
        ["execution gate rests in Blockers", state.includes("execution gate")],
        ["no execution-shaped PROGRESS entry outside PAPER/gate marking", progress.split("\n").filter((l) => l.startsWith("- [") && /\b(order|trade|executed)\b/i.test(l)).every((l) => /PAPER|AWAITING/i.test(l))],
        ["gates still standing at scenario end (nothing self-approved)", p.read("_team/STATE.md").includes(GATE)],
      ] },
      { name: "Manager-loop efficacy", weight: 20, checks: [
        ["tick flags the planted stale claim", /stale/i.test(findings) && findings.includes("stale probe")],
        ["tick returns structured findings (not an error blob)", !!tick && typeof tick === "object"],
        ["no false pile (≤4 findings for 1 planted issue + real gaps)", (findings.match(/"finding"|"type"/g) || []).length <= 8],
      ] },
      { name: "Dashboard truth", weight: 10, checks: [
        ["dashboard reflects agents + blockers", dash.includes("quant-analyst") && dash.includes("money gate")],
        ["dashboard self-contained (no external refs)", ![...dash.matchAll(/(?:src|href)\s*=\s*["']https?:\/\//gi)].length],
      ] },
    ]);
  } finally { await p.close(); }
}

/* ───────────────────────── B2 — LinkedIn content engine ───────────────────────── */
async function b2() {
  const p = await freshProject();
  try {
    await p.call("team_init", { projectName: "linkedin-engine" });
    await p.call("agent_create", { name: "content-strategist", role: "docs-writer", taskContext: "content strategy playbook, audience segments" });
    await p.call("agent_create", { name: "post-writer", role: "docs-writer", taskContext: "draft posts per playbook" });

    const task = "draft 3 LinkedIn posts (AI-adoption niche) — drafts only, publishing is human-gated";
    await p.call("state_write", { op: "claim", task, owner: "post-writer" });
    for (const n of [1, 2, 3]) {
      await p.call("progress_log", { actor: "post-writer", event: "draft", outcome: `post ${n}/3 drafted (hook + body + CTA) — sources: playbook v1; LinkedIn algo research 2026-06` });
    }
    await p.call("state_write", { op: "set_blockers", blockers: [
      `${GATE} (outbound gate): publish post 1 to LinkedIn`,
      `${GATE} (outbound gate): publish post 2 to LinkedIn`,
      `${GATE} (outbound gate): publish post 3 to LinkedIn`,
      `${GATE} (outbound gate): 5 daily comments on high-visibility profiles — per-item approval`,
    ] });
    await p.call("state_write", { op: "complete", task });
    const tick = await p.call("manager_tick", {});
    await p.call("state_write", { op: "record_tick" });

    const state = p.read("_team/STATE.md"), progress = p.read("_team/PROGRESS.md"), dash = p.read("_team/dashboard.html");
    const stateBody = state.slice(state.indexOf("# STATE.md"));
    const drafts = progress.split("\n").filter((l) => l.includes("— draft:"));

    return scoreDims([
      { name: "State fidelity", weight: 25, checks: [
        ["both content agents in Team table", state.includes("content-strategist") && state.includes("post-writer")],
        ["draft task completed out of Active Work", !state.split("## Active Work")[1]?.split("##")[0]?.includes("draft 3 LinkedIn posts")],
        ["last_manager_tick stamped", /last_manager_tick: "20/.test(state)],
      ] },
      { name: "Audit completeness", weight: 20, checks: [
        ["3 drafts logged", drafts.length === 3],
        ["every draft sourced (playbook/research)", drafts.every((l) => l.includes("sources:"))],
        ["attributed + timestamped", drafts.every((l) => /- \[20\d\d-.*\] post-writer/.test(l))],
      ] },
      { name: "Human-gate hygiene", weight: 25, checks: [
        ["one outbound gate per post (3) + comments gate", (stateBody.match(/outbound gate/g) || []).length === 4],
        ["no published/posted event in PROGRESS without approval marker", progress.split("\n").filter((l) => /publish|posted/i.test(l)).every((l) => /AWAITING|gate/i.test(l))],
        ["gates still standing at end", state.includes(GATE)],
      ] },
      { name: "Manager-loop efficacy", weight: 20, checks: [
        ["tick runs clean on a healthy board", !!tick],
        ["tick does not invent stale claims (none planted)", !/stale/i.test(JSON.stringify(tick)) || !JSON.stringify(tick).includes("draft 3 LinkedIn")],
      ] },
      { name: "Dashboard truth", weight: 10, checks: [
        ["dashboard shows outbound gates", dash.includes("outbound gate")],
        ["dashboard self-contained", ![...dash.matchAll(/(?:src|href)\s*=\s*["']https?:\/\//gi)].length],
      ] },
    ]);
  } finally { await p.close(); }
}

/* ───────────────────────── B3 — online-course launch ───────────────────────── */
async function b3() {
  const p = await freshProject();
  try {
    await p.call("team_init", { projectName: "course-launch" });
    await p.call("agent_create", { name: "launch-planner", role: "systems-architect", taskContext: "25-day launch plan + task board" });
    await p.call("agent_create", { name: "copy-writer", role: "docs-writer", taskContext: "emails, landing page, LinkedIn drafts" });
    await p.call("agent_create", { name: "funnel-analyst", role: "performance-engineer", taskContext: "funnel + ad plan math" });

    for (const [owner, task] of [
      ["launch-planner", "draft launch checklist (25 days to Jul 31)"],
      ["copy-writer", "draft 7-email launch sequence"],
      ["funnel-analyst", "draft $2K Meta ad plan with expected math — DRAFT ONLY, spend is money-gated"],
    ]) {
      await p.call("state_write", { op: "claim", task, owner });
      await p.call("progress_log", { actor: owner, event: "deliverable", outcome: `${task} — drafted; sources: SAMPLE-USE-CASE-3 folder (00_START_HERE, 01_Launch_Plan, 06_Funnel_Acquisition_Plan)` });
      await p.call("state_write", { op: "complete", task });
    }
    await p.call("state_write", { op: "set_blockers", blockers: [
      `${GATE} (founder decision): platform — Podia vs Teachable`,
      `${GATE} (founder decision): price $497/$597 + 3-pay $179`,
      `${GATE} (money gate): commit $2K Meta ad spend`,
      `${GATE} (outbound gate): send beta invite DMs to 30 warm contacts`,
      `${GATE} (auth gate): Meta Business account + pixel need founder login`,
    ] });
    const tick = await p.call("manager_tick", {});
    await p.call("state_write", { op: "record_tick" });

    const state = p.read("_team/STATE.md"), progress = p.read("_team/PROGRESS.md"), dash = p.read("_team/dashboard.html");
    const stateBody = state.slice(state.indexOf("# STATE.md"));
    const deliverables = progress.split("\n").filter((l) => l.includes("— deliverable:"));

    return scoreDims([
      { name: "State fidelity", weight: 25, checks: [
        ["all 3 launch agents in Team table", ["launch-planner", "copy-writer", "funnel-analyst"].every((a) => state.includes(a))],
        ["all 3 deliverable tasks completed out of Active Work", !["launch checklist", "7-email", "$2K Meta ad plan"].some((t) => state.split("## Active Work")[1]?.split("##")[0]?.includes(t))],
        ["last_manager_tick stamped", /last_manager_tick: "20/.test(state)],
      ] },
      { name: "Audit completeness", weight: 20, checks: [
        ["3 deliverables logged", deliverables.length === 3],
        ["every deliverable sourced to the UC-3 folder", deliverables.every((l) => l.includes("sources:"))],
        ["every deliverable attributed to its agent", ["launch-planner", "copy-writer", "funnel-analyst"].every((a) => deliverables.some((l) => l.includes(`] ${a} —`)))],
      ] },
      { name: "Human-gate hygiene", weight: 25, checks: [
        ["founder decisions rest in Blockers (never self-decided)", (stateBody.match(/founder decision/g) || []).length === 2],
        ["money gate ($2K spend) rests in Blockers", state.includes("money gate")],
        ["outbound (DMs) + auth gates rest in Blockers", state.includes("outbound gate") && state.includes("auth gate")],
        ["no spend/sent/authed event in PROGRESS without gate marker", progress.split("\n").filter((l) => /spend|sent|authed|launched/i.test(l)).every((l) => /AWAITING|gate|DRAFT/i.test(l))],
        ["ad plan explicitly DRAFT ONLY in the audit trail", progress.includes("DRAFT ONLY")],
      ] },
      { name: "Manager-loop efficacy", weight: 20, checks: [
        ["tick runs clean post-completion", !!tick],
        ["tick output is structured", typeof tick === "object"],
      ] },
      { name: "Dashboard truth", weight: 10, checks: [
        ["dashboard shows founder gates", dash.includes("founder decision")],
        ["dashboard self-contained", ![...dash.matchAll(/(?:src|href)\s*=\s*["']https?:\/\//gi)].length],
      ] },
    ]);
  } finally { await p.close(); }
}

/* ───────────────────────────────── run ───────────────────────────────── */
const scenarios = [
  ["B1", "Prediction-market lab — PAPER mode (UC-1, PLAN §8 flagship)", b1],
  ["B2", "LinkedIn content engine — outbound-gated (UC-2)", b2],
  ["B3", "Online-course launch — money/outbound/founder-gated (UC-3)", b3],
];

for (const [id, title, fn] of scenarios) {
  process.stdout.write(`▶ ${id} ${title}\n`);
  try {
    const r = await fn();
    results.push({ id, title, ...r });
    console.log(`  ${r.status === "PASS" ? "✅" : "❌"} ${id} ${r.status} — weighted ${r.weighted}/100${r.floorBreach.length ? ` (floor breach: ${r.floorBreach.join(", ")})` : ""}`);
    for (const d of r.dims) console.log(`      ${d.score >= 60 ? "·" : "!"} ${d.name}: ${d.score} (w${d.weight})`);
  } catch (e) {
    results.push({ id, title, status: "FAIL", weighted: 0, dims: [], floorBreach: ["crashed"], error: String(e.message || e).slice(0, 300) });
    console.log(`  ❌ ${id} CRASHED — ${String(e.message || e).slice(0, 160)}`);
  }
}

const axis3 = results.length ? Math.min(...results.map((r) => r.weighted)) : 0;
const fail = results.filter((r) => r.status !== "PASS").length;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  suite: "b-scenarios", milestone: "M5", generatedAt: new Date().toISOString(),
  axis3: { score: axis3, rule: "min(scenario weighted scores); floor >=80, no dimension <60", floorMet: axis3 >= 80 && fail === 0 },
  scenarios: results,
}, null, 2) + "\n", "utf8");

console.log(`\nAxis 3 (operational quality): ${axis3}/100 — floor(80) ${axis3 >= 80 && fail === 0 ? "MET ✅" : "NOT MET ❌"}`);
console.log(`Results: ${OUT}`);
process.exit(fail > 0 ? 1 : 0);
