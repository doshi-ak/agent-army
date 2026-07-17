#!/usr/bin/env node
/**
 * Agent Army — per-milestone eval scoreboard (Evelyn / Evaluator).
 *
 * Rolls the suite results up into M1 / M2 / M3 scoreboards and writes
 * evals/SCOREBOARD.md. Reads results/{functional,plugin,roles,harness-meta}.json.
 * Run after run-all.mjs (or the individual suites). Prints to console + file.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVALS = path.resolve(__dirname, "..");
const RES = path.join(EVALS, "results");
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(RES, f), "utf8")); } catch { return null; } };

const fnl = read("functional.json");
const plugin = read("plugin.json");
const roles = read("roles.json");
const meta = read("harness-meta.json");

// Session-layer results (EVAL-RUBRIC §6): recorded manually by an interactive Code
// session. Missing or stale (recorded against a different HEAD) = BLOCKED, never PASS.
const sl = read("session-layer.json");
let headCommit = "";
try { headCommit = execSync("git rev-parse HEAD", { cwd: path.resolve(EVALS, ".."), encoding: "utf8" }).trim(); } catch { /* scoreboard still renders without git */ }
const slFresh = !!(sl && Array.isArray(sl.cases) && sl.headCommit && headCommit &&
  (headCommit.startsWith(sl.headCommit) || sl.headCommit.startsWith(headCommit)));
const slRows = slFresh
  ? sl.cases.map((c) => ({ id: c.id, title: `session-layer: ${c.title || c.id}`, status: c.status,
      detail: `${sl.runner || "?"} @ ${sl.headCommit.slice(0, 7)}${c.evidence ? " — " + String(c.evidence).slice(0, 80) : ""}` }))
  : [{ id: "SL-1..4", title: "session-layer run (plugin install · 8 skill invocations · D9 gate · skill-forge)",
      status: "BLOCKED", detail: sl ? `recorded against ${sl.headCommit?.slice(0, 7) || "?"} ≠ HEAD ${headCommit.slice(0, 7)} — stale, rerun` : "no results/session-layer.json yet — needs an interactive Code session (EVAL-RUBRIC §6)" }];

const fcases = fnl?.cases ?? [];
const byMs = (ms) => fcases.filter((c) => c.milestone === ms);
const tally = (arr) => ({
  pass: arr.filter((c) => c.status === "PASS").length,
  fail: arr.filter((c) => c.status === "FAIL").length,
  blocked: arr.filter((c) => c.status === "BLOCKED").length,
  total: arr.length,
});

// Milestone definitions: which suites/rows roll into each scoreboard.
const M1 = {
  name: "M1 — Server core (team / agent / role tools)",
  functional: byMs("M1"),
  extra: roles ? [{ id: "CATALOG-10", title: "curated v1 role catalog conforms (10 roles)",
    status: roles.scope.curated.fail === 0 ? "PASS" : "FAIL",
    detail: `${roles.scope.curated.pass}/${roles.scope.curated.total} clean` }] : [],
};
const M2 = {
  name: "M2 — State engine + manager loop (state / progress / roles_sync / manager_tick)",
  functional: byMs("M2"),
  extra: [],
};
const M3 = {
  name: "M3 — Plugin (8 skills + manifest + bundled roles)",
  functional: byMs("M3"),
  extra: [
    ...(plugin?.checks ?? []).map((c) => ({ id: c.id, title: c.title, status: c.status, detail: c.detail })),
    ...(roles ? [{ id: "LIBRARY-232", title: "bundled role library conforms (contract gate)",
      status: roles.scope.library.fail === 0 ? "PASS" : "FAIL",
      detail: `${roles.scope.library.pass + roles.scope.library.warn}/${roles.scope.library.total} usable, ${roles.scope.library.fail} broken, ${roles.scope.library.warn} tidy-ups` }] : []),
    ...slRows,
  ],
  // Architect's M3 acceptance stands REJECTED until the session-layer run lands —
  // file-contract green alone must not read as "M3 accepted" (EVAL-RUBRIC §6).
  cap: slFresh ? null : "🟡 FILE-CONTRACT PASS — acceptance pending session-layer run (EVAL-RUBRIC §6)",
};
const M4 = {
  name: "M4 — Dashboard (auto-regen, self-contained HTML)",
  functional: byMs("M4"),
  extra: [],
};

function scoreblock(m) {
  const rows = [...m.functional.map((c) => ({ id: c.id, title: c.title, status: c.status, detail: c.detail })), ...m.extra];
  const t = tally(rows);
  const verdict = t.fail > 0 ? "🔴 FAIL"
    : (m.cap || (t.blocked > 0 ? `🟢 PASS (${t.blocked} not-yet-testable)` : "🟢 PASS"));
  const icon = (s) => ({ PASS: "✅", FAIL: "❌", BLOCKED: "⏳" }[s] || s);
  const lines = rows.map((r) => `| ${r.id} | ${r.title} | ${icon(r.status)} ${r.status} | ${r.detail || "—"} |`);
  return { t, verdict, md: `### ${m.name}
**Score: ${t.pass}/${t.pass + t.fail} passing** ${t.blocked ? `· ${t.blocked} blocked (future milestone/session-layer)` : ""} · **${verdict}**

| Check | What it verifies | Result | Detail |
|---|---|---|---|
${lines.join("\n")}
` };
}

const b1 = scoreblock(M1), b2 = scoreblock(M2), b3 = scoreblock(M3), b4 = scoreblock(M4);
const harnessLine = meta ? `Harness self-test: ${meta.fail === 0 ? "✅ VALIDATED" : "❌ BROKEN"} (${meta.pass}/${meta.total} meta-evals)` : "Harness self-test: (not run)";
const stamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

const md = `# Agent Army — Milestone Scoreboards (M1 · M2 · M3)

> Generated by \`evals/harness/scoreboard.mjs\` from live suite results. ${stamp}.
> ${harnessLine}. Reproduce: \`cd server && npm run build && node evals/harness/run-all.mjs && node evals/harness/run-plugin-evals.mjs && node evals/harness/scoreboard.mjs\`

## Summary
| Milestone | Passing | Failing | Blocked | Verdict |
|---|---|---|---|---|
| M1 Server core | ${b1.t.pass} | ${b1.t.fail} | ${b1.t.blocked} | ${b1.verdict} |
| M2 State engine | ${b2.t.pass} | ${b2.t.fail} | ${b2.t.blocked} | ${b2.verdict} |
| M3 Plugin | ${b3.t.pass} | ${b3.t.fail} | ${b3.t.blocked} | ${b3.verdict} |
| M4 Dashboard | ${b4.t.pass} | ${b4.t.fail} | ${b4.t.blocked} | ${b4.verdict} |

${b1.md}
${b2.md}
${b3.md}
${b4.md}
---
*"Blocked" = a check whose dependency is a later milestone (e.g. EVAL-07 needs M4 dashboard) or a session-layer behavior the stdio harness can't observe (e.g. D9 permission gating — verify on the surface matrix). Blocked ≠ fail.*
`;

fs.writeFileSync(path.join(EVALS, "SCOREBOARD.md"), md, "utf8");

// console
const line = "─".repeat(64);
console.log(`\n${line}\n AGENT ARMY — MILESTONE SCOREBOARDS   (${stamp})\n ${harnessLine}\n${line}`);
for (const [label, b, m] of [["M1 Server core", b1, M1], ["M2 State engine + manager", b2, M2], ["M3 Plugin", b3, M3], ["M4 Dashboard", b4, M4]]) {
  console.log(`\n▓ ${label}:  ${b.t.pass}/${b.t.pass + b.t.fail} passing${b.t.blocked ? ` · ${b.t.blocked} blocked` : ""}  →  ${b.verdict}`);
  const rows = [...m.functional.map((c) => ({ id: c.id, title: c.title, status: c.status })), ...m.extra];
  for (const r of rows) console.log(`    ${r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏳"} ${r.id.padEnd(12)} ${r.title}`);
}
console.log(`\n${line}\nWritten: evals/SCOREBOARD.md`);
