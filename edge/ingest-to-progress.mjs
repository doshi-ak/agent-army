/**
 * M6.3 (ingestion half) — Notion/webhook terminal-status → one PROGRESS.md line.
 *
 * Executes PLAN §10.7(b): "Relay.app webhook → progress_log ingestion so
 * Relay-orchestrated flows appear on the same board." A terminal status change
 * on an external-worker row condenses into exactly ONE progress_log line,
 * carrying the correlation ids + outcome text, idempotent on re-poll.
 *
 * §3.8 / single-writer: this module does NOT write _team/PROGRESS.md directly.
 * It builds the entry (pure, testable) and the live path applies it by calling
 * the M2 `progress_log` MCP tool — the server stays the sole writer of state.
 * That keeps every _team/ mutation flowing through the M2 tools, exactly as the
 * ratified M6 row requires.
 */

import { mapStatus } from "./intake.mjs";
import { dedupKey } from "./dispatcher.mjs";

/**
 * Build the progress_log arguments for a terminal external-worker status change,
 * or null if the status is not terminal/loggable (todo/in_progress stay in
 * Notion only). The dedup key is stamped into the outcome text so re-polling the
 * same row is caught by isAlreadyLogged().
 */
export function buildProgressEntry(task) {
  const mapped = mapStatus(task.status);
  if (mapped === null) return null; // not terminal yet — nothing to log
  const key = dedupKey(task);
  const ids = [task.manus_task_id && `manus:${task.manus_task_id}`, task.task_id && `task:${task.task_id}`]
    .filter(Boolean)
    .join(" ");
  const links = Array.isArray(task.external_links) && task.external_links.length
    ? ` — ${task.external_links.join(", ")}`
    : "";
  return {
    actor: task.owner_tool || "external",
    event: `manus/relay ${task.status}`,
    outcome: `${mapped}: ${task.title || "(untitled)"}${links} [${key}${ids ? " " + ids : ""}]`,
  };
}

/** Idempotency guard: is this task's dedup key already present in PROGRESS.md? */
export function isAlreadyLogged(task, progressText) {
  return typeof progressText === "string" && progressText.includes(dedupKey(task));
}

/**
 * Decide whether/what to ingest. Returns {log: boolean, entry, reason}. The
 * caller applies `entry` via the progress_log tool only when log===true.
 */
export function ingest(task, progressText = "") {
  const entry = buildProgressEntry(task);
  if (!entry) return { log: false, entry: null, reason: `status '${task.status}' is not terminal — held in Notion` };
  if (isAlreadyLogged(task, progressText)) return { log: false, entry: null, reason: "already logged — idempotent skip" };
  return { log: true, entry, reason: "new terminal status — one line to PROGRESS.md" };
}
