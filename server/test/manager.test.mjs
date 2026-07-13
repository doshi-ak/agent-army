/**
 * M2 fixture tests — schema round-trip + computeManagerTick findings.
 * PLAN.md §7 M2 acceptance: "schema round-trip tests pass; manager_tick on a
 * fixture yields correct stale-claim + eval-gap findings."
 *
 * No test framework (no new deps): plain node:assert. Run after `npm run build`:
 *   node test/manager.test.mjs
 */
import assert from "node:assert/strict";
import { initialStateMd } from "../dist/state/writers.js";
import {
  parseState,
  serializeState,
  renderStateMd,
  parseProgress,
  computeManagerTick,
} from "../dist/state/schema.js";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log("  ✓ " + name);
};

console.log("schema round-trip:");
test("STATE.md read round-trip is stable", () => {
  const src = {
    project: "demo",
    team: [{ agent: "builder", role: "executor", status: "IN_PROGRESS" }],
    active_work: [
      { task: "ship m2", owner: "builder", claimed_at: "2026-07-11T04:00:00.000Z", eta: "2026-07-11T05:00:00.000Z" },
    ],
    blockers: [{ desc: "waiting on x" }],
    last_manager_tick: null,
  };
  const wrap = (d) => "---\n" + serializeState(d) + "\n---\n";
  const doc = parseState(wrap(src));
  assert.deepEqual(doc, src);
  assert.deepEqual(parseState(wrap(doc)), doc);
});

test("renderStateMd write-path round-trips + renders human tables", () => {
  const doc = parseState(initialStateMd("demo"));
  doc.team.push({ agent: "verifier", role: "qa", status: "IDLE" });
  const md = renderStateMd(doc);
  assert.ok(md.includes("| verifier | qa | IDLE |"), "team table row missing");
  assert.deepEqual(parseState(md), doc);
});

console.log("manager_tick fixtures:");
test("flags stale claim + idle agent + eval gap", () => {
  const past = new Date(Date.now() - 3_600_000).toISOString();
  const doc = {
    project: "demo",
    team: [{ agent: "sleepy", role: "executor", status: "IDLE" }],
    active_work: [{ task: "overdue task", owner: "builder", claimed_at: past, eta: past }],
    blockers: [],
    last_manager_tick: null,
  };
  const r = computeManagerTick(doc, [], 0, Date.now());
  assert.equal(r.staleClaims.length, 1);
  assert.equal(r.staleClaims[0].task, "overdue task");
  assert.deepEqual(r.idleAgents, ["sleepy"]);
  assert.ok(r.evalGap, "expected an eval gap");
  assert.ok(r.recommendations.length >= 3, "expected >=3 recommendations");
});

test("clean project yields no findings", () => {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const doc = {
    project: "demo",
    team: [{ agent: "busy", role: "executor", status: "IN_PROGRESS" }],
    active_work: [{ task: "on track", owner: "busy", claimed_at: new Date().toISOString(), eta: future }],
    blockers: [],
    last_manager_tick: null,
  };
  const r = computeManagerTick(doc, [], 1, Date.now());
  assert.equal(r.staleClaims.length, 0);
  assert.equal(r.idleAgents.length, 0);
  assert.equal(r.evalGap, null);
  assert.deepEqual(r.recommendations, [
    "No action needed: no stale claims, no idle agents, eval coverage present.",
  ]);
});

test("progressSinceLastTick counts only entries after the last tick", () => {
  const progress = parseProgress(
    "- [2026-07-10T23:00:00.000Z] a — x: before\n" +
      "- [2026-07-11T01:00:00.000Z] b — y: after\n" +
      "- [2026-07-11T02:00:00.000Z] c — z: after2\n",
  );
  const doc = { project: "d", team: [], active_work: [], blockers: [], last_manager_tick: "2026-07-11T00:00:00.000Z" };
  const r = computeManagerTick(doc, progress, 1, Date.now());
  assert.equal(r.progressSinceLastTick, 2);
});

console.log(`\n${passed} M2 tests passed ✅`);
