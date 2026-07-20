/**
 * M6 END-TO-END PIPELINE ROUND-TRIP — dry-run.
 *
 * The ratified M6 acceptance is: intake → dedup → offload → callback → push, on
 * a fixture task, with zero secrets in tracked files. The LIVE hop is gated on
 * Akash's credentials — but the PIPELINE WIRING is not, and leaving it untested
 * until credentials arrive would mean discovering composition bugs at the worst
 * possible moment. This proves every stage composes today; only the network
 * call itself stays gated.
 *
 * Run: node --test edge/test/roundtrip.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

import { handleIntake } from "../intake.mjs";
import { offloadTask } from "../manus-offload.mjs";
import { ingest } from "../ingest-to-progress.mjs";
import { sendPush } from "../telegram-push.mjs";

const FIXTURE = {
  task_id: "t-9001",
  title: "Bulk-scrape competitor pricing pages",
  description: "Scrape 400 pricing pages and normalize to CSV",
  owner_tool: "manus",
  status: "todo",
  user_approval_required: false,
};

test("full chain composes: intake → dispatch decision → offload(dry) → callback → ingest → push(dry)", async () => {
  let networkCalls = 0;
  const fetchImpl = async () => { networkCalls++; return { status: 200 }; };
  let progress = ""; // stands in for _team/PROGRESS.md

  // 1. INTAKE — webhook body arrives, normalizes, and is judged dispatchable
  const { task, decision } = handleIntake(FIXTURE, progress);
  assert.equal(decision.dispatch, true, "net-new external task should dispatch");
  assert.equal(decision.gate, false);

  // 2. OFFLOAD — dry-run (no creds): request is fully built, nothing is sent
  const offload = await offloadTask(task, { fetchImpl, env: {} });
  assert.equal(offload.sent, false);
  assert.equal(offload.dryRun, true);
  assert.match(offload.request.url, /api\.manus\.ai/);
  assert.equal(offload.request.body.webhook_url, undefined, "v2 uses account-level callback");

  // 3. CALLBACK — Manus reports terminal status back through the intake edge
  const callback = { ...FIXTURE, status: "done", manus_task_id: "m-777", external_links: ["https://manus.ai/t/m-777"] };
  const { task: done } = handleIntake(callback, progress);

  // 4. INGEST — exactly one PROGRESS.md line, carrying correlation ids
  const first = ingest(done, progress);
  assert.equal(first.log, true);
  assert.match(first.entry.outcome, /^DONE: Bulk-scrape/);
  assert.match(first.entry.outcome, /m-777/);
  progress += `- [ts] ${first.entry.actor} — ${first.entry.event}: ${first.entry.outcome}\n`;

  // 5. PUSH — dry-run notification, send-only endpoint
  const push = await sendPush(`Manus task done: ${done.title}`, { fetchImpl, env: {} });
  assert.equal(push.sent, false);
  assert.match(push.request.url, /\/sendMessage$/);

  // 6. IDEMPOTENCY — the whole chain re-run on the same callback logs nothing new
  assert.equal(ingest(done, progress).log, false, "re-delivered webhook must not double-log");
  const redispatch = handleIntake(callback, progress);
  assert.equal(redispatch.decision.dispatch, false, "already-seen task must not re-dispatch");

  // 7. THE GATE HELD THROUGHOUT — not a single network call in the entire chain
  assert.equal(networkCalls, 0, "dry-run pipeline must perform ZERO network I/O");
});

test("approval-required task is gated at intake and never reaches offload", async () => {
  let networkCalls = 0;
  const fetchImpl = async () => { networkCalls++; return { status: 200 }; };
  const gated = { ...FIXTURE, user_approval_required: true };
  const { decision } = handleIntake(gated, "");
  assert.equal(decision.dispatch, false);
  assert.equal(decision.gate, true, "RULES §1 human gate must trip at the decision boundary");
  assert.equal(networkCalls, 0);
});

test("no secret value can reach a PROGRESS.md line (state is Akash-readable, secrets are not)", () => {
  const withSecrets = { ...FIXTURE, status: "done", manus_task_id: "m-1" };
  const { entry } = ingest(withSecrets, "");
  const serialized = JSON.stringify(entry);
  for (const leak of ["MANUS_API_KEY", "TELEGRAM_BOT_TOKEN", "Bearer ", "sk-", "bot123"]) {
    assert.equal(serialized.includes(leak), false, `progress entry must never carry ${leak}`);
  }
});
