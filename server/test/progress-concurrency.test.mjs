/**
 * M2 acceptance (PLAN.md §7): "PROGRESS.md is append-only under concurrent
 * writes." This spawns several real OS subprocesses that all call the
 * frozen M1 `appendProgress` writer against the *same* PROGRESS.md file at
 * the same time, then checks the result for:
 *   - no lost writes (every line every worker sent is present),
 *   - no corruption (every line parses cleanly as one whole entry — no two
 *     concurrent writes interleaved mid-line),
 *   - append-only ordering isn't required to be global-fair, only intact.
 *
 * Relies on POSIX O_APPEND write-atomicity for writes under the OS pipe
 * buffer size, which is what `fs.appendFileSync` uses under the hood — this
 * is the property the tool's "concurrency-safe" claim rests on.
 *
 * Run after `npm run build` (imports compiled dist/, and spawns dist-based
 * worker subprocesses): node test/progress-concurrency.test.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { parseProgress } from "../dist/state/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER = path.join(__dirname, "fixtures", "concurrency-worker.mjs");

function runWorker(root, actor, lines) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER, root, actor, String(lines)], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`worker for ${actor} exited ${code}: ${stderr}`));
    });
  });
}

console.log("PROGRESS.md concurrency safety:");

const root = mkdtempSync(path.join(tmpdir(), "m2-concurrency-"));
mkdirSync(path.join(root, "_team"), { recursive: true });
writeFileSync(path.join(root, "_team", "PROGRESS.md"), "# PROGRESS.md — append-only log\n\n", "utf8");

const WORKERS = 8;
const LINES_PER_WORKER = 25;

await Promise.all(
  Array.from({ length: WORKERS }, (_, w) => runWorker(root, `agent-${w}`, LINES_PER_WORKER)),
);

const raw = readFileSync(path.join(root, "_team", "PROGRESS.md"), "utf8");
const rawEntryLines = raw.split("\n").filter((l) => l.startsWith("- ["));
const entries = parseProgress(raw);

const expectedTotal = WORKERS * LINES_PER_WORKER;

assert.equal(
  rawEntryLines.length,
  expectedTotal,
  `expected ${expectedTotal} raw entry-marker lines, found ${rawEntryLines.length} — a write was lost or two writes merged onto one line`,
);
assert.equal(
  entries.length,
  expectedTotal,
  `expected ${expectedTotal} entries to parse cleanly, got ${entries.length} — corrupted/interleaved line(s) present`,
);

for (let w = 0; w < WORKERS; w++) {
  const count = entries.filter((e) => e.actor === `agent-${w}`).length;
  assert.equal(count, LINES_PER_WORKER, `agent-${w} lost entries under concurrent writes (got ${count}/${LINES_PER_WORKER})`);
}

// Every outcome value for a given actor is a distinct line index — proves no
// duplication either (a corrupted write could double-count a line).
for (let w = 0; w < WORKERS; w++) {
  const outcomes = new Set(entries.filter((e) => e.actor === `agent-${w}`).map((e) => e.outcome));
  assert.equal(outcomes.size, LINES_PER_WORKER, `agent-${w} has duplicate/corrupted outcomes`);
}

rmSync(root, { recursive: true, force: true });

console.log(
  `  ✓ ${WORKERS} concurrent subprocesses x ${LINES_PER_WORKER} appends = ${expectedTotal} entries, zero lost, zero corrupted`,
);
console.log("\n1 M2 concurrency test passed ✅");
