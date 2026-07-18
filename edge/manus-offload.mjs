/**
 * M6.1 — Manus v2 offload adapter.  ⚠️ BUILD-GATED — DO NOT ENABLE WITHOUT AKASH.
 *
 * Offloads a scoped grunt-work task (scraping, bulk formatting, long research)
 * to Manus via its v2 REST API, so Claude Code/Cowork context+tokens are saved
 * (Akash's stated intent, PLAN §10.7a). The SHAPE is real and fact-checked
 * against M6-INTEGRATION-BRIEF.md; what is GATED is FIRING it:
 *
 *   Gated on Akash's buttons (RULES §1 — no session may self-serve):
 *     • MANUS_API_KEY        rotated key, env only, never a tracked file
 *     • M6_ENABLED=1         hard kill-switch; absent/0 ⇒ dry-run, never sends
 *     • webhook endpoint     the account-level callback target (registered once)
 *
 * Safety by construction:
 *   • Secrets are read from process.env at call time — none live in this file.
 *   • Default is DRY-RUN: with M6_ENABLED unset it returns the request it WOULD
 *     send and performs NO network call. This module is safe to import, test,
 *     and read; it is inert until Akash sets the env.
 *   • Manus v2 uses an ACCOUNT-LEVEL callback nested under task_detail — we send
 *     NO per-task webhook_url (per the brief; a per-task url is the v1 mistake).
 */

const MANUS_V2_ENDPOINT = "https://api.manus.ai/v2/tasks"; // shape per M6-INTEGRATION-BRIEF §9

/** Build the exact request body/headers we would POST — pure, no I/O, testable. */
export function buildOffloadRequest(task, apiKey) {
  return {
    url: MANUS_V2_ENDPOINT,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey ?? "<MANUS_API_KEY>"}`,
    },
    body: {
      prompt: task.description || task.title,
      // account-level callback — NO per-task webhook_url (v2 contract, brief §9)
      task_detail: { external_ref: task.task_id ?? null, source: "agent-army" },
    },
  };
}

/**
 * Offload a task. Returns {sent: boolean, dryRun, request, response?, reason}.
 * NEVER sends unless M6_ENABLED is truthy AND MANUS_API_KEY is present.
 */
export async function offloadTask(task, { fetchImpl = fetch, env = process.env } = {}) {
  const apiKey = env.MANUS_API_KEY;
  const enabled = env.M6_ENABLED === "1" || env.M6_ENABLED === "true";
  const request = buildOffloadRequest(task, apiKey);

  if (!enabled) return { sent: false, dryRun: true, request, reason: "M6_ENABLED not set — kill-switch open, dry-run only" };
  if (!apiKey) return { sent: false, dryRun: true, request, reason: "MANUS_API_KEY absent — cannot send (RULES §1, Akash-provided)" };

  const res = await fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(request.body),
  });
  return { sent: true, dryRun: false, request, response: { status: res.status } };
}
