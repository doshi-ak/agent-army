#!/usr/bin/env node
/**
 * Agent Army — eval regression entry point (Evelyn / Evaluator).
 *
 * ONE command that runs the whole eval regression end-to-end and rebuilds the
 * report card. This is what a reviewer (Olga, Cody Banks, Excelcius) runs to
 * reproduce my results — no hidden steps.
 *
 *   1. functional MCP evals   (drives the real compiled server over stdio)
 *   2. per-role conformance   (all 232 library roles + 10 curated)
 *   3. harness meta-evals     (test-the-tester; must run after 1 & 2)
 *   4. build the dashboard     (evals/DASHBOARD.html)
 *
 * Requires the server to be built first:  cd server && npm run build
 * Run:  node evals/harness/run-all.mjs   (exit 1 if any stage fails)
 */
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIST = path.resolve(here, "..", "..", "server", "dist", "index.js");

const stages = [
  ["functional MCP evals", "run-evals.mjs"],
  ["per-role conformance", "run-role-evals.mjs"],
  ["M3 plugin conformance", "run-plugin-evals.mjs"],
  ["B-scenario use-case evals (Axis 3)", "run-scenarios.mjs"],
  ["harness meta-evals (test-the-tester)", "run-meta-evals.mjs"],
  ["build dashboard", "build-dashboard.mjs"],
  ["milestone scoreboards", "scoreboard.mjs"],
];

if (!fs.existsSync(SERVER_DIST)) {
  console.error(`✗ server not built (${SERVER_DIST} missing). Run: cd server && npm run build`);
  process.exit(2);
}

// Single-writer lock: the */30 cron and manual runs race otherwise — proven
// 2026-07-17 08:12Z (roles suite crashed mid-run → INVALID verdict; adjudication
// B5). mkdir is atomic; a lock older than 10 min is a dead run and is stolen.
const LOCK = path.resolve(here, "..", "results.lock");
try {
  fs.mkdirSync(LOCK);
} catch {
  const age = Date.now() - (fs.statSync(LOCK, { throwIfNoEntry: false })?.mtimeMs ?? 0);
  if (age < 10 * 60 * 1000) {
    console.error(`✗ another eval run holds ${LOCK} (${Math.round(age / 1000)}s old) — skipping to avoid clobbering its results. Re-run when it finishes.`);
    process.exit(3);
  }
  fs.rmSync(LOCK, { recursive: true, force: true });
  fs.mkdirSync(LOCK);
}
process.on("exit", () => { try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} });

// Clear stale SUITE OUTPUTS so a suite that CRASHES before writing its JSON
// cannot leave last run's file behind and let the aggregator report a false
// GREEN. Only files the suites themselves write are cleared — manually recorded
// evidence (session-layer.json, EVAL-RUBRIC §6) must SURVIVE this wipe.
const RES0 = path.resolve(here, "..", "results");
for (const f of ["functional.json", "roles.json", "plugin.json", "harness-meta.json", "scenarios.json"])
  fs.rmSync(path.join(RES0, f), { force: true });
const runStartMs = Date.now();

const stageError = {};
for (const [label, file] of stages) {
  console.log(`\n${"━".repeat(64)}\n▶ ${label}\n${"━".repeat(64)}`);
  try {
    execFileSync(process.execPath, [path.join(here, file)], { stdio: "inherit" });
  } catch {
    stageError[file] = true;
  }
}

// Accurate verdict: separate "is the harness healthy" from "did the product pass".
// A non-zero role/functional stage means the gate FOUND defects (working as
// intended) — only a meta-eval failure means the harness itself is broken.
const RES = path.resolve(here, "..", "results");
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(RES, f), "utf8")); } catch { return null; } };
const fnl = readJson("functional.json"), roles = readJson("roles.json"), meta = readJson("harness-meta.json");

// Fail-closed on a genuine CRASH only: the true signal is "no fresh JSON this run."
// A suite that exits nonzero but DID write fresh results simply found defects
// (correct gate behavior) — that is not a crash.
const fresh = (j) => j && Date.parse(j.generatedAt) >= runStartMs - 1000;
const functionalCrashed = !fresh(fnl);
const rolesCrashed = !fresh(roles);
const suiteCrashed = functionalCrashed || rolesCrashed;

const harnessBroken = suiteCrashed || !fresh(meta) || meta.fail > 0 || stageError["run-meta-evals.mjs"];
const engineFindings = (fnl ? fnl.axis1.fail + fnl.axis2.guardrailBreaches : 0);
const libraryFindings = (roles ? roles.scope.combined.fail : 0);
// Plugin + session-layer FAILs are product findings too — a top-line GREEN that
// hides a red SL row overclaims exactly like the M3 scoreboard used to.
const plugin = readJson("plugin.json"), sl = readJson("session-layer.json"), scen = readJson("scenarios.json");
const pluginFindings = (plugin?.checks ?? []).filter((c) => c.status === "FAIL").length;
const slFindings = (sl?.cases ?? []).filter((c) => c.status === "FAIL").length;
const scenarioFindings = (scen?.scenarios ?? []).filter((s) => s.status !== "PASS").length;
const mustFix = engineFindings + libraryFindings + pluginFindings + slFindings + scenarioFindings;
if (suiteCrashed) console.error(`\n⚠️  A suite crashed before writing fresh results (functional=${functionalCrashed}, roles=${rolesCrashed}) — results are INVALID, not green.`);

console.log(`\n${"═".repeat(64)}`);
console.log(`HARNESS SELF-TEST : ${harnessBroken ? "❌ BROKEN — do not trust these results" : `✅ VALIDATED (${meta.pass}/${meta.total} meta-evals pass)`}`);
console.log(`PRODUCT FINDINGS  : ${mustFix} must-fix  (engine ${engineFindings} · library ${libraryFindings} · plugin ${pluginFindings} · session-layer ${slFindings} · scenarios ${scenarioFindings})`);
console.log(`GATE VERDICT      : ${harnessBroken ? "INVALID" : mustFix === 0 ? "🟢 GREEN — nothing blocking" : engineFindings ? "🔴 RED — engine/guardrail defect" : "🟠 ORANGE — engine OK, non-engine findings need fixing"}`);
console.log(`REPORT CARD       : evals/DASHBOARD.html`);
// Exit non-zero if the harness is broken OR the gate found must-fix defects
// (the gate blocking on real defects is correct behavior, not a malfunction).
process.exit(harnessBroken || mustFix > 0 ? 1 : 0);
