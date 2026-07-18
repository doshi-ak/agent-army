/**
 * M6.0 — Webhook intake edge (normalizer — PURE LOGIC, no network).
 *
 * A Relay/Notion/Manus webhook hits a public endpoint (the endpoint itself is
 * one of Akash's four gated buttons — see edge/README.md). Whatever host
 * receives the POST hands the raw JSON body here. This module's only job is to
 * normalize that body into the canonical task record the dispatcher understands.
 *
 * It does NOT bind a port, does NOT call out, and holds no secrets. The live
 * receiver (a GitHub Actions webhook workflow, or a small host bound to Akash's
 * endpoint) is the gated part; this normalization + the dispatch decision it
 * feeds are testable today with fixtures.
 */

import { decideDispatch } from "./dispatcher.mjs";

/** Six Notion statuses → the four STATE.md status values (spec §2 mapping). */
const STATUS_MAP = {
  todo: null, // held in Notion only until terminal — not logged
  in_progress: null,
  blocked: "BLOCKED",
  awaiting_user: "NEEDS_CONTEXT",
  done: "DONE",
  cancelled: "DONE_WITH_CONCERNS", // logged as a one-line closure, not tracked active
};

/** Normalize a raw webhook body into the canonical task record. */
export function normalizeIntake(body) {
  if (!body || typeof body !== "object") throw new TypeError("webhook body must be a JSON object");
  const props = body.properties ?? body; // Notion wraps fields under properties; tolerate flat bodies too
  return {
    task_id: body.task_id ?? props.task_id ?? body.id ?? null,
    manus_task_id: body.manus_task_id ?? props.manus_task_id ?? null,
    title: String(body.title ?? props.title ?? props.Title ?? "").trim(),
    description: String(body.description ?? props.description ?? "").trim(),
    owner_tool: String(body.owner_tool ?? props.owner_tool ?? "unassigned").toLowerCase(),
    status: String(body.status ?? props.status ?? "todo").toLowerCase(),
    user_approval_required: Boolean(body.user_approval_required ?? props.user_approval_required ?? false),
    external_links: body.external_links ?? props.external_links ?? [],
  };
}

/** Map an intake status to the STATE.md status enum, or null if not yet terminal/loggable. */
export function mapStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_MAP, status) ? STATUS_MAP[status] : null;
}

/**
 * Full intake step: normalize → decide. Returns the normalized task plus the
 * dispatch decision, so the (gated) live host can act while this stays testable.
 */
export function handleIntake(body, progressText = "") {
  const task = normalizeIntake(body);
  const decision = decideDispatch(task, progressText);
  return { task, decision, mappedStatus: mapStatus(task.status) };
}
