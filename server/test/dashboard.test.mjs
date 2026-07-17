/**
 * M4 — dashboard regen verification (PLAN.md §4/§7, DoD 7).
 *
 * Boots the real compiled server over stdio against a throwaway project and
 * asserts: dashboard_refresh works standalone; every state-mutating tool
 * (team_init, agent_create, state_write, progress_log, agent_assign_role,
 * agent_delete) leaves _team/dashboard.html reflecting the new state within
 * that same tool call (DoD 7 — "within one tool-call of any mutation"); the
 * HTML is self-contained (no external requests: no http(s):// src/href to a
 * CDN, no remote fonts).
 *
 * Run after `npm run build`: node test/dashboard.test.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
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

const scratchDir = mkdtempSync(path.join(tmpdir(), "m4-dashboard-"));
const dashboardPath = path.join(scratchDir, "_team", "dashboard.html");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [SERVER_ENTRY],
  cwd: scratchDir,
  stderr: "pipe",
});
const client = new Client({ name: "m4-dashboard-test", version: "0.0.0" });
await client.connect(transport);

console.log("M4 dashboard regen (real stdio server):");

await test("team_init produces a live dashboard, not the old static seed", async () => {
  await callTool(client, "team_init", {});
  const html = readFileSync(dashboardPath, "utf8");
  assert.ok(html.includes("<h2>Team</h2>"), "expected live sections, not the M1 seed placeholder");
  assert.ok(!html.includes("Dashboard seed (M1)"), "old seed text should be gone");
});

await test("no external requests: no http(s):// references anywhere in the HTML", async () => {
  const html = readFileSync(dashboardPath, "utf8");
  assert.ok(!/https?:\/\//.test(html), "dashboard must be fully self-contained");
});

await test("Team table shows EVERY staffed agent, not just ones with an explicit state_write status (regression)", async () => {
  // agent_create never auto-populates STATE.md's `## Team` table (only
  // state_write op:upsert_agent does, and nothing requires calling it) — a
  // dashboard sourced from doc.team alone silently drops every agent nobody
  // separately set a status for. Caught via a real multi-agent demo project;
  // fixed by sourcing the roster from .claude/agents/*.md, same as
  // agent_list/team_status already do.
  await callTool(client, "agent_create", { name: "roster-check-a", role: "docs-writer" });
  await callTool(client, "agent_create", { name: "roster-check-b", role: "code-reviewer" });
  // Deliberately do NOT call state_write(upsert_agent) for either — that's the point.
  const html = readFileSync(dashboardPath, "utf8");
  const teamSection = html.slice(html.indexOf("<h2>Team</h2>"), html.indexOf("<h2>Active work</h2>"));
  assert.ok(teamSection.includes("roster-check-a"), "agent with no explicit STATE.md status must still appear");
  assert.ok(teamSection.includes("roster-check-b"), "agent with no explicit STATE.md status must still appear");
  assert.ok(teamSection.includes("docs-writer") && teamSection.includes("code-reviewer"), "roles must come from the agent files");
});

await test("agent_create regenerates the dashboard within that same call (DoD 7)", async () => {
  await callTool(client, "agent_create", { name: "dash-debugger", role: "debugger" });
  const html = readFileSync(dashboardPath, "utf8");
  assert.ok(html.includes("dash-debugger"), "new agent should already appear, no separate refresh call needed");
});

await test("state_write claim regenerates the dashboard, including overdue highlighting", async () => {
  await callTool(client, "state_write", {
    op: "claim",
    task: "dashboard-test-task",
    owner: "dash-debugger",
    eta: "2020-01-01T00:00:00.000Z", // already overdue
  });
  const html = readFileSync(dashboardPath, "utf8");
  assert.ok(html.includes("dashboard-test-task"));
  assert.ok(html.includes("overdue"), "past-ETA claim should be flagged");
});

await test("progress_log regenerates the dashboard's recent-progress section", async () => {
  await callTool(client, "progress_log", {
    actor: "dash-debugger",
    event: "note",
    outcome: "dashboard progress-tail check",
  });
  const html = readFileSync(dashboardPath, "utf8");
  assert.ok(html.includes("dashboard progress-tail check"));
});

await test("agent_assign_role regenerates the dashboard with the new role", async () => {
  await callTool(client, "agent_assign_role", { name: "dash-debugger", role: "performance-engineer" });
  const html = readFileSync(dashboardPath, "utf8");
  assert.ok(html.includes("performance-engineer"));
});

await test("agent_delete regenerates the dashboard, agent no longer listed in Team", async () => {
  await callTool(client, "agent_delete", { name: "dash-debugger", reason: "dashboard test cleanup" });
  const html = readFileSync(dashboardPath, "utf8");
  const teamSection = html.slice(html.indexOf("<h2>Team</h2>"), html.indexOf("<h2>Active work</h2>"));
  assert.ok(!teamSection.includes("dash-debugger"), "retired agent should drop out of the Team table");
});

await test("dashboard_refresh works standalone and is idempotent (no state change)", async () => {
  const before = readFileSync(dashboardPath, "utf8");
  const res = await callTool(client, "dashboard_refresh", {});
  assert.ok(res.file.endsWith(path.join("_team", "dashboard.html")));
  const after = readFileSync(dashboardPath, "utf8");
  // Content is a pure function of state + timestamp; re-rendering unchanged
  // state should not change anything except the "Generated" timestamp line.
  const strip = (h) => h.replace(/Generated [^<]+/, "Generated X");
  assert.equal(strip(before), strip(after));
});

await client.close();
rmSync(scratchDir, { recursive: true, force: true });
console.log(`\n${passed} M4 dashboard tests passed ✅`);
