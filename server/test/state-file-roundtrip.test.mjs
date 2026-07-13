/**
 * M2 acceptance (PLAN.md §5 + §7): "Schema round-trip tests pass" for all
 * three state files. manager.test.mjs (adopted from the prior owner's WIP)
 * already covers STATE.md's basic case; this file adds STATE.md edge cases
 * it didn't hit (quoting, multi-row) plus full round-trip coverage for
 * PROGRESS.md and ROLES.md, the other two files named in §5.
 *
 * Run after `npm run build`: node test/state-file-roundtrip.test.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  parseState,
  serializeState,
  parseProgress,
  formatProgress,
  parseRoles,
} from "../dist/state/schema.js";
import { appendRoleRegistryRow, initialRolesMd } from "../dist/state/writers.js";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log("  ✓ " + name);
};

console.log("STATE.md — round-trip edge cases:");

test("quoting round-trips values containing YAML-significant characters", () => {
  const src = {
    project: "demo: with a colon",
    team: [{ agent: "a", role: "r: role", status: "IDLE" }],
    active_work: [],
    blockers: [{ desc: 'has "quotes" and # a hash' }],
    last_manager_tick: null,
  };
  const md = "---\n" + serializeState(src) + "\n---\n";
  assert.deepEqual(parseState(md), src);
});

test("multiple team / active_work / blocker rows all round-trip together", () => {
  const src = {
    project: "multi",
    team: [
      { agent: "a1", role: "r1", status: "DONE" },
      { agent: "a2", role: "r2", status: "BLOCKED" },
      { agent: "a3", role: "r3", status: "IN_PROGRESS" },
    ],
    active_work: [
      {
        task: "t1",
        owner: "a1",
        claimed_at: "2026-07-11T00:00:00.000Z",
        eta: "2026-07-12T00:00:00.000Z",
      },
      { task: "t2", owner: "a2", claimed_at: "2026-07-11T01:00:00.000Z", eta: "" },
    ],
    blockers: [{ desc: "b1" }, { desc: "b2" }],
    last_manager_tick: "2026-07-11T02:00:00.000Z",
  };
  const md = "---\n" + serializeState(src) + "\n---\n";
  assert.deepEqual(parseState(md), src);
});

console.log("PROGRESS.md — round-trip:");

test("format -> parse round-trips a batch of entries", () => {
  const entries = [
    { timestamp: "2026-07-11T00:00:00.000Z", actor: "builder", event: "claim", outcome: "ship m2" },
    { timestamp: "2026-07-11T01:00:00.000Z", actor: "verifier", event: "done", outcome: "PASS — 5/5 tests" },
    {
      timestamp: "2026-07-11T02:00:00.000Z",
      actor: "agent-manager",
      event: "blocked",
      outcome: "waiting on x: y",
    },
  ];
  const md = entries.map(formatProgress).join("\n") + "\n";
  assert.deepEqual(parseProgress(md), entries);
});

test("parseProgress skips non-entry lines (headers, comments, blanks)", () => {
  const md = `# PROGRESS.md — append-only log

<!-- Audit trail comment -->

- [2026-07-11T00:00:00.000Z] a — x: one
- [2026-07-11T00:00:01.000Z] b — y: two
`;
  const entries = parseProgress(md);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].actor, "a");
  assert.equal(entries[1].actor, "b");
});

console.log("ROLES.md — round-trip:");

test("registry rows round-trip through the table grammar", () => {
  const rows = [
    {
      role: "debugger",
      agentFile: ".claude/agents/dbg.md",
      sourceTemplate: "server/roles/debugger.md (superteam)",
      history: "2026-07-11T00:00:00.000Z: created",
    },
    {
      role: "security-auditor",
      agentFile: ".claude/agents/sec.md",
      sourceTemplate: "server/roles/security-auditor.md (superteam)",
      history: "2026-07-11T01:00:00.000Z: created",
    },
  ];
  const md =
    "# ROLES.md — role registry\n\n" +
    "| Role | Agent file | Source template | History |\n" +
    "|---|---|---|---|\n" +
    rows.map((r) => `| ${r.role} | ${r.agentFile} | ${r.sourceTemplate} | ${r.history} |`).join("\n") +
    "\n";
  assert.deepEqual(parseRoles(md), rows);
});

test("parseRoles matches the exact format the frozen M1 writer (appendRoleRegistryRow) produces", () => {
  const root = mkdtempSync(path.join(tmpdir(), "m2-roles-"));
  mkdirSync(path.join(root, "_team"), { recursive: true });
  writeFileSync(path.join(root, "_team", "ROLES.md"), initialRolesMd(), "utf8");

  appendRoleRegistryRow(
    root,
    "debugger",
    ".claude/agents/dbg.md",
    "server/roles/debugger.md (superteam)",
    "2026-07-11T00:00:00.000Z: created",
  );
  appendRoleRegistryRow(
    root,
    "docs-writer",
    ".claude/agents/docs.md",
    "server/roles/docs-writer.md (superteam)",
    "2026-07-11T01:00:00.000Z: created",
  );

  const rows = parseRoles(readFileSync(path.join(root, "_team", "ROLES.md"), "utf8"));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    role: "debugger",
    agentFile: ".claude/agents/dbg.md",
    sourceTemplate: "server/roles/debugger.md (superteam)",
    history: "2026-07-11T00:00:00.000Z: created",
  });
  assert.equal(rows[1].role, "docs-writer");

  rmSync(root, { recursive: true, force: true });
});

console.log(`\n${passed} M2 tests passed ✅`);
