/**
 * End-to-end scratch-project verification (dispatch "VERIFY BEFORE DONE"
 * requirement + PLAN.md §7 M1/M2 acceptance): boots the real compiled
 * server over stdio with the real MCP SDK Client, against a throwaway
 * project directory, and drives:
 *
 *   tools/list -> team_init -> agent_create -> state_write (claim, two
 *   ways) -> progress_log -> manager_tick -> team_status
 *
 * asserting the full tool surface is present and manager_tick's report is
 * sane (flags the overdue claim + the idle agent + the eval gap, and
 * *only* those — no false positives from an empty project).
 *
 * Run after `npm run build`: node test/e2e-scratch.test.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, "..", "dist", "index.js");

let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed++;
  console.log("  ✓ " + name);
};

async function callTool(client, name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  if (res.isError) {
    throw new Error(`tool ${name} returned an error: ${JSON.stringify(res.content)}`);
  }
  return res.structuredContent;
}

const scratchDir = mkdtempSync(path.join(tmpdir(), "m2-e2e-scratch-"));

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [SERVER_ENTRY],
  cwd: scratchDir,
  stderr: "pipe",
});
const client = new Client({ name: "m2-e2e-test", version: "0.0.0" });
await client.connect(transport);

try {
  console.log(`Scratch project: ${scratchDir}`);
  console.log("End-to-end scratch project (real stdio server):");

  let tools;
  await test("tools/list exposes the full M1 (8) + M2 (5) = 13 tool surface", async () => {
    const res = await client.listTools();
    tools = res.tools.map((t) => t.name).sort();
    const expected = [
      "agent_assign_role",
      "agent_create",
      "agent_delete",
      "agent_list",
      "manager_tick",
      "progress_log",
      "role_get",
      "role_list",
      "roles_sync",
      "state_read",
      "state_write",
      "team_init",
      "team_status",
    ].sort();
    assert.deepEqual(tools, expected);
  });

  await test("team_init scaffolds the harness (net-new project)", async () => {
    const data = await callTool(client, "team_init", { projectName: "m2-e2e-scratch" });
    assert.equal(data.netNew, true);
    assert.equal(typeof data.skillForgeNudge, "string");
    assert.ok(data.skillForgeNudge.length > 0);
    assert.ok(data.created.includes("_team/"));
  });

  await test("agent_create staffs a builder", async () => {
    const data = await callTool(client, "agent_create", {
      name: "test-builder",
      role: "debugger",
      taskContext: "M2 e2e verification",
    });
    assert.equal(data.name, "test-builder");
    assert.equal(data.role, "debugger");
  });

  await test("state_write upsert_agent marks a second agent IDLE (for manager_tick to flag)", async () => {
    const data = await callTool(client, "state_write", {
      op: "upsert_agent",
      agent: "idle-one",
      role: "docs-writer",
      status: "IDLE",
    });
    assert.ok(data.team.some((t) => t.agent === "idle-one" && t.status === "IDLE"));
  });

  await test("state_write claim adds an overdue active-work item", async () => {
    const overdueEta = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h in the past
    const data = await callTool(client, "state_write", {
      op: "claim",
      task: "overdue-e2e-task",
      owner: "test-builder",
      eta: overdueEta,
    });
    assert.ok(data.activeWork.some((w) => w.task === "overdue-e2e-task"));
  });

  await test("progress_log appends an entry (concurrency-safe append)", async () => {
    const data = await callTool(client, "progress_log", {
      actor: "test-builder",
      event: "claim",
      outcome: "overdue-e2e-task",
    });
    assert.ok(data.totalEntries >= 1);
  });

  await test("manager_tick returns a sane recommendations report — files only, no model calls", async () => {
    const data = await callTool(client, "manager_tick", {});
    assert.equal(data.staleClaims.length, 1, "expected exactly the one overdue claim");
    assert.equal(data.staleClaims[0].task, "overdue-e2e-task");
    assert.deepEqual(data.idleAgents, ["idle-one"]);
    assert.ok(data.evalGap, "expected an eval-coverage gap (scratch project has no evals/)");
    assert.ok(data.recommendations.length >= 3, "expected stale + idle + eval-gap recommendations");
  });

  await test("state_read reflects the same structured snapshot manager_tick saw", async () => {
    const data = await callTool(client, "state_read", {});
    assert.equal(data.team.length, 1); // idle-one only — test-builder isn't in STATE.md's team table
    assert.equal(data.activeWork.length, 1);
  });

  await test("roles_sync reports drift (agent files exist, ROLES.md registry mirrors them)", async () => {
    const data = await callTool(client, "roles_sync", {});
    assert.equal(data.agentFiles, 1); // test-builder
    assert.equal(data.registeredRoles, 1);
  });

  await test("team_status returns schema-parsed state/roles (structured, not raw markdown strings)", async () => {
    const data = await callTool(client, "team_status", {});
    assert.equal(typeof data.state, "object");
    assert.notEqual(data.state, null);
    assert.equal(typeof data.state.project, "string");
    assert.ok(Array.isArray(data.state.team));
    assert.ok(Array.isArray(data.roles));
    assert.equal(data.roles[0].role, "debugger");
    assert.equal(data.agentCount, 1);
  });

  await test("state_write record_tick stamps last_manager_tick", async () => {
    const data = await callTool(client, "state_write", { op: "record_tick" });
    assert.ok(data.lastManagerTick);
  });

  await test("a second manager_tick after record_tick counts progress since that tick correctly", async () => {
    await callTool(client, "progress_log", { actor: "test-builder", event: "note", outcome: "post-tick" });
    const data = await callTool(client, "manager_tick", {});
    assert.equal(data.progressSinceLastTick, 1);
  });

  console.log(`\n${passed} M2 e2e scratch-project checks passed ✅`);
} finally {
  await client.close();
  rmSync(scratchDir, { recursive: true, force: true });
}
