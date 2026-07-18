/**
 * M6 edge-adapter unit tests. Covers the ungated logic (dispatcher, intake,
 * ingestion) end-to-end with fixtures, and PROVES the gated adapters are inert
 * without Akash's env (kill-switch + no-secret-leak). No live network, no creds.
 *
 * Run: node --test edge/test/edge.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

import { dedupKey, findDuplicate, decideDispatch } from "../dispatcher.mjs";
import { normalizeIntake, mapStatus, handleIntake } from "../intake.mjs";
import { buildProgressEntry, isAlreadyLogged, ingest } from "../ingest-to-progress.mjs";
import { offloadTask, buildOffloadRequest } from "../manus-offload.mjs";
import { sendPush, ALLOWED_METHODS } from "../telegram-push.mjs";

// ── M6.2 dispatcher ────────────────────────────────────────────────────────
test("dedupKey prefers an explicit id, falls back to normalized title", () => {
  assert.equal(dedupKey({ manus_task_id: "abc" }), "id:abc");
  assert.equal(dedupKey({ title: "  Scrape  The   Site " }), "title:scrape the site");
  assert.throws(() => dedupKey({}), /neither an id nor a title/);
});

test("findDuplicate matches a key already stamped in PROGRESS.md", () => {
  const log = "- [t] manus — done: DONE: x [id:abc manus:abc]";
  assert.equal(findDuplicate({ manus_task_id: "abc" }, log), true);
  assert.equal(findDuplicate({ manus_task_id: "zzz" }, log), false);
});

test("decideDispatch: net-new external task dispatches; dup and local and gated do not", () => {
  assert.equal(decideDispatch({ owner_tool: "manus", title: "t" }, "").dispatch, true);
  assert.equal(decideDispatch({ owner_tool: "user", title: "t" }, "").dispatch, false);
  assert.equal(decideDispatch({ owner_tool: "manus", manus_task_id: "a" }, "[id:a]").dispatch, false);
  const gated = decideDispatch({ owner_tool: "manus", title: "t", user_approval_required: true }, "");
  assert.equal(gated.dispatch, false);
  assert.equal(gated.gate, true);
});

// ── M6.0 intake ─────────────────────────────────────────────────────────────
test("normalizeIntake tolerates Notion-wrapped and flat bodies", () => {
  const flat = normalizeIntake({ title: "T", owner_tool: "MANUS", status: "Done" });
  assert.equal(flat.title, "T");
  assert.equal(flat.owner_tool, "manus");
  assert.equal(flat.status, "done");
  const wrapped = normalizeIntake({ properties: { Title: "W", owner_tool: "relay" } });
  assert.equal(wrapped.title, "W");
});

test("mapStatus: six Notion statuses → four STATE values (non-terminal ⇒ null)", () => {
  assert.equal(mapStatus("done"), "DONE");
  assert.equal(mapStatus("blocked"), "BLOCKED");
  assert.equal(mapStatus("awaiting_user"), "NEEDS_CONTEXT");
  assert.equal(mapStatus("cancelled"), "DONE_WITH_CONCERNS");
  assert.equal(mapStatus("todo"), null);
  assert.equal(mapStatus("in_progress"), null);
});

test("handleIntake wires normalize → decide", () => {
  const { task, decision } = handleIntake({ title: "job", owner_tool: "manus", status: "todo" }, "");
  assert.equal(task.owner_tool, "manus");
  assert.equal(decision.dispatch, true);
});

// ── M6.3 ingestion ───────────────────────────────────────────────────────────
test("buildProgressEntry: terminal status → one line; non-terminal → null", () => {
  const e = buildProgressEntry({ status: "done", title: "Scrape", owner_tool: "manus", manus_task_id: "m1", task_id: "t1" });
  assert.equal(e.actor, "manus");
  assert.match(e.outcome, /^DONE: Scrape/);
  assert.match(e.outcome, /id:m1/); // dedup key present for idempotency
  assert.equal(buildProgressEntry({ status: "in_progress", title: "x" }), null);
});

test("ingest is idempotent on re-poll", () => {
  const task = { status: "done", title: "Scrape", owner_tool: "manus", manus_task_id: "m1" };
  const first = ingest(task, "");
  assert.equal(first.log, true);
  const progressNow = `- [t] manus — done: ${first.entry.outcome}`;
  assert.equal(ingest(task, progressNow).log, false); // second poll: no duplicate line
});

// ── M6.1 / M6.3 GATED adapters: inert without Akash's env ─────────────────────
test("offloadTask NEVER sends without M6_ENABLED + key (kill-switch)", async () => {
  let fetched = false;
  const fetchImpl = async () => { fetched = true; return { status: 200 }; };
  // no env at all
  let r = await offloadTask({ title: "t" }, { fetchImpl, env: {} });
  assert.equal(r.sent, false);
  assert.equal(r.dryRun, true);
  // key present but kill-switch open
  r = await offloadTask({ title: "t" }, { fetchImpl, env: { MANUS_API_KEY: "k" } });
  assert.equal(r.sent, false);
  // switch on but no key
  r = await offloadTask({ title: "t" }, { fetchImpl, env: { M6_ENABLED: "1" } });
  assert.equal(r.sent, false);
  assert.equal(fetched, false, "no network call may happen in any dry-run path");
});

test("offloadTask sends ONLY when both switch and key are set (injected fetch)", async () => {
  let url = null;
  const fetchImpl = async (u) => { url = u; return { status: 202 }; };
  const r = await offloadTask({ title: "t", description: "d" }, { fetchImpl, env: { M6_ENABLED: "1", MANUS_API_KEY: "k" } });
  assert.equal(r.sent, true);
  assert.match(url, /api\.manus\.ai\/v2\/tasks/);
});

test("buildOffloadRequest sends NO per-task webhook_url (v2 account-level callback)", () => {
  const req = buildOffloadRequest({ title: "t", task_id: "x" }, "k");
  assert.equal(req.body.webhook_url, undefined);
  assert.ok(req.body.task_detail, "callback nests under task_detail");
});

test("no secret ever appears in a dry-run request body", async () => {
  const r = await offloadTask({ title: "t" }, { env: { MANUS_API_KEY: "SUPERSECRET" } });
  // dry-run returns the request with the real header, but sent=false and no I/O;
  // assert the module didn't leak the key anywhere it would be persisted/logged as body content
  assert.equal(r.sent, false);
  assert.equal(JSON.stringify(r.request.body).includes("SUPERSECRET"), false);
});

test("telegram-push is provably SEND-ONLY and inert without env", async () => {
  assert.deepEqual([...ALLOWED_METHODS], ["sendMessage"]); // never getUpdates/setWebhook
  let fetched = false;
  const fetchImpl = async () => { fetched = true; return { status: 200 }; };
  const r = await sendPush("hi", { fetchImpl, env: {} });
  assert.equal(r.sent, false);
  assert.equal(r.dryRun, true);
  assert.equal(fetched, false);
  assert.match(r.request.url, /\/sendMessage$/);
});
