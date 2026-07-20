#!/usr/bin/env node
/**
 * M6 edge-adapter conformance — gate stage.
 *
 * ⚠️ DECLARED LANE-EXCEPTION (Excelcius/Executor authored this file inside the
 * Evaluator's harness dir, and added one line to run-all.mjs's `stages`).
 * Precedent + symmetry: Evelyn declared the same kind of exception into
 * server/src on 5217a67 and I reviewed/approved it; Cody ratified the pattern
 * (commit-disclosed fix + owning-lane review window). EVAL SEAT MAY OVERRULE OR
 * REWRITE THIS FREELY — the M6 logic under test is mine, the harness is yours.
 *
 * WHY it needs to exist: edge/ carries the only outbound code in the product
 * (Manus, Telegram) plus the §3.8 boundary that keeps the SERVER outbound-free.
 * Those had 20 passing tests but ZERO gate coverage — a regression there would
 * ship silently and could break §3.8 without any suite noticing.
 *
 * Delegates to the node:test files in edge/test/ (single source of truth — this
 * wrapper never re-implements an assertion) and reports in the standard shape.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "..", "..");
const OUT_DIR = path.join(REPO, "evals", "results");
const OUT = path.join(OUT_DIR, "edge.json");

const FILES = [
  ["M6-EDGE", "adapter logic: dedup/dispatch/intake/ingest + kill-switch inertness", "edge/test/edge.test.mjs"],
  ["M6-BOUNDARY", "§3.8 guard: server never imports edge/; edge never imports server internals", "edge/test/boundary.test.mjs"],
  ["M6-ROUNDTRIP", "end-to-end dry-run chain: intake→dispatch→offload→callback→ingest→push, zero network I/O", "edge/test/roundtrip.test.mjs"],
];

const checks = [];
for (const [id, title, rel] of FILES) {
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) {
    checks.push({ id, title, milestone: "M6", status: "FAIL", detail: `missing test file ${rel}` });
    continue;
  }
  try {
    const out = execFileSync(process.execPath, ["--test", abs], { cwd: REPO, encoding: "utf8", stdio: "pipe" });
    const pass = /^ℹ pass (\d+)$/m.exec(out)?.[1] ?? "?";
    const fail = /^ℹ fail (\d+)$/m.exec(out)?.[1] ?? "?";
    // Defensive: a runner that reports 0 tests is a false green, not a pass.
    if (pass === "0" || pass === "?") {
      checks.push({ id, title, milestone: "M6", status: "FAIL", detail: `no tests executed in ${rel} — treating as failure, not a pass` });
    } else {
      checks.push({ id, title, milestone: "M6", status: "PASS", detail: `${pass} assertions pass, ${fail} fail` });
    }
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    const firstFail = /✖ (.+)/.exec(out)?.[1] ?? "see output";
    checks.push({ id, title, milestone: "M6", status: "FAIL", detail: `${rel}: ${firstFail}` });
  }
}

const fail = checks.filter((c) => c.status === "FAIL").length;
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  suite: "edge-m6", milestone: "M6", generatedAt: new Date().toISOString(),
  total: checks.length, pass: checks.length - fail, fail, checks,
}, null, 2), "utf8");

console.log(`M6 edge conformance: ${checks.length - fail}/${checks.length} pass`);
for (const c of checks) console.log(`  ${c.status === "PASS" ? "✓" : "✗"} ${c.id} ${c.title}${c.detail ? " — " + c.detail : ""}`);
console.log(`Results: ${OUT}`);
process.exit(fail > 0 ? 1 : 0);
